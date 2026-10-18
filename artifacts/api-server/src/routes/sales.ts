import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import {
  CreateSaleBody,
  CreateSaleResponse,
  ListSalesResponse,
} from "@workspace/api-zod";
import {
  db,
  productsTable,
  saleItemsTable,
  salesTable,
  type Sale,
} from "@workspace/db";

const router: IRouter = Router();

async function salesWithItems(records: Sale[]) {
  if (records.length === 0) return [];

  const items = await db
    .select()
    .from(saleItemsTable)
    .where(inArray(saleItemsTable.saleId, records.map((sale) => sale.id)));
  const grouped = new Map<number, typeof items>();
  for (const item of items) {
    const current = grouped.get(item.saleId) ?? [];
    current.push(item);
    grouped.set(item.saleId, current);
  }

  return records.map((sale) => ({
    ...sale,
    items: grouped.get(sale.id) ?? [],
  }));
}

class SaleValidationError extends Error {}

router.get("/sales", async (_req, res): Promise<void> => {
  const sales = await db
    .select()
    .from(salesTable)
    .orderBy(desc(salesTable.createdAt))
    .limit(50);
  res.json(ListSalesResponse.parse(await salesWithItems(sales)));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const requested = new Map<number, number>();
  for (const item of parsed.data.items) {
    requested.set(
      item.productId,
      (requested.get(item.productId) ?? 0) + item.quantity,
    );
  }

  try {
    const sale = await db.transaction(async (tx) => {
      const productIds = [...requested.keys()];
      const products = await tx
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, productIds))
        .for("update");
      const productsById = new Map(products.map((product) => [product.id, product]));

      for (const [productId, quantity] of requested) {
        const product = productsById.get(productId);
        if (!product) {
          throw new SaleValidationError("Uno de los productos ya no existe.");
        }
        if (product.quantity < quantity) {
          throw new SaleValidationError(
            `Existencias insuficientes para ${product.name}. Disponible: ${product.quantity}.`,
          );
        }
      }

      const lineItems = [...requested].map(([productId, quantity]) => {
        const product = productsById.get(productId)!;
        const unitPriceCents = Math.round(product.price * 100);
        return {
          productId,
          productName: product.name,
          unitPrice: unitPriceCents / 100,
          quantity,
          subtotal: (unitPriceCents * quantity) / 100,
        };
      });
      const totalCents = lineItems.reduce(
        (sum, item) => sum + Math.round(item.subtotal * 100),
        0,
      );
      const [createdSale] = await tx
        .insert(salesTable)
        .values({ total: totalCents / 100 })
        .returning();

      const savedItems = await tx
        .insert(saleItemsTable)
        .values(
          lineItems.map((item) => ({
            ...item,
            saleId: createdSale.id,
          })),
        )
        .returning();

      for (const [productId, quantity] of requested) {
        const product = productsById.get(productId)!;
        await tx
          .update(productsTable)
          .set({
            quantity: product.quantity - quantity,
            updatedAt: new Date(),
          })
          .where(eq(productsTable.id, productId));
      }

      return { ...createdSale, items: savedItems };
    });

    res.status(201).json(CreateSaleResponse.parse(sale));
  } catch (error) {
    if (error instanceof SaleValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

export default router;
