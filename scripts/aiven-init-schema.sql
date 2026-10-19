-- Inicialización del esquema de Tienda de Abarrotes en PostgreSQL/Aiven.
-- Basado en lib/db/src/schema/grocery.ts.
-- Seguro para reejecutar cuando las tablas no existen; no elimina datos.

BEGIN;

CREATE TABLE IF NOT EXISTS public.grocery_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  supplier TEXT NOT NULL DEFAULT '',
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grocery_products_price_nonnegative CHECK (price >= 0),
  CONSTRAINT grocery_products_quantity_nonnegative CHECK (quantity >= 0),
  CONSTRAINT grocery_products_threshold_nonnegative CHECK (low_stock_threshold >= 0)
);

CREATE TABLE IF NOT EXISTS public.grocery_sales (
  id SERIAL PRIMARY KEY,
  total NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grocery_sales_total_nonnegative CHECK (total >= 0)
);

CREATE TABLE IF NOT EXISTS public.grocery_sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal NUMERIC(14, 2) NOT NULL,
  CONSTRAINT grocery_sale_items_sale_id_fk
    FOREIGN KEY (sale_id) REFERENCES public.grocery_sales(id) ON DELETE CASCADE,
  CONSTRAINT grocery_sale_items_product_id_fk
    FOREIGN KEY (product_id) REFERENCES public.grocery_products(id) ON DELETE RESTRICT,
  CONSTRAINT grocery_sale_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT grocery_sale_items_unit_price_nonnegative CHECK (unit_price >= 0),
  CONSTRAINT grocery_sale_items_subtotal_nonnegative CHECK (subtotal >= 0)
);

COMMIT;
