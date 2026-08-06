#!/usr/bin/env bash
# =============================================================================
#  setup-la-rotunda.sh — bootstrap the "La Rotunda" restaurant e-commerce app
#
#  Replicates the Ali Baba platform's infrastructure: Next.js 16.2 App Router
#  (RSC-first), React 19.2, Prisma 7 + @prisma/adapter-pg over PostgreSQL,
#  Tailwind CSS v4, Better Auth 1.6, Zustand 5 (cart only), plus the .claude/
#  AI-governance tree and the typecheck/lint/test verification gate.
#
#  USAGE:  run inside an EMPTY project directory
#     bash setup-la-rotunda.sh
#
#  ENV FLAGS:
#     WITH_UI_EXTRAS=0   skip the supporting UI tier (sonner, framer-motion, …)
#     SKIP_INSTALL=1     scaffold files only, no npm install
# =============================================================================

set -euo pipefail

APP_NAME="la-rotunda"
WITH_UI_EXTRAS="${WITH_UI_EXTRAS:-1}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"

say()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$1"; }

# -----------------------------------------------------------------------------
# 0. Preflight — empty directory + a Node runtime new enough for Next 16
# -----------------------------------------------------------------------------
say "Preflight checks"

if [ -f package.json ]; then
  warn "package.json already exists here. Aborting so nothing is overwritten."
  exit 1
fi

