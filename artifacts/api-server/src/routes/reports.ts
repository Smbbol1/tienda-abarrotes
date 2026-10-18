import { Router, type IRouter } from "express";
import { asc, desc, inArray, lte } from "drizzle-orm";
import {
  GetDashboardResponse,
  GetReportsResponse,
} from "@workspace/api-zod";
import {
  db,
  productsTable,
  saleItemsTable,
  salesTable,
  type Sale,
} from "@workspace/db";

const router: IRouter = Router();
const businessTimeZone = "America/La_Paz";

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: values.year ?? "1970",
    month: values.month ?? "01",
    day: values.day ?? "01",
  };
}

function dateKey(date: Date) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function keyDaysBefore(today: string, daysBefore: number) {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! - daysBefore));
  return date.toISOString().slice(0, 10);
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

async function recentSalesWithItems(sales: Sale[]) {
  if (sales.length === 0) return [];
  const allItems = await db
    .select()
    .from(saleItemsTable)
    .where(inArray(saleItemsTable.saleId, sales.map((sale) => sale.id)));
  const bySale = new Map<number, typeof allItems>();
  for (const item of allItems) {
    const values = bySale.get(item.saleId) ?? [];
    values.push(item);
    bySale.set(item.saleId, values);
  }
  return sales.map((sale) => ({
    ...sale,
    items: bySale.get(sale.id) ?? [],
  }));
}

async function loadSummary() {
  const [products, sales] = await Promise.all([
    db.select().from(productsTable).orderBy(asc(productsTable.name)),
    db.select().from(salesTable).orderBy(desc(salesTable.createdAt)),
  ]);
  const today = dateKey(new Date());
  const monthPrefix = today.slice(0, 7);
  const lowStockProducts = products.filter(
    (product) => product.quantity <= product.lowStockThreshold,
  );

  return {
    products,
    sales,
    today,
    monthPrefix,
    lowStockProducts,
  };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const summary = await loadSummary();
  const salesToday = summary.sales
    .filter((sale) => dateKey(sale.createdAt) === summary.today)
    .reduce((sum, sale) => sum + sale.total, 0);
  const salesThisMonth = summary.sales
    .filter((sale) => dateKey(sale.createdAt).startsWith(summary.monthPrefix))
    .reduce((sum, sale) => sum + sale.total, 0);
  const recentRecords = summary.sales.slice(0, 5);

  const recentSales = await recentSalesWithItems(recentRecords);
  const [lowStockProducts] = await Promise.all([
    db
      .select()
      .from(productsTable)
      .where(lte(productsTable.quantity, productsTable.lowStockThreshold))
      .orderBy(asc(productsTable.quantity))
      .limit(8),
  ]);

  res.json(
    GetDashboardResponse.parse({
      salesToday: roundMoney(salesToday),
      salesThisMonth: roundMoney(salesThisMonth),
      productCount: summary.products.length,
      lowStockCount: summary.lowStockProducts.length,
      recentSales,
      lowStockProducts,
    }),
  );
});

router.get("/reports", async (_req, res): Promise<void> => {
  const [products, sales] = await Promise.all([
    db.select().from(productsTable),
    db.select().from(salesTable).orderBy(asc(salesTable.createdAt)),
  ]);
  const today = dateKey(new Date());
  const firstDay = keyDaysBefore(today, 6);
  const daily = new Map<string, { total: number; count: number }>();

  for (let daysBefore = 6; daysBefore >= 0; daysBefore -= 1) {
    daily.set(keyDaysBefore(today, daysBefore), { total: 0, count: 0 });
  }
  for (const sale of sales) {
    const key = dateKey(sale.createdAt);
    const day = daily.get(key);
    if (day) {
      day.total = roundMoney(day.total + sale.total);
      day.count += 1;
    }
  }

  const totalSales = roundMoney(sales.reduce((sum, sale) => sum + sale.total, 0));
  const lowStockProducts = products
    .filter((product) => product.quantity <= product.lowStockThreshold)
    .sort((a, b) => a.quantity - b.quantity);

  res.json(
    GetReportsResponse.parse({
      totalSales,
      salesCount: sales.length,
      averageSale: sales.length > 0 ? roundMoney(totalSales / sales.length) : 0,
      dailySales: [...daily].map(([date, values]) => ({
        date,
        total: values.total,
        count: values.count,
      })),
      lowStockProducts,
    }),
  );
});

export default router;
