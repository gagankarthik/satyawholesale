# Satya Wholesale

B2B ordering platform for **Satya Wholesalers** — a licensed cash-and-carry wholesale
distributor in Cincinnati, OH supplying convenience stores with tobacco, vape, grocery,
candy, and HBA on a single account.

The app is one Next.js codebase serving three surfaces:

| Surface | Route | Audience | Notes |
|---|---|---|---|
| **Marketing site** | `/` | Public | Company-only landing (no products/prices — a legal requirement for age-restricted goods). Indexable. |
| **Order portal** | `/portal` | Approved buyers | Catalog, cart, orders, payments, addresses. Gated + `noindex`. |
| **Warehouse console** | `/admin` | Staff | Full WMS: orders, products, inventory valuation, purchase orders, accounts, users, reports. Gated + `noindex`. |

Prospective customers apply at `/apply`; the warehouse approves them, Cognito emails an
invite, and the buyer completes a short onboarding wizard before entering the portal.

## Tech stack

- **Next.js 16** (App Router, SSR/`WEB_COMPUTE`) · **React 19** · **TypeScript** (strict; `tsc --noEmit` is the gate)
- **AWS**: Cognito (auth + groups), DynamoDB (single-table), S3 (media + private documents), deployed on **Amplify SSR**
- **UI**: custom design system (Tailwind v4 tokens + `src/components/ui` kit), Radix primitives, Recharts, lucide-react, sonner
- **Extras**: `tesseract.js` (invoice OCR), `@zxing` (barcode scanning), `aws-jwt-verify` (server-side token verification)

> ⚠️ This repo pins a **modified build of Next.js** with breaking changes vs. the public release.
> Read the guides in `node_modules/next/dist/docs/` before touching framework APIs (see `AGENTS.md`).

## Architecture

```
src/
  app/                 App Router routes
    page.tsx           public landing (+ JSON-LD, root metadata in layout.tsx)
    apply/             public trade-account application
    auth/ onboarding/  sign-in / sign-up / buyer onboarding (noindex)
    portal/            buyer order portal (noindex, gated)
    admin/             warehouse console (noindex, gated)
    api/               route handlers (see below)
    sitemap.ts robots.ts   SEO
  components/          Brand, AgeGate, Icons, and the ui/ kit
  features/admin/      admin feature modules (orders, inventory, sales, catalog…)
  lib/                 client data hooks (store.ts, wms.ts), api.ts, auth.ts, collection.ts
  server/              server-only: env.ts, aws.ts, auth.ts, db.ts, s3.ts, entities.ts, guard.ts
scripts/               provision-aws.mjs, seed-aws.mjs, print-iam-policy.mjs
```

**Backend seams** (`src/server/`)

- `env.ts` — strict env getters (static `process.env.X` reads only; Amplify SSR does not expose dynamic lookups).
- `aws.ts` — shared region + credentials for every SDK client (static `NEXT_AWS_*` keys locally, IAM role in prod).
- `auth.ts` — verifies the Cognito ID token (`aws-jwt-verify`); roles from `cognito:groups`, tenant from `custom:store`.
- `db.ts` — DynamoDB single table (`PK=T#<type>`, `SK=<id>`); read-merge-write patches, server-side stock decrement.
- `s3.ts` — presigned upload/download; `public/*` served directly, `private/*` (documents) only via admin `/api/file`.

**API routes** (`src/app/api/`): `data/[entity]` (scoped CRUD), `upload` / `file` (S3), `apply`,
`accounts/invite`, `onboarding`, `users` (Cognito admin actions). Every route authenticates and
authorizes server-side; buyers are store-scoped, money/stock are computed on the server.

## Getting started

**Prerequisites**: Node 20+, an AWS account, and either `aws login` (SSO) or an IAM user's keys.

```bash
npm install

# 1. Provision AWS (DynamoDB table + S3 bucket + Cognito pool/client/groups + first admin).
#    Idempotent; writes resource IDs into .env.local.
npm run provision -- --admin-email you@company.com

# 2. Seed baseline catalog data (products, categories, suppliers, locations, settings).
npm run seed

# 3. Run it.
npm run dev            # http://localhost:3000
```

Cognito emails the first admin a temporary password; first sign-in forces a reset.

### Environment

`.env.local` is written by the provisioner — see `.env.example` for the full list. Key values:

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_AWS_REGION` | Region for the browser SDK and server data plane |
| `NEXT_PUBLIC_SATYA_TABLE` | DynamoDB table name |
| `SATYA_BUCKET` | S3 media bucket |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` / `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito pool + app client |
| `NEXT_PUBLIC_MEDIA_BASE` | Public S3 base URL for product/promo images |
| `NEXT_AWS_ACCESS_KEY_ID` / `NEXT_AWS_SECRET_ACCESS_KEY` | Local-dev credentials (blank in prod — use the IAM role) |
| `NEXT_PUBLIC_SKIP_AGEGATE` | Set truthy to bypass the 21+ age gate (dev/testing only) |

Never commit `.env.local`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` — the correctness gate |
| `npm run provision` | Create/reconcile AWS resources → `.env.local` |
| `npm run seed` | Seed baseline catalog data |
| `npm run iam-policy` | Print the exact least-privilege runtime IAM policy (with real ARNs) |

## Deployment

Deployed on **AWS Amplify (SSR / `WEB_COMPUTE`)**. Pushing to `master` triggers Amplify's Git
build (`amplify.yml`, Node 20, output `.next`). CI (`.github/workflows/ci.yml`) runs typecheck +
build on every PR/push.

**Runtime IAM** — the Amplify compute role needs DynamoDB (`Get/Put/Update/Delete/Query`), S3
(`Get/PutObject`), and Cognito admin actions (`ListUsersInGroup`, `Admin*`). Run
`npm run iam-policy` to emit the exact policy; the canonical version is committed at
`scripts/amplify-compute-policy.json`. Set the same env vars from `.env.local` in the Amplify
console (App settings → Environment variables).

## SEO & production notes

- Root OG/Twitter/keywords/canonical metadata in `src/app/layout.tsx`; `LocalBusiness` JSON-LD on the landing.
- `robots.ts` disallows `/admin` and `/portal`; every private route tree sets `robots: { index: false }`.
- `sitemap.ts` lists the public pages (`/`, `/apply`, `/terms`, `/privacy`, `/returns`).
- Route-level `loading.tsx` / `error.tsx` under `/admin` and `/portal`, plus root `not-found` / `error` / `global-error`.
- Security headers + CSP configured in `next.config.ts`; all product imagery goes through `next/image`.
- The public landing carries **no volatile claims or prices** — an age-restricted-goods legal constraint.

## License

Private and proprietary. © Satya Wholesalers.
