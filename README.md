# EasyBiz Developer Guide (WhatsApp-smooth ERP)

North star: If a Kenyan SME owner can use WhatsApp, they can run their business here. One primary action per screen, conversational language, no accounting jargon by default, progressive disclosure, offline-first.

## Stack and local environment
- Next.js (App Router, TypeScript), PWA-ready with service worker for offline queueing and caching.
- API routes or dedicated backend in the same repo, using Postgres (Docker on desktop).
- Auth and tenancy: every request carries tenant and user identity; data is isolated per tenant.
- Local run: `docker compose up -d postgres`, install deps, set `.env.local`, run `npm run dev` (or `pnpm dev`). Keep `.env.development` vs `.env.production` split.

### Local dev quickstart (Stage 0)
- Start Postgres: `docker compose up -d`
- Env: copy `.env.example` to `.env.local` and adjust.
- Install deps: `npm install`
- Prisma: `npm run db:generate` then `npm run db:migrate -- --name init` and `npm run db:seed`
- Run dev server: `npm run dev` (health check at `/api/health`)

## Development stages (sequenced)
- Stage 0: Bootstrap
  - FE: project scaffolding, design tokens, global layout, copy constants, service worker shell.
  - BE: tenant-aware Postgres schema, migration setup, seed script for demo tenant and sample items.
  - QA: health check endpoint, lint/type/test hooks in CI.
- Stage 1: Onboarding slice (max 5 screens, one question each)
  - FE: `/onboarding` flow with optimistic saves; microcopy from UX doc; skip paths never block.
  - BE: `POST /api/tenants` to bootstrap tenant + first business + default item; `PATCH /api/tenants/:id` for incremental onboarding saves.
  - QA: offline attempt queues and syncs; verify one primary button per screen.
- Stage 2: Home = Today
  - FE: `/home` summary header + scrollable activity cards; floating primary CTA `New sale / invoice`.
  - BE: `GET /api/summary/today` returns natural-language summary strings; `GET /api/feed` returns ordered activity events.
  - QA: loading skeletons; no charts by default; all text human and short.
- Stage 3: Invoicing as messaging
  - FE: `/invoice/new` sheet with contact picker, item chips, auto totals, advanced chip collapsed; success toast.
  - BE: `POST /api/invoices` (server-calculated totals), `GET /api/customers`, `GET /api/items`, `POST /api/invoices/:id/send`.
  - QA: totals match server; offline queue handles create/send; no accounting jargon shown.
- Stage 4: Payments (M-Pesa focus)
  - FE: invoice status badges (waiting/paid), action `Request M-Pesa payment`, manual `Mark as paid`.
  - BE: `POST /api/payments/mpesa/request`, `POST /api/payments/mpesa/webhook` (confirm), `PATCH /api/invoices/:id/mark-paid`.
  - QA: auto reconcile payment to invoice; feed shows "Payment received. All settled."
- Stage 5: Inventory alerts and PO
  - FE: feed cards like "Sugar is running low. Reorder?" with primary `Reorder`, secondary `Remind me later`; one-tap PO confirm.
  - BE: `GET /api/inventory/alerts`, `POST /api/purchase-orders`, stock adjustments on invoice creation.
  - QA: low-stock thresholds enforced server-side; actions idempotent.
- Stage 6: Finance Q&A (summaries only)
  - FE: `/money` tile cards answering "Did I make money this week?", "Who owes me?", "How much cash do I have?"; `Send reminder` buttons.
  - BE: `GET /api/finance/profit-week`, `GET /api/finance/receivables`, `GET /api/finance/cash`, `POST /api/reminders`.
  - QA: no ledgers exposed by default; natural-language responses.
- Stage 7: Observability, security, rollout
  - FE: error boundaries with humanized errors; event sampling for UX metrics.
  - BE/DevOps: rate limiting, RBAC, structured logs, tracing, backups, tenant isolation tests, blue/green deploy.

