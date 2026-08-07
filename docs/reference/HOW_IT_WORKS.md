> **PROVENANCE NOTE:** This document describes the legacy "Ali Baba" platform. It is kept for
> architectural reference only. In case of conflicts, the `.claude/rules/` files always win.
>
> La Rotunda is a **restaurant** (pizza, fried chicken, sides); Ali Baba was a **patisserie**.
> Where this document describes a feature La Rotunda has not adopted — most notably the
> **Wishlist**, which is deliberately dead here — treat the description as history, not as a
> specification. Nothing in this file describes code that currently exists in this repository.

---

# Ali Baba — System Management & Architecture Report

**Audience:** new developers onboarding onto the codebase, and stakeholders who want an accurate, current picture of what's been built.
**Scope:** this is the operational reference for the whole platform — storefront, authentication, multi-branch fulfillment, the discount engine, checkout, and the admin operational engine. It describes what happens, in what order, why it's built that way, and which file owns each behavior.

---

## 1. Executive Summary & Core Stack

Ali Baba is a server-rendered, server-validated e-commerce platform for a patisserie business: a public storefront (catalog, product detail with multi-variant purchasing, wishlist, checkout, order history) and an authenticated, role-gated admin console (`/admin`) for running the business day to day — across **multiple physical branches**, with a server-side **Discount Engine** and a Super-Admin **Advanced Analytics** suite.

| Layer | Choice | Why it's here |
|---|---|---|
| Framework | **Next.js 16.2** (App Router) | Server Components as the default data layer; Server Actions replace a separate REST/GraphQL API; the request interceptor is `src/proxy.ts` (Next 16's renamed middleware — see §2). |
| UI runtime | **React 19.2** | `useTransition` for every mutation; `cache()` for request-level dedupe; no legacy `useEffect`-driven loading state. |
| Styling | **Tailwind CSS v4** | Utility-first, design-token driven (serif headings, `stone-*` neutral palette, a single turquoise `primary` accent, rounded-full pills). |
| Database | **PostgreSQL (Neon)** via **Prisma 7** (`@prisma/adapter-pg` driver adapter) | Serverless-friendly connection handling; typed queries; raw SQL escape hatch when the typed query builder can't express something (see §5.2 and §5.7). **Every money column is `Decimal`** (never `Float`) — `ProductVariant.price`/`compareAtPrice`, `Order.subtotal`/`deliveryFee`/`totalAmount`, `OrderItem.unitPrice`, `Promotion.value`, `Branch.deliveryFee`, `StoreSettings.defaultDeliveryFee`, `MenuItem.price` — so currency never drifts on binary rounding; server code coerces with `.toNumber()` before a value crosses to the client. (`StoreSettings.vatRate` deliberately stays `Float`: it's a rate/fraction, not currency.) |
| Auth & RBAC | **Better Auth 1.6** | Session-based; a `role` field on `User` (`USER` \| `ADMIN` \| `MANAGER`) gates the admin console. `ADMIN` is the Super Admin (sees everything); `MANAGER` is scoped to a single `Branch` via `User.branchId`. Always read through the project's `@/lib/session` wrapper (`getServerSession` / `requireAdmin` / `requireAdminPage` / `requireDashboardAccess`) on the server, or `@/lib/auth-client` on the client — never import session helpers from `better-auth` directly. See §5.5. |
| Client state | **Zustand 5** (`persist` middleware) | Used narrowly, for the cart only (`src/lib/cart-store.ts`). The cart is keyed by **`variantId`** — the purchasable unit — not the parent product id (see §4). Everything else — admin tables, filters, wishlist counts — is server state, re-fetched through Server Components rather than cached on the client. |
| Pricing | **Discount Engine** (`src/lib/discounts.ts`) | A pure, dependency-free price resolver. The same math runs on the storefront, the cart, the checkout summary **and** inside `placeOrder`, so a customer is always billed exactly the price they were shown (see §6). |
| Motion / feedback | `framer-motion`, `sonner` | Inline transitions, sliding tab/pill indicators, slide-over drawers, and toast feedback for every mutation. |

**Design philosophy:** every page — storefront or admin — renders fully populated on first load. There is no spinner-then-fetch pattern anywhere in the app, because data comes from Prisma queries running directly inside Server Components. Every mutation (place an order, toggle a wishlist heart, change an order's status, edit a product, moderate a review, run a promotion) happens through a Server Action invoked from a small Client Component, wrapped in `useTransition` so the UI never blocks or full-page-reloads. The result feels like a single-page app while staying server-rendered, server-validated, and credential-free on the client: prices, statuses, branch scope, and permissions are never trusted from the browser. The platform is **multi-branch** — every order is routed to a fulfilling `Branch`, branch managers see only their own branch's data, and every promotional price is resolved server-side by the Discount Engine before VAT and delivery are ever added. Two formalized business rules run through every reporting surface: **revenue strictly counts `DELIVERED` orders only** (unconfirmed cash is never reported as revenue), and **every business "day" is an `Africa/Cairo` calendar day** — date bucketing converts Cairo wall-clock boundaries into exact UTC instants via `src/lib/timezone.ts`, never the Node server's local midnight (see §5.1, §5.7).

---

## 2. Authentication, the Edge Proxy & Routing

### 2.1 The auth stack

- **Server config** — `src/lib/auth.ts`: `betterAuth` with the Prisma adapter, email+password (`autoSignIn`, `minPasswordLength: 8`), 7-day sessions refreshed daily, and `nextCookies()` as the **last** plugin so it can set cookies on action/route responses. The `role` field is declared as an `additionalFields` entry with `input: false` and `defaultValue: "USER"` — **a client cannot assign itself a role at signup**; an admin or manager is promoted by a privileged action (`updateUserRole`, §5.5) or a direct database write only.
- **Server reads** — `src/lib/session.ts`: `getServerSession()` is wrapped in React `cache()`, so a layout and a page that both need the user in one request hit Better Auth once.
- **Three roles, two staff tiers.** `UserRole` is `USER` \| `ADMIN` \| `MANAGER`, and `src/lib/session.ts` exposes the matching guards:
  - `requireAdmin()` — throws on anyone who isn't the Super Admin; the gate on every Super-Admin-only Server Action (products, branches, users, promotions).
  - `requireAdminPage()` — page-level guard that **redirects** a signed-in MANAGER back to `/admin` (used on ADMIN-only pages like promotions and analytics).
  - `requireDashboardAccess()` — admits **ADMIN or MANAGER** and resolves the caller's branch scope. Critically, `role` **and** `branchId` are read **live from the database**, not from the session token (the token only carries `role`, never `branchId`), so a demoted or re-assigned user loses access on their very next request, not whenever the 7-day token happens to refresh. A `MANAGER` with no `branchId` is rejected here at the access boundary (the schema can't enforce "MANAGER ⇒ branchId"). See §5.5.
