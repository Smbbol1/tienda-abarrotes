import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  CreateProductBody,
  CreateProductResponse,
  DeleteProductParams,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { db, productsTable, saleItemsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(asc(productsTable.name));
  res.json(ListProductsResponse.parse(products));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      ...parsed.data,
      lowStockThreshold: parsed.data.lowStockThreshold ?? 5,
    })
    .returning();

  res.status(201).json(CreateProductResponse.parse(product));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({
      error: parsed.success ? "No hay cambios para guardar." : parsed.error.message,
    });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Producto no encontrado." });
    return;
  }

  res.json(UpdateProductResponse.parse(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "Producto no encontrado." });
    return;
  }

  const [associatedSale] = await db
    .select({ id: saleItemsTable.id })
    .from(saleItemsTable)
    .where(eq(saleItemsTable.productId, product.id))
    .limit(1);

  if (associatedSale) {
    res.status(409).json({
      error: "No se puede eliminar un producto que aparece en ventas registradas.",
    });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, product.id));
  res.status(204).send();
});

export default router;