## Nairobi SME operational alignment (acceptance checks per stage)
- Stage 0: Bootstrap
  - Postgres seed includes demo tenant with cash + M-Pesa balances and a fast-mover item to mirror real shops.
  - Offline-capable shell verified on low network; app usable on mid-range Android viewport.
- Stage 1: Onboarding
  - Business types include common Nairobi categories (duka, hardware, salon, agrovet, eatery, boutique, service).
  - Payment setup accepts till/paybill/Pochi numbers; skip path does not block starting.
- Stage 2: Home = Today
  - Summary shows cash + M-Pesa collected today, outstanding credit, and low-stock count.
  - Activity cards reflect real events: payment, invoice sent, low stock, supplier order placed.
- Stage 3: Invoicing
  - Invoice share via WhatsApp-ready link/PDF; defaults hide accounting terms.
  - Supports quick retail vs wholesale price choice; works offline with queued send.
- Stage 4: Payments (M-Pesa)
  - STK push flow for till/paybill/Pochi; manual mark-paid for cash.
  - Reconciliation auto-updates invoice and feed with "Payment received. All settled."
- Stage 5: Inventory and suppliers
  - Low-stock alerts worded as prompts ("Sugar is running low. Reorder?") with one-tap PO.
  - PO can mark "pay cash now" or "pay later" with due date for supplier credit.
- Stage 6: Finance Q&A
  - Tiles answer: Cash on hand, In M-Pesa, Owed to you (top debtors), Owed to suppliers.
  - Credit reminders can send via WhatsApp/SMS; one-tap mark paid.
- Stage 7: Observability and controls
  - Roles (Owner, Manager, Attendant) with restricted exports/settings; audit key actions (price edit, mark-paid).
  - Tenant isolation tested; webhook signatures verified for M-Pesa; offline retries are idempotent.

## Frontend surfaces (Next.js)
- Routes: `/onboarding`, `/home`, `/invoice/new`, `/invoice/:id`, `/money`, `/inventory`, `/settings` (feature flags appear only when earned).
- Components: summary header, activity card list, contact picker, item picker with auto totals, advanced chip (tax/discount hidden), offline state badges, primary floating CTA, humanized error toasts.
- PWA: service worker caches shell and static assets; action queue (invoice create/send, payment request, reminder) retries when online; show "Queued" badge when offline.
- Copy tone: short, calm, direct (examples: "Invoice sent. Waiting for payment." "You are offline. We will send this when you are back.").

## Backend API (proposed contract, tenant-scoped)
- Auth and tenancy headers: `Authorization: Bearer <token>`, `X-Tenant-Id: <uuid>`.
- Tenant and onboarding
  - `POST /api/tenants` -> { tenantId, userId, businessName, firstItem? }
  - `PATCH /api/tenants/:id` -> partial onboarding data (business type, payment phone, etc.)
- Summary and feed
  - `GET /api/summary/today` -> { summaryText, soldToday, owed, lowStockCount }
  - `GET /api/feed?cursor=` -> [{ id, type: payment|invoice|stock|po, text, ts, meta }]
- Catalog and customers
  - `GET /api/items` -> list with price, stock, lowStockThreshold
  - `POST /api/items` -> create item (server validates defaults)
  - `GET /api/customers` / `POST /api/customers`
- Invoices and sales
  - `POST /api/invoices` -> { invoiceId, status, totals } (server computes totals)
  - `POST /api/invoices/:id/send` -> triggers delivery + feed event
  - `GET /api/invoices/:id` -> detail with status, items, payments
  - `PATCH /api/invoices/:id/mark-paid` -> manual payment
- Payments (M-Pesa)
  - `POST /api/payments/mpesa/request` -> STK push, returns requestId and status
  - `POST /api/payments/mpesa/webhook` -> receives confirmation, reconciles invoice, emits feed event
  - `GET /api/payments/:id` -> payment status
- Inventory
  - `GET /api/inventory/alerts` -> low stock entries with suggested reorder qty
  - `POST /api/purchase-orders` -> create PO from alert
  - Stock adjusts automatically on invoice creation server-side.