- **Client reads** — `src/lib/auth-client.ts`: `createAuthClient` + `inferAdditionalFields<typeof auth>()`, so `session.user.role` is typed on the client. Exports `signIn` / `signUp` / `signOut` / `useSession` / `getSession`.

### 2.2 The Edge Proxy (`src/proxy.ts`)

Next.js 16 renames the root request interceptor from `middleware` to **`proxy`** — the framework resolves `PROXY_FILENAME = "proxy"` at `(?:src/)?proxy`. The project follows this strictly: the file is `src/proxy.ts`, **not** `middleware.ts`. It is an **optimistic, edge-safe** guard:

```ts
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);   // better-auth/cookies — presence check only
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/my-orders", "/my-orders/:path*", "/wishlist", "/wishlist/:path*"],
};
```

- **Optimistic by design.** `getSessionCookie` confirms a Better Auth cookie is *present*; it does not validate it against Postgres (Prisma can't run on the Edge). The proxy converts "a new protected page shipped without a guard" into a cheap redirect — it is not the security boundary.
- **Edge-safe.** It imports only `next/server` and `better-auth/cookies`. Never import `@/lib/prisma` or `@/lib/auth` here.
- **Defense in depth.** The protected pages still run `getServerSession()` + `redirect("/login")` themselves. The admin surface is gated separately in its layout (§5) and re-checked in every loader/action. The proxy is the first cheap gate; `getServerSession()` stays the source of truth and correctly rejects a present-but-expired cookie that slipped past the Edge.

### 2.3 The login flow — Server Component Suspense boundary

`/login/page.tsx` is a Server Component whose only responsibility is to wrap the interactive form in a `<Suspense>` boundary:

```tsx
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
```

The boundary is **required**, not cosmetic: `LoginClient.tsx` reads `useSearchParams()` to recover the proxy's `?redirect=` intent, and Next.js forces any search-params reader under a Suspense boundary or the entire route opts out to client-side rendering at build time. The `LoginFallback` is an `animate-pulse` skeleton sized to the real two-column layout, reusing the same skeleton convention as the navbar's auth state — so there's no blank flash on a client-side navigation into `/login`.

**Open-redirect hardening — a globally shared guard.** The `redirect` value is attacker-controllable (anyone can hand-craft `/login?redirect=https://evil.com` — it never had to pass through our proxy to arrive). The application is protected by `sanitizeRedirect`, a single function exported from `@/lib/utils` — **not** a private helper duplicated inside `LoginClient.tsx` — so the same protection is isomorphic and importable from any Server Component, Client Component, or Server Action that ever needs to honor a `?redirect=` value:

```ts
// src/lib/utils.ts
export function sanitizeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/"
  return path
}
```

`LoginClient` imports it and runs the proxy's `?redirect=` value through it before navigating: `const redirectTo = sanitizeRedirect(searchParams.get("redirect"))`. Only a single-slash, same-origin relative path survives; absolute URLs and the protocol-relative `//host` trick (which browsers resolve to a different origin) both fall back to `"/"`. On a successful `signIn.email`, navigation is driven by `router.push(redirectTo)` followed by `router.refresh()` — Better Auth's vanilla email sign-in does not auto-navigate (its `callbackURL` is only acted on by redirect-based flows like OAuth), so the explicit `router.push` is what completes the round-trip back to the originally-requested page.

Because the guard lives in `@/lib/utils` rather than one client island, any future redirect-consuming surface — a signup flow honoring `?redirect=`, a password-reset return path, a Server Action that needs to validate a callback target — imports the same function instead of re-implementing (and potentially drifting from) the open-redirect policy. There is exactly one definition of "what counts as a safe redirect" for the whole app.

### 2.4 Routing topology

Two App Router route groups, two dynamic segment routes:

| Route | Resolved by | Notes |
|---|---|---|
| `src/app/(shop)/**` | — | Public storefront; account routes gated by the proxy + in-page check |
| `src/app/admin/**` | — | Staff console for **ADMIN + branch-scoped MANAGER**; the layout admits both roles, and the per-page/per-action guards (`requireAdminPage` / `requireDashboardAccess`) enforce the finer scope (§5.5) |
| `(shop)/product/[slug]/page.tsx` | `Product.slug` (`@unique`) | Product detail page |
| `(shop)/category/[slug]/page.tsx` | `Category.slug` (`@unique`) | **The single** category landing route — one file serves every category, featured or standard (§3.1) |

---

## 3. Storefront & Catalog Architecture

### 3.1 Dynamic category routing + `cache()` dedupe

There is exactly **one** category route, `src/app/(shop)/category/[slug]/page.tsx` — the previous five hand-written per-category page files have been removed entirely (along with the `CategoryIdentifier` enum that named them; featuring is now the `Category.isFeatured`/`sliderOrder` toggle, §3.2). The dynamic route resolves any category by its unique `slug`, so it serves featured and standard categories with a single render path.

The route is the platform's reference example of **request-level query deduplication**. Both `generateMetadata` (for SEO `<title>`/canonical/OpenGraph tags) and the page component need the same `Category` row. Wrapping the lookup in React's `cache()` collapses what would be two identical Postgres reads into one:

```ts
const getCategoryBySlug = cache((slug: string) =>
  prisma.category.findUnique({ where: { slug } }),
);
```

Both `generateMetadata` and `CategoryPage` call `getCategoryBySlug(slug)`; the second call within a request is served from React's memo — **one** round-trip per request. A miss renders `notFound()` (HTTP 404) and a `"Category Not Found"` title. Products are filtered by the resolved, indexed `categoryId` FK, their variants and live promotions are included so the grid can price each card through the Discount Engine (§6), and the page is `export const dynamic = "force-dynamic"` because `CategoryPageTemplate` seeds per-user wishlist hearts — it must never render from a shared ISR cache that would leak one user's state to the next.

> **La Rotunda divergence:** this `force-dynamic`-for-wishlist trade was **reversed** in the La Rotunda rules, and then the Wishlist feature was dropped entirely. Catalog routes there are ISR (`revalidate = 60`). See `.claude/rules/frontend.md`.

**Footer links — DB-backed, not a coupling caveat.** `Footer.tsx` no longer links into this route via a hardcoded constant array. The main nav columns are driven by the `FooterLink` model (see §5.8), so an admin-authored link's `url` is whatever the admin typed — not derived from a category's current `name`/`slug` — and a category rename in the admin can no longer silently 404 a footer link. (If no managed links exist yet, the footer falls back to a live `prisma.category.findMany` read for its "Collection" column, not the old static array.)

### 3.2 Homepage slider & `/shop` directory

The homepage (`(shop)/page.tsx`) projects **every `Category` row an admin has featured** (`isFeatured: true`, ordered by `sliderOrder` asc with a `createdAt` tie-break — no cap, no enum, the old `CategoryIdentifier` slot mechanism is gone) into the Embla `CategorySlider`, each card carrying a live-promotion badge resolved from the Discount Engine. The page is **ISR (`revalidate = 60`)**; category and promotion mutations bust the cache directly (`revalidatePath("/")` / `revalidatePath("/", "layout")`). The `/shop` catalog directory relies on high-performance **Server-Side filtering via URL `searchParams`**: `ShopPage` reads `?category=slug` and narrows the `Product` query in Postgres (`...(categoryParam ? { category: { slug: categoryParam } } : {})`) — there is no in-memory `.filter()` over a fully-loaded product array. This keeps the data layer clean and prevents a client-side bottleneck as the catalog scales: `/shop` and `/shop?category=bakery` are two genuinely different, narrowly-scoped reads, so the grid only ever ships the rows it renders, no matter how large the catalog grows. `ShopClient.tsx` keeps the pill-click UX instant despite the server round-trip by wrapping the URL navigation in `useTransition` and pushing with `router.push(..., { scroll: false })`, so the sticky filter bar and Framer Motion's grid animation are never disrupted by a hard reload.

### 3.3 Product Detail Page — multi-variant client islands

The PDP (`(shop)/product/[slug]/page.tsx`) is a Server Component that fetches the product, its variants (`orderBy: { price: "asc" }`), the live promotions targeting the variant / product / category levels, its approved reviews, the session, and the wishlist state in a single `Promise.all`. It prices **each** variant through the Discount Engine server-side (§6) before handing the **full variant set** to a client island — multi-variant products are fully selectable by customers.

- `ProductPurchasePanel.tsx` (client) groups price, variant selection, quantity stepper, and the Add-to-Cart CTA into one island. It holds a single `useState<string>` source of truth — `selectedVariantId` — and **derives** the displayed price, sold-out state, and the cart payload from the active variant. Nothing is stored in parallel state, so the price node can never drift from the selected pill. It defaults to the cheapest *available* variant (`variants.find(v => v.isAvailable) ?? variants[0]`), preserving the "from {price}" promise shown on product cards.
- `VariantSelector.tsx` (client, stateless/presentational) renders a **single-axis** row of pills — one per `variant.name`, each showing that variant's own price — matching the flat `ProductVariant` shape (a free-text `name`, not a size × color matrix). It returns `null` for single-variant products, exposes `role="radiogroup"`/`role="radio"` semantics, and keeps sold-out variants **in the DOM but disabled** (strikethrough price) so the option stays indexable rather than vanishing.
- **CLS & a11y:** every price node uses `tabular-nums` so switching from `60` to `450` never reflows the row. `compareAtPrice` is **driven by the Discount Engine** (§6): when a live promotion lowers a variant's catalogue price, the page passes the discounted amount as `price` and the original as `compareAtPrice`, which renders as a struck-through "was" price with an `aria-label="Original price … EGP"`; when no live promotion applies, the variant's own manual `compareAtPrice` column is preserved as-is. The CTA carries a dynamic `aria-label` describing the quantity and line total.

Crucially, the variant selector and the cart's `variantId` keying (§4) shipped together — a selector that lets a customer add two variants of one product would have been money-incorrect against a product-id-keyed cart.

---

## 4. The Cart — variant-keyed integrity, dual-mode persistence

The cart runs in **two modes** depending on auth state. A guest's cart is **client-only**: Zustand + `persist` to `localStorage` under the key `"ali-baba-cart"` (`src/lib/cart-store.ts`). A **logged-in** customer gets the same local store, but it is also **synced to the database** (`CartItem`) in the background, giving them a cross-device cart.

### 4.1 Zustand as the optimistic frontend

Regardless of auth state, **Zustand is always the thing the UI reads from** — every mutation applies to the local store first and renders instantly, with zero latency. When the user is logged in, that same mutation is also fired off to a Server Action to persist it, but the UI never waits on that round-trip:

```ts
// src/lib/cart-store.ts
addItem: (newItem, isLoggedIn) => {
  // Adds `newItem.quantity` units (default 1) in ONE update + ONE background
  // sync, clamped to the shared CHECKOUT_MAX_QUANTITY (99) ceiling.
  const amount = Math.max(1, Math.floor(newItem.quantity ?? 1));
  const existing = get().items.find((i) => i.variantId === newItem.variantId);
  const newQuantity = Math.min((existing?.quantity ?? 0) + amount, CHECKOUT_MAX_QUANTITY);

  set((s) => ({
    items: existing
      ? s.items.map((i) => i.variantId === newItem.variantId ? { ...i, quantity: newQuantity } : i)
      : [...s.items, { ...newItem, quantity: newQuantity }],
    isOpen: true,
  }));

  // Background DB mirror — only when authenticated. The optimistic local
  // state above has already applied; this just keeps Postgres in step.
  if (isLoggedIn) fireSync(newItem.variantId, newQuantity, "SET");
},
```

`fireSync` is **record-then-confirm**, not blind fire-and-forget: before the request leaves it writes the op into a persisted **`pendingOps` ledger** (`Record<variantId, { quantity, action }>`, included in the `localStorage` partialize), and clears the entry only when `syncCartItemAction` confirms that exact op. A transient failure (offline, timeout, tab closed mid-flight) leaves the op behind and surfaces a toast — the next hydrate/merge (§4.3) **replays** it via `adoptDbCart` instead of silently dropping the un-synced change. One rejection is terminal: the server enforces a **50-distinct-line cap** on the DB cart (`CHECKOUT_MAX_ITEMS` — a `SET` introducing a *new* line beyond it is refused with the shared `CART_LIMIT_ERROR`; re-quantifying an existing line is always allowed), and on that specific error the store **rolls the optimistic line back**, drops its pending op, and toasts. `SET` upserts the line to an **absolute** quantity (idempotent — a late-arriving `SET` simply overwrites, sidestepping increment races), and `DELETE` uses `deleteMany` so removing an already-gone row is silent rather than throwing.

Critically, **`CartItem` stores only identity and intent** — `{ userId, variantId, quantity }`, no price column. Reading it back (`getDbCartAction`) joins each line to its live variant/product/category and re-resolves price (including any active discount, §6) at read time, so a hydrated cart always reflects the *current* catalogue, never a stale snapshot.

### 4.2 The canonical identity of a cart line is `variantId`, not the product id

A `CartItem` still carries `id` (the parent product id) for display, grouping, and PDP back-links — but every merge/lookup operation, local or remote, keys on `variantId`.

**Why this matters.** The previous store merged on the product `id`. Once the PDP gained a real variant selector, that became a billing bug: adding "Cake — Small" (`variantId: A`, 80) then "Cake — Large" (`variantId: B`, 150) would match the existing line by product id and merely increment its quantity — keeping the Small's `variantId` and price. Checkout would charge 2× Small. Keying every operation on `variantId` makes each chosen variant a distinct, correctly-priced line. This isn't an arbitrary choice — it mirrors the database's own modeling: the `CartItem` table declares `@@unique([userId, variantId])`, not `([userId, productId])`.

> **La Rotunda divergence:** La Rotunda adds per-item **modifiers**, so `variantId` alone is no longer a
> sufficient line identity — the key becomes `variantId + modifierSignature`. See
> `.claude/rules/business-logic.md`.

### 4.3 `CartSyncProvider` — bridging guest and authenticated state

`CartSyncProvider` is a client-only wrapper mounted near the app root. It renders its children untouched — all of its behavior lives in a `useEffect` reacting to `useSession()` — so it introduces no SSR hydration mismatch. Its job is to tell apart two situations that both superficially look like "the user is logged in," using two refs (`firstResolve`, `knownUserId`) so each transition fires **exactly once**:

| Transition | Detected as | Action |
|---|---|---|
| Already logged in on mount (refresh / new device) | First non-pending session reading, `userId` already set | **Hydrate**: pull the DB cart and adopt it via `adoptDbCart` — a plain overwrite when nothing is unsynced, with any `pendingOps` **replayed** over the server payload first (§4.1). *Never* merge here — the local and DB carts may already overlap, and summing them would double-count. |
| Guest → logged in (a real sign-in this session) | `null → id` transition | **Merge**: push local lines up via `mergeCartAction` (server **sums** local + DB quantities per line, clamped to the shared 99 ceiling, payload capped at 50 distinct lines, all in one transaction), then adopt the merged DB cart through `adoptDbCart`. |
| Logged in → guest (logout) | `id → null` transition | `clearLocalCart()` — wipe local + `localStorage` so the next person on this device starts clean. The DB cart is **left intact** for the user's next sign-in or another device. |
| Account switch A → B | `idA → idB` transition | `clearLocalCart()`, then hydrate B's cart fresh from the DB. |

The provider deliberately never subscribes to `items`, so editing the cart doesn't re-trigger the effect — only an actual auth-state change does.

> **Price note.** Neither mode ever trusts a client-supplied price for billing: `mergeCartAction` and `syncCartItemAction` persist only `{ variantId, quantity }`, `getDbCartAction` re-resolves price (and discount) on every read, and `placeOrder` re-reads each variant and re-resolves its discount server-side at checkout (§6, §7).

---

## 5. Admin Operational Engine

The entire `/admin/*` surface is gated in `src/app/admin/layout.tsx`: a signed-out visitor is sent to `/login`, and anyone who is neither `ADMIN` nor `MANAGER` is sent to `/`. This is the **coarse** role gate only — a MANAGER is admitted here so they can reach the dashboard and orders, but each loader/action re-checks the role and resolves the branch scope from the database (§5.5).

**Shared action infrastructure.** The Server Actions behind this surface share one consolidated helper module, `src/lib/action-utils.ts`: `ensureAdmin()` (the ADMIN RBAC gate that returns a standard `{ error }` envelope instead of throwing, so action UIs toast rather than crash — plus the session-returning `ensureAdminSession()` for actions that need the caller's identity), `prismaErrorCode()` (uniform `P2002`/`P2003`/`P2025` reading), and `slugify()`.

### 5.1 Dashboard Overview (branch-scoped)

The landing page at `/admin` is marked `export const dynamic = "force-dynamic"` — it opts out of route caching, because a stale revenue number or order count would actively mislead whoever's looking at it. All of its data comes from a single server-only loader, `getDashboardStats()` in `src/lib/actions/dashboard.ts`, which authorizes the caller (`requireDashboardAccess`) and **scopes every order query to their branch** before running them.

| Metric | Source |
|---|---|
| Total Revenue | Sum of `totalAmount` across **`DELIVERED` orders only, in scope** (`prisma.order.aggregate`) |
| Orders Today | Count of in-scope orders (any status) created since **Cairo midnight** (`storeMidnight(0)`) |
| Active Products | Count of products flagged `isAvailable: true` (store-wide) |
| Customers | Count of `User` rows with `role: "USER"` (store-wide) |

Two formalized rules govern these numbers:

1. **Revenue strictly counts `DELIVERED` orders** — not merely "non-cancelled." Unconfirmed `PENDING`/`PREPARING`/`SHIPPED` cash is never reported as revenue. Order-**volume** counters (Orders Today / Yesterday) deliberately stay status-agnostic — they measure activity, not money.
2. **Every time window is an `Africa/Cairo` calendar day, expressed as an exact UTC instant.** "Today," "yesterday," and the 30-day windows come from `src/lib/timezone.ts` (`storeMidnight`, `storeMonthStart`, `storeDayKey` over the shared `STORE_TZ` constant), which converts Cairo wall-clock midnights into UTC instants for Prisma `gte`/`lt` ranges — **DST-safely** (Egypt reinstated DST in 2023, so a hardcoded UTC+2 offset would be wrong for part of the year). The raw-SQL analytics rollups (§5.7) do the equivalent conversion inside Postgres with `AT TIME ZONE`, importing the same `STORE_TZ` constant.

**Branch scoping.** Orders and revenue carry a `branchId`, so they are filtered:
- **ADMIN** → unrestricted (all branches), or one branch if a `branchId` param is supplied.
- **MANAGER** → hard-pinned to their own branch; every order query is `AND`-ed with `{ branchId }`, and asking for any other branch throws `Unauthorized` (`resolveBranchScope`).

All of this is fetched in **one parallel `Promise.all` batch**, not a sequence of awaited queries.

The **revenue chart** (Recharts) is fed by pulling every in-scope **`DELIVERED`** order from the last 30 days and bucketing its `totalAmount` into the **Cairo calendar day** it was created (`storeDayKey(order.createdAt)`). Buckets are built in calendar space (DST-free), so a 23h/25h DST-transition day can never split or merge a bucket.

### 5.2 Orders Command Center

`/admin/orders` is the highest-traffic admin screen, built around an **"inbox-zero" UX philosophy**: get from "see an order" to "act on it" to "it's off the list" in as few interactions as possible, with zero full-page reloads.

#### URL-driven filtering, search & cursor pagination

The page is a Server Component that accepts `searchParams: Promise<{ status?: string; query?: string; cursor?: string; dir?: string }>` — filter, search, **and pagination** state all live **in the URL**, not in client component state.

- `status` is validated against the `OrderStatus` enum before use — an invalid or missing value always falls back to the synthetic `"ALL"` tab. The raw URL string is never trusted directly in a `where` clause.
- `query` searches `customerName` (case-insensitive `contains`) and `customerPhone` (`contains`), OR'd together with the order-number match described below.
- `cursor` + `dir` drive the pager; changing the filter or search deletes the cursor pair, since a cursor row may not exist under the new filter.

**Cursor pagination — no offsets.** The list is paginated at **`ORDERS_PAGE_SIZE = 50`** rows per page, newest first, using Prisma's **cursor** mechanism (`cursor: { id }`, `skip: 1` to exclude the cursor row itself, and a `take` of `±(pageSize + 1)` — the sentinel row detects whether the walk can continue, and a *negative* take walks backwards for "Previous"). Ordering is the deterministic compound `[{ createdAt: "desc" }, { id: "desc" }]`, so same-timestamp rows can never be skipped or repeated across page boundaries.

The search box is **debounced 400ms** before it touches the URL.

#### Branch RBAC, live counters & sliding tabs

`getOrders()` resolves the caller's branch scope (`requireDashboardAccess` + `resolveBranchScope`) and **`AND`s that branch into every query** — the list, the per-status counters, *and* the numeric order-number search — so a MANAGER physically cannot surface another branch's orders no matter what they type or filter.

The tab bar is `ALL` plus the five `OrderStatus` values, each annotated with a live count. Counts come from a single `prisma.order.groupBy({ by: ["status"], where: scopedSearch, _count: { _all: true } })` query run in parallel with the main list fetch — and critically, the `where` is the **branch scope + search clause only**, not the status clause.

The active tab is highlighted with a Framer Motion `layoutId="admin-status-pill"` `<motion.span>` — a single shared element animates between whichever tab is active.

#### Partial numeric order-number search (raw SQL `::text` cast)

`orderNumber` is a Postgres `Int` column. Prisma's typed query builder can do `equals` on an `Int`, but **not** `contains`. Searching for `"100"` and expecting it to match order `#10024` requires comparing against the integer's *text representation*:

```ts
const numericOrderIds =
  q && /\d/.test(q)
    ? (
        await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Order" WHERE "orderNumber"::text ILIKE ${`%${q}%`}
        `
      ).map((row) => row.id)
    : [];
```

Three things make this safe:

1. **Parameterization, not string concatenation.** `$queryRaw` is a tagged template — the `${...}` interpolation is bound as a query parameter by Prisma's query engine, not spliced into the SQL string.
2. **It only ever produces an id allow-list.** The raw query's *only* output is a list of `Order.id` values fed back into a normal, fully-typed Prisma `where` clause.
3. **Branch scope still wins.** `getOrders` `AND`s the caller's `branchWhere` at the top level.

#### Status control & branch-aware authorization

`updateOrderStatus(orderId, status)` is the single server action behind every status change in the admin. It:

1. Calls **`requireDashboardAccess()`** first (not `requireAdmin()`) — independent of any UI gating, since a Server Action is a public, directly-callable HTTP endpoint regardless of which page links to it.
2. Validates `status` against `Object.values(OrderStatus)` — a non-enum string is rejected, never silently coerced.
3. **Enforces branch ownership for managers:** an `ADMIN` may move any order, but a `MANAGER` may only touch an order whose `branchId` matches their own — any other branch, *or an unassigned order*, is `Unauthorized`.
4. Runs the update, then calls **both** `revalidatePath("/admin/orders")` *and* `revalidatePath("/admin")`.

**The inbox-zero auto-close behavior:** `AdminOrdersTable.tsx` derives the drawer's open order **from the live `orders` prop array by id**, not from a frozen snapshot taken when the row was clicked (`orders.find((o) => o.id === selectedId)`). Combined with `router.refresh()` inside `StatusControl`, this means: if staff are viewing the `Pending` tab and mark an order `Preparing`, the refreshed query no longer includes that order in the `Pending` filter — it drops out of `orders`, `selected` becomes `null`, and the drawer closes itself.

### 5.3 Product Management Lifecycle (CRUD)

#### Listing

`/admin/products` fetches every product newest-first, joined with its category name and the price of each of its variants. Because **price lives on the variant, not the product**, the list shows a derived "from X" price — the minimum across that product's variants.

#### Creation & updating

Creating a product (`createProduct`) re-validates the form payload server-side against the same Zod schema the client uses, then creates the product and its first variant together in one nested Prisma write.

**Updating is more delicate**, because an edit can simultaneously keep some variants unchanged, edit others, add new ones, and remove others in one submission. `updateProduct` handles this in two phases:

1. **Inside a database transaction:** the product's own fields are updated, and each submitted variant is either updated in place (if its id already belongs to this product) or created fresh. If anything fails, the whole update rolls back.
2. **After the transaction commits:** any variant that existed before but is missing from the new submission is treated as removed, and the system attempts to delete it.

#### Safe deletion

A `ProductVariant` that has ever appeared in a placed order **cannot be deleted** — the `OrderItem → Variant` relationship is configured with `onDelete: Restrict`, so Postgres refuses the delete rather than risk an order referencing a missing item. Both flows catch that refusal specifically:

- **Removing a variant during an edit:** falls back to *archiving* it (marks unavailable, frees its SKU) instead of hard-deleting, with a toast: *"N variant(s) couldn't be deleted (part of existing orders) and were hidden instead."*
- **Deleting an entire product:** rejected the same way, with: *"This product appears in existing orders and can't be deleted. Mark it Out of Stock instead."*

The underlying error code is `P2003` (foreign-key constraint violation) — the action layer recognizes that code and translates it into a precise instruction instead of a generic 500.

### 5.4 Review Moderation System

Customers submit reviews from the product detail page via `submitProductReview`. The action checks for an active session first and rejects outright if there isn't one — **there is no anonymous review path** — and the reviewer's identity (`userId`, display name) is pulled from the session server-side, never from form input. Every new review is created with `isApproved: false`.

**Anti-spam:** a unique constraint on `(userId, productId)` means Postgres itself refuses a second review from the same customer on the same product — a hard data-layer guarantee, not a soft check a race condition could bypass. The resulting `P2002` is caught and turned into *"You've already reviewed this product."*

### 5.5 Branch Management & Branch-Manager RBAC

Branches are the unit of physical fulfillment **and** the unit of staff authorization. The `Branch` model carries a unique `name`, a unique URL-safe `slug`, optional `address`/`phone`, and an `isActive` soft on/off switch.

**The RBAC model.** A `User`'s `branchId` is optional at the schema level *by necessity* — `USER` and `ADMIN` have no branch — so the rule "a `MANAGER` must have a `branchId`" cannot be expressed in Prisma. It is enforced in application logic at two points:

- **Read path** — `requireDashboardAccess()` rejects a `MANAGER` with no `branchId` as a misconfigured account, and `resolveBranchScope(scope, requestedBranchId?)` collapses the caller's scope plus any requested branch into the single `branchId` a query must filter by.
- **Write path** — `updateUserRole()` is the single authority for promoting/demoting users. Promoting someone to `MANAGER` **requires** a valid `branchId`; demoting to `USER`/`ADMIN` always clears `branchId` to `null`. It also guards against self-lockout.

Deletion is guarded by the schema's relation policies:

- `User.branch` → `onDelete: Restrict` → a branch with assigned staff/managers cannot be deleted.
- `Order.branch` → `onDelete: SetNull` → historical orders survive a branch delete and simply become **unassigned** (visible to the Super Admin only).

Prefer `updateBranch(id, { …, isActive: false })` to retire a branch while keeping its assignments and history intact.

### 5.6 Promotions Management

`/admin/promotions` is **ADMIN-only** — it calls `requireAdminPage()`, which bounces a manager back to `/admin`.

CRUD lives in `src/lib/actions/promotions.ts` — `createPromotion`, `updatePromotion`, `togglePromotionActive`, `deletePromotion`. Because the promotion targets are **implicit many-to-many** relations, the actions speak Prisma's relation verbs directly:

- **create** → `connect` the chosen ids.
- **update** → `set` the chosen ids — this **replaces** the whole selection.
- **delete** → Prisma removes the implicit join rows automatically; **no catalog rows are ever touched**.

`validatePromotion()` enforces the invariants server-side before any write: a name of at least 2 characters, a valid `DiscountType`, a strictly positive `value` (and ≤ 100 for `PERCENTAGE`), parseable `startDate`/`endDate` with `endDate ≥ startDate`, and **at least one** target across the three categories.

### 5.7 Advanced Analytics (Super-Admin only)

`/admin/analytics` is a cross-branch performance suite reserved for the Super Admin. The defining characteristic is that **every metric is computed in the database** — Prisma `groupBy` aggregations plus a couple of grouped `$queryRaw` rollups — so the loader never pulls raw order rows into Node.

Four datasets are returned and fetched in one `Promise.all`:

1. **Branch sales comparison** — all-time `DELIVERED` revenue and order count per active branch.
2. **Peak hours** (volume, not-`CANCELLED`) — orders bucketed by branch × hour-of-day, computed in the store's `Africa/Cairo` wall clock via `EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Cairo')`, casting `COUNT(*)` to `int` to avoid `BigInt` serialization.
3. **Top selling products per branch** (`DELIVERED`) — units sold and revenue per branch × product.
4. **Star of the month** (`DELIVERED`) — the highest-revenue branch for the current `Africa/Cairo` calendar month.

### 5.8 Store Settings — Dynamic Footer Navigation CMS

`/admin/settings` gives the Super Admin full editorial control over the storefront footer's navigation. Each `FooterLink` row is an independent `label → url` pair with **no foreign key back to the catalog**. This is the deliberate fix for the old hardcoded-array problem: a footer link is no longer derived from a category's current `name`/`slug`.

**The `group` field drives column layout without touching the grid CSS.** Because this is a CSS grid with a fixed `md:grid-cols-4` track count, **the layout never breaks regardless of how many groups an admin creates**.

**Cache & read-your-own-writes.** The public footer reads links through an `unstable_cache` tagged `"footer-links"`; every settings mutation calls `updateTag("footer-links")`.

---

## 6. The Discount Engine

The Discount Engine is a server-side pricing layer that turns a catalogue price into the price a customer actually pays. Its math lives in one pure module, `src/lib/discounts.ts`, and it is consumed identically everywhere a price is shown or charged.

### 6.1 The `Promotion` schema

A promotion applies a discount of a given `type` and `value` over the window `[startDate, endDate]`, and can target **any mix** of whole `Category` rows, individual `Product` rows, and specific `ProductVariant` rows. These are **implicit many-to-many** relations.

**A promotion applies to a variant** when it targets that variant directly, **or** its parent product, **or** that product's category. `gatherPromotions(...lists)` merges the variant-, product-, and category-level lists and de-dupes them by id.

### 6.2 "Live" is strict, and checked in two layers

A promotion is **live** only when `isActive === true` **and** `startDate <= now <= endDate`:

- **At the query** — `livePromotionWhere(now)` returns a Prisma `where` that callers spread into the `promotions` relation include, so the database only ever returns currently-live rows.
- **In the resolver** — `isPromotionLive(promo, now)` re-checks the same condition defensively, and tolerates invalid dates by treating them as not-live.

Critically, callers pass **a single `now` per request** to both the filter and the resolver, so a promotion can't expire mid-render (or mid-loop, across the lines of one order) and price two items against different instants.

### 6.3 Resolving the final price

```ts
applyPromotion(base, promo)
  = PERCENTAGE   → round(base * (1 - value / 100))
  = FIXED_AMOUNT → round(base - value)
  // never returns below 0; round = 2-dp money rounding (with Number.EPSILON)

resolvePrice(base, promotions, now) → {
  basePrice, finalPrice, discountAmount, hasDiscount, appliedPromotion
}
```

`resolvePrice` considers only **live** promotions and, when several apply, the one yielding the **lowest** final price wins — always the best deal for the customer.

### 6.4 One resolver, every surface

The module is intentionally **pure and dependency-free** — no Prisma, no React — so the exact same function runs on product cards, the product detail page, the checkout summary, and **`placeOrder`**. Because they all call `resolvePrice`, they can never disagree: the customer is billed exactly the price they were shown.

---

## 7. Checkout & Canonical Pricing

Checkout collects fulfillment details client-side, but **every price in the order is resolved server-side** inside `placeOrder` — the client never sends a price, only `variantId` + `quantity` pairs plus the chosen fulfillment and branch.

### 7.1 Dynamic branch routing

Delivery areas and pickup locations are **strictly driven by the live `Branch` table**. The page loads active branches once via `getActiveBranches()` and renders them through a single `BranchSelect`:

- **Delivery** — the "Delivery Area" selector is the branch list **plus** a synthetic **"Other Areas"** option. Choosing a branch sends that branch's id; choosing "Other Areas" sends `branchId = null`, which leaves the order **unassigned** and surfaces it to the **Super Admin** (`ADMIN`) only.
- **Pickup** — the customer chooses a branch directly; its id is stamped as `branchId`, and `pickupBranch` additionally keeps the human-readable branch **label** for the receipt.

### 7.2 The transaction

Before any pricing work, the payload is validated by the **same shared `checkoutSchema`** the form runs (empty cart, 1–50 items × 1–99 quantity, name/phone, and the conditional rule a tampered client could bypass: **a DELIVERY order MUST carry a non-empty `addressLine`**), and a per-phone throttle caps simultaneously-`PENDING` orders (3).

`placeOrder` then wraps the whole order in `prisma.$transaction`. First it does a **defensive branch resolution**: a supplied `branchId` is only stamped if it matches a **real, active** branch; a stale, invalid, or deactivated id silently falls back to `null`. The transaction itself is kept deliberately **short — two statements regardless of cart size**: one **batched `findMany` (`id IN …`)** reads every line's `ProductVariant` **and its live promotions at the variant / product / category levels** in a single query, and the loop then does no DB work at all. (This replaced an N+1 `findUnique`-per-line that held the transaction open in proportion to cart size.)

The best live discount is then applied per line via `resolvePrice`, and **the discounted `finalPrice` is what gets snapshotted** onto the `OrderItem`.

### 7.3 Canonical pricing — discount first, then VAT & delivery

The order of operations matters: **the per-line discount is applied before anything else**, the subtotal is the sum of the *discounted* lines, and VAT is computed on that discounted subtotal — VAT and delivery never apply to the pre-discount price.

```
lineFinal    = resolvePrice(variant.price, livePromotions, now).finalPrice
subtotal     = roundMoney(Σ (lineFinal × quantity))
deliveryFee  = DELIVERY ? roundMoney(branch.deliveryFee ?? settings.defaultDeliveryFee) : 0
vat          = settings.isVatEnabled ? roundMoney(subtotal × settings.vatRate) : 0
totalAmount  = roundMoney(subtotal + deliveryFee + vat)
```

### 7.4 The "Residual VAT" fallback

VAT is deliberately **not** stored as its own database column — only `subtotal`, `deliveryFee`, and `totalAmount` are persisted. Every place that displays a receipt derives VAT the same way:

```ts
vat = Math.max(0, totalAmount - subtotal - deliveryFee)
```

Deriving VAT as a residual guarantees the displayed breakdown **always reconciles exactly** to `totalAmount`. It also means the same rendering code safely handles **legacy orders** placed before the current pricing model existed: for those historical rows, the residual formula evaluates to `0`, so old orders simply render with a `VAT 0` line rather than throwing, showing `NaN`, or requiring a backfill migration.

---

## 8. Order History

`/my-orders` follows the same `searchParams`-driven filtering pattern as the admin orders board, scoped to `session.user.id`. It is protected by the edge proxy (§2.2) and an in-page `getServerSession()` guard.

`OrderItem` stores a **snapshot** (`productName`, `variantName`, `unitPrice`, `quantity`) captured at purchase time — the `unitPrice` is the **already-discounted** price the customer was billed. Never join back to the live catalog to render order history — the snapshot *is* the source of truth for a placed order.

---

## 9. UX, State & Performance Principles

There is deliberately **no client-side global data-fetching cache** anywhere in the app (no Redux, no React Query/SWR). Zustand is used narrowly for the cart; everything else is server state, re-derived from Prisma on every navigation.

1. **Server Components as the default data layer.** Every page fetches its own data directly from Prisma at render time; the HTML reaching the browser is already complete.
2. **Request-level `cache()` dedupe.** `getServerSession()` and per-route lookups like `getCategoryBySlug()` are wrapped in React `cache()`.
3. **`useTransition` for every mutation, everywhere.** The page stays fully interactive while it's in flight, a single `isPending` flag drives the relevant spinner/disabled state, and `router.refresh()` after success re-runs the current route's Server Components. Optimistic UI is layered on top with local `useState` that's rolled back if the action's result comes back `{ success: false }`.
4. **Predictable action results, never thrown exceptions across the server/client boundary.** Every Server Action returns a consistent `{ success: true, ... } | { success: false, error: string }` shape.

**SSR-safe portal rendering for modals & drawers (React 19, no state-in-effect).** Both drawers render via `createPortal(..., document.body)`. The naive fix is a `mounted` flag set in a bare `useEffect` — but that pattern is exactly what React's `react-hooks/set-state-in-effect` lint rule flags. Both drawers instead guard with a plain runtime check and no extra state at all:

```ts
if (typeof document === "undefined") return null;
```

This is safe specifically because both drawers are *closed* on first client paint (`open` starts `false`) — there's nothing visible to mismatch between server and client markup.

---

### In one sentence

The platform is server-rendered and server-validated end to end — Prisma queries and Server Actions do all the real work, auth is gated first at the Edge (`src/proxy.ts`) and then authoritatively in-page (`getServerSession()`), staff access is branch-scoped, pricing and stock are always re-resolved from the database — including the best live promotion via the pure Discount Engine, applied before VAT and delivery — rather than trusted from the client, orders are routed to a real `Branch` (or to the Super Admin when unassigned) and, like the cart, are keyed by `variantId` to keep each purchasable unit distinct and correctly priced, the database's own constraints (`P2003`, `P2002`, `P2025`) are treated as the source of truth rather than re-implemented in application code, and the client side exists only to make those server-side results feel instant.