command -v node >/dev/null 2>&1 || { warn "node not found on PATH"; exit 1; }
command -v npm  >/dev/null 2>&1 || { warn "npm not found on PATH"; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  warn "Node >= 20.9 is required by Next.js 16 (found $(node -v))."
  exit 1
fi

echo "  node $(node -v) · npm v$(npm -v)"

# -----------------------------------------------------------------------------
# 1. Initialize the Node project
#    verify.sh reads `git status --porcelain`, so the repo must exist first.
# -----------------------------------------------------------------------------
say "Initializing Node project + git repository"

npm init -y >/dev/null
npm pkg set name="$APP_NAME" >/dev/null
npm pkg set version="0.1.0" >/dev/null
npm pkg set private=true --json >/dev/null
npm pkg set description="La Rotunda — restaurant e-commerce platform" >/dev/null
npm pkg delete main keywords author license >/dev/null

if [ ! -d .git ]; then
  git init -q
fi

# -----------------------------------------------------------------------------
# 2. Directory topology
#    (shop) = public storefront route group · admin = staff console.
#    Route groups are parenthesised so the segment never appears in the URL:
#    src/app/(shop)/page.tsx serves "/", not "/(shop)".
# -----------------------------------------------------------------------------
say "Scaffolding the App Router topology"

# --- Storefront route group -------------------------------------------------
mkdir -p "src/app/(shop)/menu"
mkdir -p "src/app/(shop)/category/[slug]"
mkdir -p "src/app/(shop)/product/[slug]"
mkdir -p "src/app/(shop)/cart"
mkdir -p "src/app/(shop)/checkout"
mkdir -p "src/app/(shop)/my-orders"
mkdir -p "src/app/(shop)/login"
mkdir -p "src/app/(shop)/signup"

# --- Staff console ----------------------------------------------------------
mkdir -p src/app/admin/orders
mkdir -p src/app/admin/products
mkdir -p src/app/admin/menu
mkdir -p src/app/admin/branches
mkdir -p src/app/admin/users
mkdir -p src/app/admin/settings

# --- The only two route handlers the platform allows (vendored pass-throughs).
#     Every WRITE is a Server Action; there is no REST/GraphQL data API.
mkdir -p "src/app/api/auth/[...all]"
mkdir -p src/app/api/uploadthing

say "Creating infrastructure directories"

mkdir -p src/lib/actions        # "use server" write actions
mkdir -p src/lib/validators     # shared client+server Zod schemas (barrel index.ts)
mkdir -p src/components/admin   # staff-console client islands
mkdir -p src/components/shop    # storefront client islands
mkdir -p src/components/ui      # primitives
mkdir -p src/generated          # Prisma client output (checked in)
mkdir -p prisma/migrations
mkdir -p docs

# Keep otherwise-empty scaffolding directories in git.
for d in \
  "src/app/(shop)/menu" "src/app/(shop)/category/[slug]" "src/app/(shop)/product/[slug]" \
  "src/app/(shop)/cart" "src/app/(shop)/checkout" "src/app/(shop)/my-orders" \
  "src/app/(shop)/login" "src/app/(shop)/signup" \
  src/app/admin/orders src/app/admin/products src/app/admin/menu \
  src/app/admin/branches src/app/admin/users src/app/admin/settings \
  "src/app/api/auth/[...all]" src/app/api/uploadthing \
  src/lib/actions src/components/admin src/components/shop src/components/ui \
  prisma/migrations docs
do
  touch "$d/.gitkeep"
done

# -----------------------------------------------------------------------------
# 3. Install the platform stack (exact, non-substitutable versions)
# -----------------------------------------------------------------------------
if [ "$SKIP_INSTALL" = "1" ]; then
  warn "SKIP_INSTALL=1 — skipping npm install"
else
  say "Installing the core stack (Next 16.2 · React 19.2 · Prisma 7 · Better Auth 1.6 · Zustand 5)"

  npm install \
    next@^16.2.9 \
    react@^19.2.7 \
    react-dom@^19.2.7 \
    @prisma/client@^7.8.0 \
    @prisma/adapter-pg@^7.8.0 \
    pg@^8.21.0 \
    better-auth@^1.6.16 \
    zustand@^5.0.14 \
    zod@^4.4.3

  say "Installing toolchain (TypeScript · Tailwind v4 · ESLint · Vitest · Prisma CLI)"

  npm install -D \
    typescript@^5 \
    @types/node@^20 \
    @types/react@^19 \
    @types/react-dom@^19 \
    prisma@^7.8.0 \
    dotenv@^17 \
    tailwindcss@^4.3.0 \
    @tailwindcss/postcss@^4 \
    eslint@^9 \
    eslint-config-next@16.2.9 \
    vitest@^4.1.10 \
    @vitest/coverage-v8@^4.1.10 \
    jsdom@^29.1.1 \
    vitest-mock-extended@^4.0.0

  if [ "$WITH_UI_EXTRAS" = "1" ]; then
    # Supporting tier from the charter: toasts, motion, charts, carousel,
    # uploads, class utilities. Set WITH_UI_EXTRAS=0 to trim.
    say "Installing the supporting UI tier (sonner · framer-motion · Recharts · Embla · UploadThing)"

    npm install \
      sonner@^2.0.7 \
      framer-motion@^12.40.0 \
      recharts@^3.8.1 \
      embla-carousel-react@^8.6.0 \
      lucide-react@^1.18.0 \
      clsx@^2.1.1 \
      tailwind-merge@^3.6.0 \
      class-variance-authority@^0.7.1 \
      uploadthing@^7.7.4 \
      @uploadthing/react@^7.3.3
  fi
fi

# -----------------------------------------------------------------------------
# 4. Root configuration files
# -----------------------------------------------------------------------------
say "Writing root configuration"

cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
JSON

cat > next.config.ts <<'TS'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // UploadThing CDN hosts — `file.ufsUrl` (v7) resolves to *.ufs.sh.
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
    ],
  },
};

export default nextConfig;
TS

# Tailwind v4 has no tailwind.config.js — it is driven entirely by the
# PostCSS plugin plus `@import "tailwindcss"` and @theme tokens in CSS.
cat > postcss.config.mjs <<'MJS'
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
MJS

cat > eslint.config.mjs <<'MJS'
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // Prisma's generated client is vendored, not authored.
    "src/generated/**",
  ]),
  {
    // Prisma mocks in specs need `any`; app code stays strict.
    files: ["**/__tests__/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
]);

export default eslintConfig;
MJS