- Finance Q&A
  - `GET /api/finance/profit-week` -> { text, revenue, costs, net }
  - `GET /api/finance/receivables` -> { text, total, topDebtors[] }
  - `GET /api/finance/cash` -> { text, balance }
- Reminders and notifications
  - `POST /api/reminders` -> send reminder (SMS/WhatsApp/email integration later)
  - All endpoints should return concise human text alongside data for UI reuse.

## DevOps and quality
- Environments: dev (local), staging (prod-like), production. Separate Postgres databases per env.
- Secrets: stored via env files locally; use Vault/KMS for staging/prod; never commit secrets.
- Migrations: managed via chosen tool (Prisma/Drizzle/Knex). Commands: `npm run db:migrate`, `npm run db:generate` (as applicable). Apply migrations before deploy.
- CI pipeline: install -> lint -> typecheck -> unit/integration tests -> Next.js build -> db migration dry-run -> docker image build -> e2e (staging). Block on any failure.
- Observability: structured logs with request ids and tenant ids, error reporting (Sentry-like), metrics (latency, error rate, tenant isolation checks), audit trails for sensitive actions.
- Security: HTTPS everywhere, HSTS, RBAC, rate limiting, input validation, idempotency keys for mutating endpoints, webhook signature verification for M-Pesa, per-tenant row level security or scoped queries.
- Release: versioned container images, blue/green or canary deploy, health checks, smoke tests post-deploy, rollback plan. Nightly backups and restore drills for Postgres.
- Performance: bundle size budgets, code-splitting, API pagination and limits, caching of static lookups, indexes on invoice/payment/customer tables.
- Offline: enqueue mutations client-side with persisted queue; server endpoints must be idempotent and tolerate replay.

## Microcopy quick reference
- Success: "Invoice sent. Waiting for payment." / "Payment received. All settled." / "Order placed. We will update stock when it arrives."
- Alerts: "Sugar is running low. Reorder?" / "You are offline. We will send this when you are back."
- Errors: "Payment did not go through. Try again or mark as paid." / "We need the item name to continue."

## Developer handoff (mobile-first, then desktop)
- Principles: one primary action per screen; conversational copy; defaults fit 80% of Nairobi SMEs; offline-first with quiet sync; progressive disclosure for advanced fields.
- Breakpoints: design for 360–414px width first; stack header + cards in a single column; floating primary CTA bottom-right. Desktop (≥1024px) uses max 2 columns (summary + feed); avoid dense dashboards.
- Navigation: bottom nav or top tabs on mobile kept to 4 items max (`Home`, `Sell`, `Money`, `More`). Desktop may use left rail; keep `Home` as default landing.
- Core surfaces:
  - Home: natural-language summary, scrollable activity cards, floating `New sale / invoice`. No charts by default.
  - Onboarding (≤5 screens): single input per screen; skip always available; M-Pesa input accepts till/paybill/Pochi.
  - Invoice: contact picker, item chips with auto totals, collapsed advanced chip; share via WhatsApp/PDF; offline queued.
  - Payments: STK push trigger + status; manual mark-paid; success updates feed.
  - Inventory: low-stock cards with `Reorder` / `Remind me later`; one-tap PO confirmation.
  - Money tiles: answers to profit/week, who owes you, cash on hand/M-Pesa/suppliers; `Send reminder` actions.
- States: loading skeletons; offline badge ("Queued"); pending vs sent; errors humanized. All mutations idempotent and replay-safe.
- Data contracts: use tenant-scoped headers; APIs return both data and short text for UI; invoices computed server-side; low-stock thresholds server-owned.
- Sharing: WhatsApp share links/PDFs for invoices/receipts and POs; reminders via SMS/WhatsApp when available.
- Roles: Owner/Manager/Attendant; restrict exports/settings for non-owners; audit price edits, mark-paid, refunds.
- Desktop enhancements only: wider feed view, multi-panel for invoice detail; never introduce extra steps vs mobile.
