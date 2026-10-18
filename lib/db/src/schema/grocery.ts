import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable(
  "grocery_products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    quantity: integer("quantity").notNull().default(0),
    supplier: text("supplier").notNull().default(""),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("grocery_products_price_nonnegative", sql`${table.price} >= 0`),
    check("grocery_products_quantity_nonnegative", sql`${table.quantity} >= 0`),
    check(
      "grocery_products_threshold_nonnegative",
      sql`${table.lowStockThreshold} >= 0`,
    ),
  ],
);

export const salesTable = pgTable(
  "grocery_sales",
  {
    id: serial("id").primaryKey(),
    total: numeric("total", { precision: 14, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("grocery_sales_total_nonnegative", sql`${table.total} >= 0`),
  ],
);

export const saleItemsTable = pgTable(
  "grocery_sale_items",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id").notNull(),
    productId: integer("product_id").notNull(),
    productName: text("product_name").notNull(),
    unitPrice: numeric("unit_price", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: numeric("subtotal", {
      precision: 14,
      scale: 2,
      mode: "number",
    }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.saleId],
      foreignColumns: [salesTable.id],
      name: "grocery_sale_items_sale_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [productsTable.id],
      name: "grocery_sale_items_product_id_fk",
    }).onDelete("restrict"),
    check("grocery_sale_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "grocery_sale_items_unit_price_nonnegative",
      sql`${table.unitPrice} >= 0`,
    ),
    check(
      "grocery_sale_items_subtotal_nonnegative",
      sql`${table.subtotal} >= 0`,
    ),
  ],
);

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

export const insertSaleSchema = createInsertSchema(salesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;

export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({
  id: true,
});
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItemsTable.$inferSelect;