cat > vitest.config.ts <<'TS'
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Pure/server-action specs run in `node`; a Zustand store spec opts into a DOM
// with a per-file `// @vitest-environment jsdom` pragma. The `@/*` alias mirrors
// tsconfig so imports resolve identically under test.
export default defineConfig({
  test: {
    environment: "node",
    // Forks avoid the intermittent "Vitest failed to find the runner" race that
    // worker threads hit on Windows single-file runs.
    pool: "forks",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      // Scope to the money path first so the number stays meaningful.
      include: ["src/lib/pricing.ts"],
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
TS

cat > .gitignore <<'GIT'
node_modules/
.next/
out/
build/
coverage/
*.tsbuildinfo
next-env.d.ts
.env
.env*.local
.DS_Store
GIT

cat > .env.example <<'ENV'
# Pooled Neon connection — used by the app RUNTIME via the pg driver adapter.
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
# Direct (non-pooled) connection — used by the Prisma CLI for migrate/studio.
DIRECT_URL="postgresql://user:password@host/db?sslmode=require"

BETTER_AUTH_SECRET="generate-with: openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

UPLOADTHING_TOKEN=""
ENV

# A local .env so `prisma generate` and `npm run dev` have something to read.
[ -f .env ] || cp .env.example .env

# -----------------------------------------------------------------------------
# 5. Prisma — CLI config, schema, and the runtime client singleton
#    Prisma 7 splits these: prisma.config.ts owns the CLI connection;
#    src/lib/prisma.ts builds the runtime client via the driver adapter.
# -----------------------------------------------------------------------------
say "Scaffolding the Prisma layer"

cat > prisma.config.ts <<'TS'
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-only connection (migrate deploy / studio / db push). Prefer the DIRECT
    // (non-pooled) URL so migrations run over a real session connection — the
    // pooler can't hold the advisory lock or run the DDL `migrate deploy` needs.
    // The app RUNTIME stays on the pooled DATABASE_URL via the pg driver adapter
    // in src/lib/prisma.ts. That split is intentional.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
TS

cat > prisma/schema.prisma <<'PRISMA'
// La Rotunda — data model.
//
// PostgreSQL, relational. Model the menu as Product -> ProductVariant
// (Small / Medium / Large pizza, 2pc / 4pc / 8pc chicken):
//   · Prices live ONLY on ProductVariant — Product has no price column.
//   · Every currency column is Decimal (a VAT *rate* is Float).
//   · OrderItem snapshots productName / variantName / unitPrice at purchase,
//     so order history never joins back to the live catalog.
//   · ProductVariant -> OrderItem is onDelete: Restrict — an ever-ordered
//     variant is archived (isAvailable: false), never hard-deleted.

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// TODO(la-rotunda): add models — User, Session, Account, Verification (Better
// Auth), Category, Product, ProductVariant, Promotion, Order, OrderItem,
// CartItem, Branch, StoreSettings. Then: npx prisma migrate dev --name init
PRISMA

cat > src/lib/prisma.ts <<'TS'
import dns from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prefer IPv4 when resolving the database host. Neon advertises both AAAA and A
// records; on networks with broken IPv6 routing the connection hangs until
// ETIMEDOUT. IPv4-first removes that failure mode, IPv6 still works as fallback.
dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Memoized on globalThis outside production so dev hot-reload doesn't exhaust
// the connection pool. Never `new PrismaClient()` anywhere else.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
TS

# -----------------------------------------------------------------------------
# 6. Auth shells + the edge proxy
#    Sessions are read through exactly one door: @/lib/session on the server,
#    @/lib/auth-client on the client. Never import better-auth directly —
#    the single exception is getSessionCookie in the edge proxy below.
# -----------------------------------------------------------------------------
say "Scaffolding the auth + proxy shells"

cat > src/lib/auth.ts <<'TS'
// Better Auth server instance — the single place the auth config is defined.
//
// TODO(la-rotunda): wire this once prisma/schema.prisma has the auth models.
//
//   import { betterAuth } from "better-auth";
//   import { prismaAdapter } from "better-auth/adapters/prisma";
//   import { nextCookies } from "better-auth/next-js";
//   import { prisma } from "@/lib/prisma";
//
//   export const auth = betterAuth({
//     database: prismaAdapter(prisma, { provider: "postgresql" }),
//     emailAndPassword: { enabled: true },
//     user: {
//       additionalFields: {
//         // input: false — a client can NEVER self-assign a role at signup.
//         role:     { type: "string", defaultValue: "USER", input: false },
//         branchId: { type: "string", required: false,      input: false },
//       },
//     },
//     // nextCookies() MUST stay the last plugin.
//     plugins: [nextCookies()],
//   });

export {};
TS

cat > src/lib/session.ts <<'TS'
// The server-side session door. Every auth guard in the app lives here.
//
// TODO(la-rotunda): implement once @/lib/auth is wired.
//
//   Guard                     | On failure          | Reads role from
//   --------------------------|---------------------|---------------------------
//   getServerSession()        | returns null        | Better Auth, in cache()
//   requireAdmin()            | throws              | session payload
//   requireAdminPage()        | redirects           | session payload
//   requireDashboardAccess()  | throws              | live DB (role + branchId)
//   resolveBranchScope(...)   | throws on foreign   | —
//
//   Wrap getServerSession in React `cache()` so a request hits Better Auth once.
//   RBAC is structural, not cosmetic: hiding a sidebar link is decoration —
//   every page AND every action re-enforces. A MANAGER is pinned to their
//   branch, so spread `branchId ? { branchId } : {}` at the TOP LEVEL of every
//   order-reading `where`, or it is a cross-branch data leak.

export {};
TS

cat > src/lib/auth-client.ts <<'TS'
// The client-side session door — `useSession()` comes from here, never from
// better-auth directly, so the typed `role` field stays consistent.
//
// TODO(la-rotunda):
//   import { createAuthClient } from "better-auth/react";
//   import { inferAdditionalFields } from "better-auth/client/plugins";
//   import type { auth } from "@/lib/auth";
//
//   export const { useSession, signIn, signUp, signOut } = createAuthClient({
//     plugins: [inferAdditionalFields<typeof auth>()],
//   });
//
// While useSession() is `isPending`, render a pulse skeleton — NOT "Sign In".
// A logged-in user must never see a Sign-In flash.

export {};
TS

# The request interceptor is src/proxy.ts — Next 16's renamed middleware.
# NEVER call this file middleware.ts.
cat > src/proxy.ts <<'TS'
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge proxy — Next.js 16's renamed `middleware` (PROXY_FILENAME = "proxy").
 *
 * OPTIMISTIC by design: `getSessionCookie` only confirms a Better Auth session
 * cookie is PRESENT — it does not validate it against the database (that needs
 * Node + Prisma and cannot run on the Edge). Real validation stays in-page via
 * `getServerSession()`, which correctly rejects a present-but-expired cookie.
 * The proxy's job is to turn "developer forgot the guard" into a cheap redirect.
 *
 * EDGE-SAFE: imports only `next/server` and `better-auth/cookies`. Never import
 * @/lib/prisma, @/lib/auth, or any Node module here — it breaks the Edge build.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the destination; run it through sanitizeRedirect before use.
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // List each protected route BARE and WILDCARDED so the base URL is always
  // covered. Adding a protected route = both entries + the in-page guard.
  // /checkout is deliberately NOT matched — checkout supports guest orders.
  matcher: ["/my-orders", "/my-orders/:path*"],
};
TS

# -----------------------------------------------------------------------------
# 7. Shared modules — validators barrel, action helpers, pricing engine stub
# -----------------------------------------------------------------------------
say "Scaffolding shared lib modules"

# A directory with a barrel, so consumers still write `@/lib/validators`.
cat > src/lib/validators/index.ts <<'TS'
// Shared client + server Zod schemas. The client form and the Server Action
// parse the SAME schema — re-parsed server-side because the client is never
// trusted. This is a plain module (not "use server"), so it may export values.

export const CHECKOUT_MAX_QUANTITY = 99; // per line
export const CHECKOUT_MAX_ITEMS = 50; // distinct lines

// TODO(la-rotunda): export checkoutSchema, productSchema, menuItemSchema, …
// A DELIVERY order must carry a non-empty addressLine — enforce it here with
// a superRefine so both sides of the boundary agree.
TS

cat > src/lib/action-utils.ts <<'TS'
// Shared Server-Action helpers. Deliberately NOT "use server": a "use server"
// file may only export async functions, so plain utilities live here and are
// imported BY action files.
//
// TODO(la-rotunda): implement
//   ensureAdmin()        -> { error } | null      (envelope, so the UI toasts)
//   ensureAdminSession() -> same gate, returns the session
//   prismaErrorCode(err) -> "P2002" | "P2003" | "P2025" | undefined
//
// This module is server-only by dependency (its gates read request headers),
// so a "use client" component must import slugify from @/lib/utils instead —
// importing it from here pulls next/headers into the client bundle.

export {};
TS

cat > src/lib/pricing.ts <<'TS'
// The pricing engine — a PURE, dependency-free module (no Prisma, no React)
// shared by every price surface AND by placeOrder's billing. That shared usage
// is the mechanism guaranteeing the shown price equals the billed price.
// Never re-implement discount math inside a component.

/** The 2-decimal-place authority. All currency rounds through this. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// TODO(la-rotunda): implement
//   livePromotionWhere(now) — Prisma where: isActive && start <= now <= end
//   gatherPromotions(variant, product, category) — merge + de-dupe by id
//   resolvePrice(basePrice, promos, now) -> { finalPrice, hasDiscount, … }
//
// RULES THAT MUST HOLD:
//  · Cheapest Wins — when several live promotions apply, exactly ONE does: the
//    lowest final price. Promotions never stack. No priority field.
//  · Capture `const now = new Date()` ONCE per request and pass that same
//    instant to both the DB filter and the in-memory re-check, so a promotion
//    expiring mid-render can't price two lines of one order differently.
//  · Order of operations: per-line discount -> subtotal -> VAT on the
//    DISCOUNTED subtotal -> delivery fee -> total. Four rounding points.
TS

cat > src/lib/utils.ts <<'TS'
/** Canonical slug. Non-latin input yields "" — supply your own fallback. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Only ever follow a same-origin, absolute-path redirect. */
export function sanitizeRedirect(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
TS

# -----------------------------------------------------------------------------
# 8. App shell — root layout, Tailwind v4 entry, route-group layouts
# -----------------------------------------------------------------------------
say "Scaffolding the app shell"

cat > src/app/globals.css <<'CSS'
@import "tailwindcss";

/* Tailwind v4 is token-driven — declare the design system here, not in a
   tailwind.config.js (v4 has none). Pick La Rotunda's palette and stick to it. */
@theme {
  --color-primary: oklch(0.62 0.17 32);
  --font-serif: ui-serif, Georgia, serif;
}
CSS

cat > src/app/layout.tsx <<'TSX'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Rotunda",
  description: "Pizza, fried chicken, and more — ordered in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
TSX

cat > "src/app/(shop)/layout.tsx" <<'TSX'
/**
 * Storefront shell. This layout owns the single <main> and the navbar-clearance
 * padding — pages must NOT re-add pt-16/20 (documented double-offset hazard).
 */
export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* TODO(la-rotunda): <Navbar /> · <CartSidebar /> · <CartSyncProvider> */}
      <main className="pt-20">{children}</main>
      {/* TODO(la-rotunda): <Footer /> · <Toaster /> from sonner */}
    </>
  );
}
TSX

