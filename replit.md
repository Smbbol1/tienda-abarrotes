# Tienda de Abarrotes

Aplicación en español para gestionar inventario, registrar ventas, revisar reportes y respaldar o restaurar los datos de una tienda de abarrotes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/tienda-abarrotes run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required environment: `DATABASE_URL` for PostgreSQL

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/tienda-abarrotes/src/App.tsx` — Spanish-language web interface and app routes
- `artifacts/tienda-abarrotes/src/index.css` — visual theme and responsive styles
- `artifacts/api-server/src/routes/` — inventory, sales, reports, and backup API
- `lib/db/src/schema/grocery.ts` — PostgreSQL schema for products, sales, and sale items
- `lib/api-spec/openapi.yaml` — source of truth for the API contract

## Architecture decisions

- Use the shared Express API and PostgreSQL database; the app does not keep its primary data in browser storage.
- Sales save product name and price snapshots so historical receipts remain stable if product details later change.
- Backup files are versioned JSON containing products, sales, and sale items. Restore validates the file and replaces the current dataset in one database transaction.
- Display currency and date formatting use Bolivian Spanish conventions (`es-BO`, `BOB`).

## Product

- Inventory: add, edit, search, filter, and remove products with prices, quantities, suppliers, and low-stock thresholds.
- Sales: assemble a product cart, calculate totals, save sales, and deduct stock atomically.
- Reports: show sales totals, daily activity, and low-stock alerts.
- Configuration: download the full JSON backup or restore one after explicit confirmation.

## User preferences

- The complete user interface must be in Spanish.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, rerun code generation before using updated API types.
- Restoring a backup intentionally replaces current products and sales; the UI warns and requires confirmation first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
