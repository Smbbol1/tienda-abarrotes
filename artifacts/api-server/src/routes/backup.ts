import { Router, type IRouter } from "express";
import { asc, sql } from "drizzle-orm";
import {
  DownloadBackupResponse,
  RestoreBackupBody,
  RestoreBackupResponse,
} from "@workspace/api-zod";
import {
  db,
  productsTable,
  saleItemsTable,
  salesTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/backup", async (_req, res): Promise<void> => {
  const [products, sales, items] = await Promise.all([
    db.select().from(productsTable).orderBy(asc(productsTable.id)),
    db.select().from(salesTable).orderBy(asc(salesTable.id)),
    db.select().from(saleItemsTable).orderBy(asc(saleItemsTable.id)),
  ]);
  const itemsBySale = new Map<number, typeof items>();
  for (const item of items) {
    const current = itemsBySale.get(item.saleId) ?? [];
    current.push(item);
    itemsBySale.set(item.saleId, current);
  }

  res.json(
    DownloadBackupResponse.parse({
      format: "tienda-abarrotes-backup",
      version: 1,
      createdAt: new Date(),
      products,
      sales: sales.map((sale) => ({
        ...sale,
        items: itemsBySale.get(sale.id) ?? [],
      })),
    }),
  );
});

function isSemanticallyValidBackup(backup: ReturnType<typeof RestoreBackupBody.parse>) {
  const productIds = new Set<number>();
  const saleIds = new Set<number>();
  const itemIds = new Set<number>();

  for (const product of backup.products) {
    if (productIds.has(product.id)) return false;
    productIds.add(product.id);
  }
  for (const sale of backup.sales) {
    if (saleIds.has(sale.id) || sale.items.length === 0) return false;
    saleIds.add(sale.id);
    let calculatedTotalCents = 0;
    for (const item of sale.items) {
      if (
        itemIds.has(item.id) ||
        !productIds.has(item.productId) ||
        Math.abs(item.subtotal - item.unitPrice * item.quantity) >= 0.011
      ) {
        return false;
      }
      itemIds.add(item.id);
      calculatedTotalCents += Math.round(item.subtotal * 100);
    }
    if (calculatedTotalCents !== Math.round(sale.total * 100)) return false;
  }
  return true;
}

router.post("/backup", async (req, res): Promise<void> => {
  const parsed = RestoreBackupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `Respaldo inválido: ${parsed.error.message}` });
    return;
  }
  if (!isSemanticallyValidBackup(parsed.data)) {
    res.status(400).json({
      error:
        "El respaldo contiene identificadores repetidos, productos inexistentes o totales inconsistentes.",
    });
    return;
  }

  const { products, sales } = parsed.data;
  const allItems = sales.flatMap((sale) =>
    sale.items.map((item) => ({ ...item, saleId: sale.id })),
  );

  await db.transaction(async (tx) => {
    await tx.delete(saleItemsTable);
    await tx.delete(salesTable);
    await tx.delete(productsTable);

    if (products.length > 0) {
      await tx.insert(productsTable).values(
        products.map((product) => ({
          ...product,
          createdAt: new Date(product.createdAt),
          updatedAt: new Date(product.updatedAt),
        })),
      );
    }
    if (sales.length > 0) {
      await tx.insert(salesTable).values(
        sales.map((sale) => ({
          id: sale.id,
          total: sale.total,
          createdAt: new Date(sale.createdAt),
        })),
      );
    }
    if (allItems.length > 0) {
      await tx.insert(saleItemsTable).values(allItems);
    }

    await tx.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('grocery_products', 'id'),
        COALESCE((SELECT MAX(id) FROM grocery_products), 1),
        EXISTS (SELECT 1 FROM grocery_products)
      )
    `);
    await tx.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('grocery_sales', 'id'),
        COALESCE((SELECT MAX(id) FROM grocery_sales), 1),
        EXISTS (SELECT 1 FROM grocery_sales)
      )
    `);
    await tx.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('grocery_sale_items', 'id'),
        COALESCE((SELECT MAX(id) FROM grocery_sale_items), 1),
        EXISTS (SELECT 1 FROM grocery_sale_items)
      )
    `);
  });

  res.json(
    RestoreBackupResponse.parse({
      productsRestored: products.length,
      salesRestored: sales.length,
    }),
  );
});

export default router;