cat > "src/app/(shop)/page.tsx" <<'TSX'
// Server Component by default: fetch with Prisma directly in the body — no API
// route, no client fetch, no first-paint spinner.
export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-serif text-4xl">La Rotunda</h1>
      <p className="mt-2 text-stone-600">Pizza · Fried chicken · and more.</p>
    </section>
  );
}
TSX

cat > src/app/admin/layout.tsx <<'TSX'
/**
 * Staff console shell.
 *
 * Sidebar link-hiding is decoration only — every page and every action
 * re-enforces the role check server-side (requireAdminPage / requireAdmin).
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      {/* TODO(la-rotunda): <AdminSidebar /> */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
TSX

cat > src/app/admin/page.tsx <<'TSX'
// Per-role server-rendered data with no client-hydration path -> force-dynamic.
// (Catalog routes go the other way: `export const revalidate = 60` ISR, with
// any personalization hydrated client-side instead of server-seeded.)
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // TODO(la-rotunda): await requireDashboardAccess(); then load KPIs.
  // Revenue counts DELIVERED orders only — never "non-cancelled".
  return <h1 className="font-serif text-2xl">Dashboard</h1>;
}
TSX

# -----------------------------------------------------------------------------
# 9. AI infrastructure — .claude governance tree + the verification hook
# -----------------------------------------------------------------------------
say "Creating the .claude AI infrastructure"

mkdir -p .claude/rules .claude/skills .claude/agents .claude/hooks
touch .claude/skills/.gitkeep .claude/agents/.gitkeep

cat > .claude/CLAUDE.md <<'MD'
# La Rotunda — Engineering Charter

A Next.js e-commerce platform for a restaurant (pizza, fried chicken, sides):
catalog -> cart -> checkout -> orders -> multi-branch fulfillment -> admin console.

This file is the always-loaded contract. The rule files below are imported into
every session — read them before touching the corresponding layer.

## Core stack (authoritative — do not substitute)

| Layer | Choice | Non-negotiable |
|---|---|---|
| Framework | **Next.js 16.2** (App Router, RSC-first) | Server Components are the default data layer. The request interceptor is `src/proxy.ts` — **never** `middleware.ts`. |
| UI runtime | **React 19.2** | `useTransition` for every mutation; `cache()` for request-level dedupe. No `useEffect`-driven loading state. |
| Styling | **Tailwind CSS v4** | Token-driven via `@theme` in `globals.css`. There is no `tailwind.config.js`. |
| Database | **PostgreSQL** via **Prisma 7** + `@prisma/adapter-pg` | Relational. Every money column is `Decimal`. |
| Auth & RBAC | **Better Auth 1.6** | DB-backed sessions. Read only through `@/lib/session` / `@/lib/auth-client`. |
| Client state | **Zustand 5** (`persist`) | The cart only, keyed by `variantId`. Everything else is server state. |

## The five rules everything else derives from

1. **The server is the only source of truth for price, stock, identity, and
   permission.** The client sends `{ variantId, quantity }` — never a price.
2. **Every write is a Server Action** returning a discriminated union
   (`{ success: true, … } | { success: false, error }`) — never a thrown
   exception across the client boundary. There is no REST/GraphQL data API.
3. **Prices live ONLY on `ProductVariant`.** Carts and orders carry a
   `variantId`; the server resolves price at read/bill time.
4. **Let the database enforce invariants.** Catch `P2002`/`P2003`/`P2025` and
   translate them — don't re-implement constraints as racy pre-checks.
5. **Money is exact.** All currency is `Decimal`; all arithmetic goes through
   `roundMoney` (2-dp); the shown price is always the billed price.

## Where things live

- `src/app/(shop)/**` — storefront · `src/app/admin/**` — staff console
- `src/lib/actions/**` — `"use server"` write actions
- `src/lib/pricing.ts` — pricing math (highest blast radius)
- `src/lib/session.ts` — every auth guard · `src/lib/validators/` — shared Zod
- `src/lib/prisma.ts` — the client singleton · `prisma/schema.prisma` — data model

## Modular rules (loaded every session)

@rules/frontend.md
@rules/backend.md
@rules/database.md
@rules/business-logic.md
MD

for r in frontend backend database business-logic; do
  cat > ".claude/rules/${r}.md" <<MD
# ${r} rules — La Rotunda

TODO: fill in as the layer takes shape. Keep every claim here verifiable
against the code — a stale rule is worse than a missing one.
MD
done

cat > .claude/hooks/verify.sh <<'SH'
#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Stop-hook verification gate — La Rotunda.
#
# Runs typecheck + lint + tests when the turn actually touched TypeScript, and
# reports failures BACK to the model (exit 2) instead of letting a turn end on
# an unverified "done". Green runs are silent.
#
# Skipped when no .ts/.tsx changed — a question-only turn shouldn't pay for a
# full suite run. Lint IS gated here because this project starts with zero lint
# debt; drop it from the gate only if inherited errors ever start blocking
# unrelated turns.
# -----------------------------------------------------------------------------

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# No TypeScript touched (tracked-modified or untracked) -> nothing to verify.
if [ -z "$(git status --porcelain -- '*.ts' '*.tsx' 2>/dev/null)" ]; then
  exit 0
fi

report=""
failed=0

run_gate() {
  local label="$1"; shift
  local out
  if ! out=$("$@" 2>&1); then
    report="${report}--- ${label} FAILED ---
$(printf '%s' "$out" | tail -40)

"
    failed=1
  fi
}

run_gate "npm run typecheck" npm run typecheck
run_gate "npm run lint"      npm run lint
run_gate "npm test"          npm test

[ "$failed" -eq 0 ] && exit 0

# Exit 2 on a Stop hook = blocking error; stderr is fed back to the model.
printf 'Verification gate failed — do not report this work as complete until it passes:\n\n%s' "$report" >&2
exit 2
SH

chmod +x .claude/hooks/verify.sh

# Wire the gate in as a Stop hook, otherwise verify.sh never runs.
cat > .claude/settings.json <<'JSON'
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/verify.sh\"",
            "timeout": 300,
            "statusMessage": "Verifying (typecheck + lint + tests)..."
          }
        ]
      }
    ]
  }
}
JSON

# -----------------------------------------------------------------------------
# 10. Package scripts — the standard verification targets
# -----------------------------------------------------------------------------
say "Wiring package.json scripts"

npm pkg set scripts.dev="next dev" >/dev/null
npm pkg set scripts.build="prisma generate && prisma migrate deploy && next build" >/dev/null
npm pkg set scripts.start="next start" >/dev/null
npm pkg set scripts.typecheck="tsc --noEmit" >/dev/null
npm pkg set scripts.lint="eslint ." >/dev/null
npm pkg set scripts.test="vitest run" >/dev/null
npm pkg set "scripts.test:watch=vitest watch" >/dev/null
npm pkg set "scripts.test:coverage=vitest run --coverage" >/dev/null
npm pkg set scripts.verify="npm run typecheck && npm run lint && npm run test" >/dev/null
npm pkg set scripts.postinstall="prisma generate" >/dev/null

# -----------------------------------------------------------------------------
# 11. Generate the Prisma client so `@/generated/prisma/client` resolves
# -----------------------------------------------------------------------------
if [ "$SKIP_INSTALL" != "1" ]; then
  say "Generating the Prisma client"
  npx prisma generate || warn "prisma generate failed — run it again after filling in prisma/schema.prisma"
fi

# Preserve the executable bit for the hook on filesystems that drop it (Windows).
git add -A >/dev/null 2>&1 || true
git update-index --chmod=+x .claude/hooks/verify.sh >/dev/null 2>&1 || true

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
say "La Rotunda scaffold complete"
cat <<'NEXT'

  Next steps
  ──────────
  1. Fill in .env with a real DATABASE_URL / DIRECT_URL (Neon or local Postgres).
  2. Model the menu in prisma/schema.prisma — remember: prices live ONLY on
     ProductVariant, and every currency column is Decimal.
       npx prisma migrate dev --name init
  3. Wire src/lib/auth.ts (Better Auth) -> src/lib/session.ts -> auth-client.ts.
       Keep nextCookies() LAST in the plugins array.
  4. Implement src/lib/pricing.ts before any surface renders a price.
  5. npm run verify     # typecheck + lint + test
     npm run dev

NEXT
