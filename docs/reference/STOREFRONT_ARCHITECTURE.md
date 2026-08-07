> **PROVENANCE NOTE:** This document describes the legacy "Ali Baba" platform. It is kept for
> architectural reference only. In case of conflicts, the `.claude/rules/` files always win.
>
> La Rotunda is a **restaurant** (pizza, fried chicken, sides); Ali Baba was a **patisserie**.
> Two divergences are load-bearing and called out inline below:
> **(1)** the Wishlist feature is **dead** in La Rotunda, and with it the `force-dynamic`-for-wishlist
> caching trade this document mandates — La Rotunda catalog routes are ISR;
> **(2)** La Rotunda adds per-item **modifiers**, so a cart line is keyed by
> `variantId + modifierSignature`, not `variantId` alone.
> Nothing in this file describes code that currently exists in this repository.

---

# Storefront UX & Client-Side Architecture

**Stack:** Next.js 16.2 (App Router) · React 19.2 · Tailwind CSS v4 · Prisma 7 · PostgreSQL (Neon) · Better Auth 1.6 · Zustand 5

**Audience:** front-end engineers building or extending the customer-facing storefront (`src/app/(shop)/**`).

**Status tags used throughout:**

| Tag | Meaning |
|---|---|
| `BUILT` | Implemented and working as described — treat as the contract to preserve. |
| `GAP` | Does not exist yet. This section *is* the spec to build against. |
| `HARDENING` | Works, but a concrete improvement is recommended before scaling. |

---

## 1. The Homepage & Catalog Structure

### 1.1 The Featured-Categories Slider — `BUILT` (fully admin-curated; the `CategoryIdentifier` enum is gone)

The homepage slider is a direct projection of every `Category` row an admin has toggled into it:

```prisma
model Category {
  ...
  slug        String  @unique   // drives /category/[slug]
  subtitle    String?           // marketing tagline under the title in the slider card
  image       String?           // slider hero image (UploadThing URL or /public path)
  /// When true, this category is surfaced in the homepage CategorySlider.
  /// Any number of categories may be featured (no longer capped at five).
  isFeatured  Boolean @default(false)
  /// Ascending display position within the slider (lower = earlier).
  sliderOrder Int     @default(0)

  @@index([isFeatured, sliderOrder])   // matches the storefront slider read
}
```

There is **no enum, no fixed slot count, and no single-slot "transfer" semantics.** Featuring a second category never displaces a first.

**The query** — `src/app/(shop)/page.tsx`, `getSliderCategories()`:

```ts
const now = new Date();
const categories = await prisma.category.findMany({
  where: { isFeatured: true },
  // Secondary createdAt tie-break keeps categories sharing a sliderOrder stable.
  orderBy: [{ sliderOrder: "asc" }, { createdAt: "desc" }],
  include: {
    promotions: { where: livePromotionWhere(now), select: { type: true, value: true } },
  },
});
```

`Promotion.value` is a `Decimal` column, so the badge math coerces it first (`p.value.toNumber()`).

**The discount badge — `discountLabelFor(promotions)`.** The slider surfaces the category's currently-live *category-level* promotions as a marketing badge:

- If any live `PERCENTAGE` promotion targets the category, the badge is the **strongest percentage**: `"${Math.round(maxValue)}% OFF"`.
- Otherwise, any other live promotion (e.g. `FIXED_AMOUNT`) yields a generic `"SALE"`.
- No live promotion → `undefined` → no badge rendered.

Note the badge is *advisory*, not the pricing contract — actual prices are still resolved per-variant by `resolvePrice` (§2.5), where a fixed-amount promo can legitimately beat the advertised percentage.

**The promo banner — `PromoWidget.tsx`.** Between the Hero and the slider, a self-contained Server Component surfaces the single strongest live promotion store-wide. The CTA deep-links to `/category/[slug]` when the promotion targets exactly one category, otherwise `/shop`; an "Ends {date}" line (Cairo-local via `STORE_TZ`) appears only when the end is ≤ 30 days out. No live promotion → `null` → the section disappears entirely.

**Rendering freshness.** The page declares `export const revalidate = 60` — a shared 60-second ISR cache. This is safe because every admin action that can change the page busts the cache directly: category mutations call `revalidatePath("/")` and promotion mutations bust the whole storefront tree via `revalidatePath("/", "layout")`. The 60s window only bounds pure time-based promotion liveness. The previous `revalidate = 0` paid a Neon round-trip per visit on the hottest route for no correctness win.

**Handling zero featured categories — graceful hide, not a placeholder.** The query filters `isFeatured: true`, so an unfeatured catalog simply produces an empty (or shorter) card list. The Embla carousel (`loop: false`, `dragFree: true`, `containScroll: "trimSnaps"`) renders exactly the cards it receives — no "Coming Soon" tile, no skeleton, no layout gap on the customer side. Keep it that way.

**Admin CRUD contract:**

- `createCategory({ name, subtitle, isFeatured, sliderOrder, image })` — the slug is **derived** (`slugify(name)`) and made unique by suffixing `-2`, `-3`, … inside a transaction (`ensureUniqueSlug`).
- `updateCategory({ … })` — **renames do not regenerate the slug.** The slug is minted once at creation and stays stable, so existing `/category/[slug]` links never 404 after a rename (the trade-off: the slug can drift from the display name).
- `deleteCategory(id)` — pre-checks `product.count` and refuses deletion while products reference the category (`Product.category` is `onDelete: Restrict`); the `P2003` catch covers the race.
- `sliderOrder` is sanitized server-side (`sanitizeSliderOrder`: non-finite → 0, floored, clamped ≥ 0).
- Every mutation revalidates `/`, `/admin/categories`, and fires `updateTag("categories")`.
- **Bucket hygiene:** replacing or deleting a category image purges the old UploadThing file via `deleteUploadedFiles`. Purges run strictly **post-commit and best-effort** — a failed bucket delete never rolls back or fails the DB write, it only logs.

### 1.2 Standard Categories & the Catalog Directory — `BUILT`

`/shop` uses **Server-Side Filtering driven by `searchParams`**:

```ts
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>; // ?category=slug from the URL
}) {
  const now = new Date();   // one instant drives every promotion filter this request
  const { category: categoryParam } = await searchParams;

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    prisma.product.findMany({
      where: {
        isAvailable: true,
        // Narrow by slug only when ?category= is present.
        ...(categoryParam ? { category: { slug: categoryParam } } : {}),
      },
      include: {
        category: { select: { name: true, promotions: { where: livePromotionWhere(now), select: PROMOTION_SELECT_FIELDS } } },
        promotions: { where: livePromotionWhere(now), select: PROMOTION_SELECT_FIELDS },
        variants: { orderBy: { price: "asc" }, include: { promotions: { where: livePromotionWhere(now), select: PROMOTION_SELECT_FIELDS } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  // ...
}
```

There is **no client-side `.filter()` over a fully-loaded product array.** `/shop` (no query) and `/shop?category=bakery` are two genuinely different Postgres reads, so the grid only ever ships the rows it renders.

**The animated, app-like UX is preserved without a client-side filter** — `ShopClient.tsx` wraps the navigation in `useTransition` and pushes the new URL with `scroll: false`:

```ts
const [isPending, startTransition] = useTransition();

function selectCategory(slug: string | null) {
  const params = new URLSearchParams(searchParams.toString());
  if (slug) params.set("category", slug);
  else params.delete("category");
  const query = params.toString();
  startTransition(() => {
    router.push(query ? `/shop?${query}` : "/shop", { scroll: false });
  });
}
```

- **`useTransition`** marks the navigation as non-blocking; `isPending` dims the grid for visual feedback during the round-trip instead of a hard loading state.
- **`router.push(..., { scroll: false })`** stops Next.js from jumping the viewport back to the top on every filter click.
- **`framer-motion`'s `layout` + `AnimatePresence mode="popLayout"`** still own the grid reflow and card enter/exit animation.

> **Removed (July 2026):** `Category.type` / `MenuPage.type` and the `CategoryType` (`SHOP | CAFE`) enum have been purged. The admin UI never exposed a "CAFE" type — every category was `SHOP` and no code path ever wrote `CAFE` — so the `type: "SHOP"` filters were dead no-op guards.

### 1.3 The single dynamic category route — `BUILT`

There is exactly **one** category landing route — `src/app/(shop)/category/[slug]/page.tsx`.

```ts
export const dynamic = "force-dynamic"; // CategoryPageTemplate seeds per-user wishlist hearts

// Request-deduped lookup: generateMetadata AND the page each need the row.
const getCategoryBySlug = cache((slug: string) =>
  prisma.category.findUnique({ where: { slug } }),
);
```

Three properties to preserve:

1. **React `cache()` deduplicates the category lookup.** `generateMetadata` (for SEO) and `CategoryPage` both call `getCategoryBySlug(slug)`; with `cache()` that's **one** Postgres round-trip per request, not two.
2. **Filtering by `categoryId`, not by featured status.** Once the row is resolved, products are filtered by the indexed FK — the route has no featured/standard branch at all.
3. **`force-dynamic` is mandatory.** `CategoryPageTemplate` seeds per-user wishlist hearts (§4.5) and prices each card through the Discount Engine against a per-request `now`.

> **La Rotunda divergence — point 3 does NOT carry over.** The wishlist is dead and catalog routes
> are ISR (`revalidate = 60`). See `.claude/rules/frontend.md`.

**Footer navigation — `BUILT`, DB-backed with two cache tags.** `Footer.tsx` renders its main nav columns from the `FooterLink` model. Rows are grouped by `group` into nav columns (first-appearance order for columns, `order` ascending within each). The settings actions validate the URL shape server-side (must start with `/`, `#`, or `http(s)://` — blocking `javascript:` hrefs).

The footer has **two** `unstable_cache`-wrapped reads, each with its own tag:

| Cached read | Tag | Invalidated by |
|---|---|---|
| `getActiveFooterLinks` (managed links) | `"footer-links"` | every FooterLink mutation (`updateTag("footer-links")`) |
| `getShopCategories` (fallback "Collection" column) | `"categories"` | every category mutation (`updateTag("categories")`) |

Both have a 1-hour safety TTL. External (`http(s)://`) links render with `target="_blank" rel="noopener noreferrer"`.

---

## 2. Product Detail Page (PDP) & Dynamic Variants — `BUILT`

### 2.1 Server shell

The page is a `force-dynamic` Server Component. It fetches everything in one `Promise.all` — including **live promotions at all three targeting levels** (variant / product / category) and the approved reviews — then projects a **discount-resolved** view-model into the client island:

```ts
const now = new Date();   // one instant filters AND evaluates every promotion this request

// Each variant is priced through the Discount Engine. When a live promo applies,
// `price` becomes the discounted amount and the original base price is surfaced as
// `compareAtPrice` (struck-through). With no promo, the MANUAL compareAtPrice column
// is preserved as the fallback strikethrough.
const variants = product.variants.map((v) => {
  const priced = resolvePrice(
    v.price,
    gatherPromotions(v.promotions, product.promotions, product.category.promotions),
    now,
  );
  return {
    id: v.id, name: v.name,
    price: priced.finalPrice,
    isAvailable: v.isAvailable,
    compareAtPrice: priced.hasDiscount ? priced.basePrice : v.compareAtPrice,
  };
});
```

**The price is intentionally not rendered in the Server Component** — it reflects the *selected* variant, so it lives in the client island.

### 2.2 The data contract

```prisma
model ProductVariant {
  id             String   @id @default(cuid())
  productId      String
  name           String            // free text
  sku            String?  @unique
  price          Decimal           // catalogue base price — Decimal
  compareAtPrice Decimal?          // optional MANUAL strikethrough "was" price (admin-set)
  isAvailable    Boolean  @default(true)
  promotions     Promotion[]       // variant-level Discount Engine targets
}
```

Shape facts the islands honor:

1. **Variants are a flat list, not a size × color matrix.** `name` is one free-text string per row. The selector is a **single-axis** pill list over `variants[]`. True independent axes would be a schema change; the UI does not simulate it by parsing `name` strings.
2. **Images live on `Product`, not `ProductVariant`.** Switching the selected variant updates **price, availability, and the Add-to-Cart payload** — it does *not* swap the photo gallery.
3. **There are TWO independent sources of a strikethrough price.** A live `Promotion` discounts the live `price` and surfaces the catalogue base price as the "was" figure. Separately, `compareAtPrice` is a **manual** per-variant column, validated by the shared Zod schema: it must be **strictly greater than the selling price** or the form rejects it. On the PDP the engine wins when a promo is live; the manual `compareAtPrice` is only the fallback.
4. **Money is `Decimal` end-to-end in the database; the client sees plain numbers.** Never pass a raw `Decimal` across the RSC boundary — it doesn't serialize.

### 2.3 `ProductPurchasePanel.tsx` — the client island

Its defining property is a **single source of truth**:

```ts
// Default to the cheapest AVAILABLE variant (variants arrive price-asc, already discounted).
const defaultVariant = variants.find((v) => v.isAvailable) ?? variants[0];
const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");

// Everything is DERIVED from the selected id — never stored in parallel state.
const activeVariant = variants.find((v) => v.id === selectedVariantId) ?? defaultVariant;
const canPurchase   = !!activeVariant?.isAvailable;
const unitPrice     = activeVariant?.price ?? 0;                       // already the discounted price
const showCompareAt = activeVariant?.compareAtPrice != null && activeVariant.compareAtPrice > unitPrice;
```

- **The panel renders the price; it does not compute the discount.** The island stays purely presentational.
- **No drift by construction.** There is no second `useState` holding "the current price" that a fast double-click could desync from the selected pill.
- **`tabular-nums` on every numeric node — a free CLS win.**
- **Add-to-Cart sends the *selected* variant.** `handleAdd` calls `addItem({ id: product.id, variantId: activeVariant.id, … })` — `activeVariant.id`, never `variants[0].id`. The chosen quantity is passed **in one call**: one store update and one background DB sync however large the quantity.

### 2.4 `VariantSelector.tsx` — stateless, single-axis pills

The selector owns **no state of its own**.

| Behavior | Implementation |
|---|---|
| Single variant | Returns `null` — no dead single pill |
| Per-pill price | Each pill shows **that variant's own (discounted) price** (`font-mono tabular-nums`) |
| Out-of-stock variant | `isAvailable: false` → pill is **disabled but kept in the DOM** (strikethrough price, muted text) |
| A11y | `role="radiogroup"` wrapper, `role="radio"` + `aria-checked` per pill, keyboard-focusable, visible `focus-visible` ring |

### 2.5 Storefront Discount Integration — `BUILT`

| Helper | Role |
|---|---|
| `livePromotionWhere(now)` | A Prisma `where` matching only **live** promotions (`isActive && startDate <= now <= endDate`). |
| `gatherPromotions(variantPromos, productPromos, categoryPromos)` | Merges + de-dupes (by id) the promotions targeting a variant **directly**, its **parent product**, or that product's **category**. |
| `resolvePrice(basePrice, promotions, now)` | Returns `{ basePrice, finalPrice, discountAmount, hasDiscount, appliedPromotion }`. When several live promos apply, the one yielding the **lowest** `finalPrice` wins. Money is rounded to 2dp (`roundMoney`), never below 0. |

**Always pass a single `now` per request** so the DB filter and the in-memory evaluation agree on the same instant.

**Product cards** price the **starting (lowest-base-price) variant**:

```ts
const starting = product.variants[0];
const priced = resolvePrice(
  starting?.price ?? 0,
  gatherPromotions(starting?.promotions, product.promotions, product.category.promotions),
  now,
);
const card = {
  ...,
  price: priced.finalPrice, // discounted starting price
  // Live promo → struck-through base price; otherwise fall back to the
  // variant's manual Compare-At so admin-set "was" prices show on the card too.
  compareAtPrice: priced.hasDiscount ? priced.basePrice : starting?.compareAtPrice ?? null,
};
```

The card renders, only while `compareAtPrice > price`: a struck-through original price beside the live price, and a `-{percentOff}%` **sale badge** over the image, where `percentOff = Math.round((1 - price / compareAtPrice) * 100)`.

**If a new card-rendering surface is added, copy this exact fallback rather than re-deriving discount logic in the component** (the math itself still only ever lives in `src/lib/discounts.ts`).

---

## 3. The Café Menu Page (`/menu`) — `BUILT`

The café menu is **structurally isolated** from the shop catalog — `MenuCategory`/`MenuItem` carry no foreign key to `Category`, `Product`, or `ProductVariant`, and (deliberately) no relation to `Promotion`:

```prisma
model MenuCategory {
  id           String  @id @default(cuid())
  title        String
  slug         String  @unique
  order        Int     @default(0)
  isFixedPrice Boolean @default(false)
  items        MenuItem[]
}
model MenuItem { id String @id @default(cuid()); name String; price Decimal; order Int @default(0); categoryId String }
```

This separation is deliberate: the café menu is a **read-only, dine-in/pickup price list**, not something that flows into the cart, checkout, or the Discount Engine. Don't wire an "Add to Cart" button onto a `MenuItem`, and don't expect a `Promotion` to discount one.

**Caching:** the route uses ISR — `export const revalidate = 3600` — and every admin menu mutation calls `revalidatePath("/menu")`. This works because `/menu` renders nothing personalized.

### 3.1 Fixed-price rendering

A fixed-price category renders **one header price badge** (`items[0]?.price`), then a dense responsive grid of item *names only*.

**Important nuance:** "all items share one price" is a **soft, admin-workflow convention — not a database constraint.** `MenuItem.price` is an independent column on every row. The admin enforces the convention via the **"Prices" bulk action** (`bulkAdjustCategoryPrices`), one atomic `updateMany` multiply. **If a fixed-price category ever renders a price that looks wrong, check for divergent `MenuItem.price` rows before assuming a rendering bug.**

### 3.2 Standard (itemized) rendering & strict ordering

Each `MenuRow` is a leader-line row: price (left, `tabular-nums`, EGP suffix) → dotted leader (pure CSS) → Arabic item name (right, `dir="rtl" lang="ar"`). Ordering is enforced **at the query**, never re-sorted client-side:

```ts
const categories = await prisma.menuCategory.findMany({
  orderBy: { order: "asc" },
  include: { items: { orderBy: { order: "asc" } } },
});
```

The contract for any future change: **always sort via `orderBy: { order: "asc" }` in the Prisma query** — a client-side re-sort would silently override the admin's deliberate sequencing.

### 3.3 Supporting UX

- **Sticky scroll-spy nav** — an `IntersectionObserver` (not a `scroll` listener) tracks the in-view section; `rootMargin: "-22% 0px -65% 0px"` biases activation toward a section once it's meaningfully in frame.
- **Empty state** — zero categories renders "Our menu is being prepared" rather than a blank page.
- **Currency & locale** — Arabic item names are RTL-scoped per element (`dir="rtl" lang="ar"`) inside an otherwise LTR page shell.

---

## 4. Customer Auth Space & RBAC

### 4.1 Roles & session — `BUILT`

```prisma
enum UserRole { USER  ADMIN  MANAGER }
model User { ... role UserRole @default(USER) ... branchId String? ... }
```

`role` is layered on as an `additionalFields` entry with `input: false` — a client **cannot set its own role at signup**.

| Context | Access pattern | File |
|---|---|---|
| Server Component / Server Action | `getServerSession()` (React `cache()`-wrapped); staff gates: `requireAdmin()`, `requireAdminPage()`, `requireDashboardAccess()` | `src/lib/session.ts` |
| Client Component | `useSession()` with `inferAdditionalFields<typeof auth>()` so `session.user.role` is typed | `src/lib/auth-client.ts` |

### 4.2 Navbar visibility — `BUILT`

**My Orders / Wishlist are an "is authenticated" check, not a role check.** The Admin Dashboard link is a role check. The auth block renders a pulse skeleton (not "Sign In") while `useSession()` is `isPending`, preventing a logged-in user from seeing a "Sign In" flash. Apply the same `isPending` guard to any new auth-aware UI.

### 4.3 Route protection via the Edge Proxy — `BUILT`

- **Optimistic & edge-safe.** `getSessionCookie` only confirms a Better Auth cookie is present. The proxy imports only `next/server` and `better-auth/cookies`; never add `@/lib/prisma` or `@/lib/auth` here.
- **Defense in depth, not a replacement.** The pages still self-guard with `getServerSession()`.
- **`/checkout` is deliberately NOT in the matcher.** Checkout supports **guest orders** (`placeOrder` accepts a null `userId`), so gating it would break the guest flow. Keep it out.
- **Extending it.** A new authenticated route is protected by adding its bare path **and** `:path*` wildcard to `config.matcher` — and still adding the in-page `getServerSession()` check.

### 4.4 The login & redirect flow — `BUILT`

**Open-redirect hardening — `sanitizeRedirect`.** The guard is a **shared export in `@/lib/utils`**, usable isomorphically from Server and Client code. Only a single-slash, same-origin relative path survives; absolute URLs and the protocol-relative `//host` trick collapse to `"/"`.

On a successful `signIn.email`, navigation is **`router.push(redirectTo)` followed by `router.refresh()`** — Better Auth's vanilla email sign-in does not auto-navigate. The refresh lets `CartSyncProvider` observe the new session and fold the guest cart into the account (§5.4).

> **Signup symmetry — `BUILT`.** `/signup` mirrors the login flow through the same shared `sanitizeRedirect` guard.

### 4.5 Wishlist flow — `BUILT` *(DEAD in La Rotunda — see the provenance note)*

Persisted to Postgres: `WishlistItem { userId, productId }` with `@@unique([userId, productId])`.

- Every page that renders product cards seeds `initialIsFavorited` from `getWishlistedProductIds()` **on the server**, so the heart's first paint is already correct — no flash-then-pop-in.
- Because per-user seeding can't be cached and served to the next visitor, every page doing it runs `export const dynamic = "force-dynamic"`.

> **This entire section is the divergence.** La Rotunda deleted the Wishlist model, the store, the route,
> and the proxy matcher entry, and its catalog routes are ISR. Do not port this section forward.

### 4.6 My Orders dashboard — `BUILT`

`/my-orders` mirrors the admin orders board's URL-driven filter pattern, scoped to `session.user.id`. The `?status=` param is validated against the `OrderStatus` enum — never trusted raw.

`OrderItem` stores a **snapshot** captured at purchase time — the `unitPrice` is the **already-discounted** price the customer was billed. VAT is not stored in its own column; receipts derive it as the **residual** (`totalAmount − subtotal − deliveryFee`). Never join back to the live catalog to render order history.

---

## 5. Cart & Checkout Pipeline

### 5.1 Implementation — `BUILT`, variant-keyed, client-first with optional DB persistence

```ts
export interface CartItem {
  id: string;         // parent product id — display / grouping / PDP links ONLY, never the merge key
  variantId: string;  // the purchasable unit, and the canonical identity of a cart line
  name: string;
  price: number;      // display-only EGP — the DISCOUNTED unit price the customer saw;
                      // the server re-resolves the real price at checkout
  quantity: number;
  image: string;
  category?: string;
}
```

```ts
addItem:        (item, isLoggedIn?)            // adds item.quantity units in ONE update + ONE sync
removeItem:     (variantId, isLoggedIn?)       // local filter, then fireSync(DELETE)
updateQuantity: (variantId, qty, isLoggedIn?)  // local map (<1 → removeItem), then fireSync(SET)
clearCart:      ()                             // local-only empty (drops pendingOps)
clearLocalCart: ()                             // LOGOUT-only wipe: local + persisted + pendingOps, DB untouched
mergeAndSyncCart: () => Promise<void>          // guest → auth bridge (§5.4)
adoptDbCart:    (dbItems)                      // adopt a fetched DB cart, REPLAYING any unsynced pendingOps
refreshPrices:  () => Promise<{ updated }>     // GUEST re-price from the live catalogue
```

**Record-then-confirm sync (`pendingOps`).** The store keeps an **unsynced-intent ledger** written *before* each logged-in sync leaves and cleared only when the server confirms that exact op. A sync that fails leaves its op behind, and the next `adoptDbCart` **replays** it over the server payload instead of letting a blind overwrite silently drop the change.

**SSR-safe persistence.** The `persist` middleware uses a custom storage resolver: real `localStorage` in the browser, a **no-op storage** on the server (`SERVER_NOOP_STORAGE`). This matters because the default storage *throws* server-side, which would strip the `.persist` API off the store — and the checkout page reads `useCartStore.persist.onFinishHydration` during render. `partialize` persists `items` **and `pendingOps`** — never `isOpen` or session-derived data.

### 5.2 Every operation keys on `variantId` — `BUILT`

**Why `variantId` alone — not a composite `productId_variantId`.** `ProductVariant.id` is already a globally unique cuid, and every variant belongs to exactly one product. The database asserts the same modeling choice via `@@unique([userId, variantId])`.

Keep `id` (product id) on the line item for display grouping and PDP links — just never use it to dedup.

> **La Rotunda divergence:** with modifiers, `variantId` alone is insufficient — "Large + extra cheese"
> and "Large plain" are the same `variantId` at different prices. The key becomes
> `variantId + modifierSignature` and the unique constraint becomes
> `@@unique([userId, variantId, modifierSignature])`.

### 5.3 Cart discount integrity — `BUILT`

- **Local adds** carry the price the customer saw.
- **DB reads re-resolve, never store.** `CartItem` persists only `{ userId, variantId, quantity }` — **no price column.** `getDbCartAction` runs `resolvePrice`, so the hydrated price is the *current* discount. **Guest carts are covered too:** the checkout page calls `refreshPrices()` on mount, which hits the public `rePriceGuestCart` action (input de-duped and capped at 100 ids, read-only).
- **The server is still the only pricing authority.**

### 5.4 Guest → authenticated bridge & `CartSyncProvider` — `BUILT`

| Situation | Detected via | Action |
|---|---|---|
| **Already logged in on mount** | `firstResolve` ref, first non-pending session reading | **HYDRATE** — `getDbCartAction()` then `adoptDbCart`. Never merge (would double-count). |
| **Guest → logged in** | `knownUserId` ref transitions `null → id` | **MERGE** — push the guest's local lines up (server **SUMs**, clamped), then adopt. |
| **Logged in → guest** (logout) | transition `id → null` | `clearLocalCart()`; **DB cart left intact**. |
| **Account switch A → B** | transition `idA → idB` | `clearLocalCart()` then HYDRATE B's DB cart. |

Server-side hygiene: `mergeCartAction` sanitizes the payload (drops blanks, clamps each quantity to **1–99**, de-dupes by variant summing, caps at **50 distinct lines**), pre-validates all variant ids in one query so stale ids are skipped instead of aborting the transaction, and treats an empty guest cart as success. `syncCartItemAction` upserts to the *absolute* quantity (`SET` is idempotent) and uses `deleteMany` for removals so a no-op delete is silent.

### 5.5 Server-side price integrity — preserve this — `BUILT`

`placeOrder` accepts only `{ variantId, quantity }` pairs and re-resolves price, **the best live discount**, availability, and parent-product availability **server-side**, inside a transaction. A per-phone throttle caps simultaneously-`PENDING` orders (3) before any pricing work. Inside the transaction the variant reads are **batched into one `findMany` (`id IN …`)** — two statements total regardless of cart size.

```ts
const settings = await getStoreSettings();          // vatRate, isVatEnabled, defaultDeliveryFee

subtotal = roundMoney(subtotal);                    // Σ discounted lines, rounded once after summing
const deliveryFee =
  payload.fulfillment === "DELIVERY"
    ? roundMoney(branch?.deliveryFee ?? settings.defaultDeliveryFee)
    : 0;                                            // PICKUP is always free
const vat = settings.isVatEnabled ? roundMoney(subtotal * settings.vatRate) : 0;
const totalAmount = roundMoney(subtotal + deliveryFee + vat);
```

When touching the cart or checkout, don't start threading the client's `price` into the order payload "for convenience" — the flow's entire price-integrity guarantee rests on the server being the only pricing source.

### 5.6 Checkout delivery & pickup — dynamic Branch fetching — `BUILT`

The checkout form's location selector is **driven by the live `Branch` table**. Adding or renaming a delivery area is an admin Branch edit, not a schema migration.

- **Delivery** — the branch list **plus** a synthetic **"Other Areas"** option (`id: "__other__"`). "Other Areas" sends `branchId = null`, which leaves the order **unassigned** so it surfaces to the **Super Admin** only.
- **Pickup** — the customer chooses a branch directly. Pickup is always fee-free.
- **The previewed delivery fee mirrors the server exactly**: pickup → 0; delivery → the chosen branch's `deliveryFee`; "Other Areas" → `settings.defaultDeliveryFee`. A 0-fee branch renders as "Free".

`placeOrder` then does a **defensive re-resolution**: a supplied `branchId` is stamped only if it still matches a real, `isActive` branch — and the branch's `deliveryFee` is read from that same row, never from the client.

**Hydration UX:** the page tracks Zustand's `persist` hydration with `useSyncExternalStore(useCartStore.persist.onFinishHydration, …)` and holds a neutral background until the cart has rehydrated, the pricing settings have loaded, **and (for guests) the cart lines have been re-priced** — a customer with items never flashes "Your Cart is Empty", and a total is never rendered from numbers about to change.

### 5.7 Store pricing settings (VAT + delivery fees) — `BUILT`

```prisma
model StoreSettings {
  id                 String  @id @default("store")   // fixed singleton id — never create a second row
  vatRate            Float   @default(0.14)          // a FRACTION — deliberately Float: a rate, not currency
  isVatEnabled       Boolean @default(true)          // master switch
  defaultDeliveryFee Decimal @default(35)            // Decimal money
}
```

**One reader, many consumers — and it is strictly read-only.** `getStoreSettings()` is the single access path: a primary-key `findUnique` that runs on hot public paths and therefore **never writes**. A missing row is answered from the in-memory `DEFAULT_PRICING_SETTINGS` (frozen, mirroring the schema column defaults); the singleton row is created only by the ADMIN-gated mutations when an admin first saves the form.

| Action | Auth | Contract |
|---|---|---|
| `getPublicPricingSettings()` | none (storefront) | Returns `{ vatRate, isVatEnabled, defaultDeliveryFee }` — it reveals nothing the order summary doesn't already display. |
| `updateVatSettings({ isVatEnabled, vatRatePercent })` | `requireAdmin` | Accepts the human percentage (14 → 14%), validates `0 < p ≤ 100`, stores a 4dp fraction. The rate is validated even while VAT is disabled, so a bad value can't lie dormant. |
| `updateDeliveryFees({ defaultFee, branchFees[] })` | `requireAdmin` | Persists the whole fee sheet in **one transaction** — all-or-nothing. Each fee is validated into `[0, 10 000]` and rounded to 2dp. |

### 5.8 `/cart` route — `GAP` (drawer-only)

There is no `/cart` route — no full-page cart view, only the slide-out `CartSidebar.tsx` drawer. Worth a dedicated full page if a deep-linkable, shareable cart view is ever needed.

---

## 6. Performance & Core Web Vitals Checklist

| Metric | Lever in use |
|---|---|
| **LCP** | Server Components fetch with Prisma at render time — hero image, cards, **and resolved discount prices** arrive in the initial HTML, no client-fetch waterfall |
| **LCP** | `next/image` with per-breakpoint `sizes`, `remotePatterns` scoped to the UploadThing CDN |
| **CLS** | `tabular-nums` on **every** price node that can change at runtime |
| **CLS** | Pulse-skeleton for the navbar auth state while `useSession()` is `isPending`; checkout holds its background until the cart store rehydrates |
| **INP** | `IntersectionObserver` for the menu scroll-spy instead of a `scroll` handler |
| **INP** | Every mutation runs with optimistic local state; the DB cart sync is backgrounded via a record-then-confirm `pendingOps` ledger, not awaited |
| **INP** | `/shop` category filtering is server-side; `useTransition` + `router.push(..., { scroll: false })` keep the pill click non-blocking and scroll-stable |
| **TTFB** | React `cache()` dedupes the per-request category lookup across `generateMetadata` + page |
| **TTFB / caching** | `/menu` is ISR (`revalidate = 3600`); the footer's two queries are `unstable_cache`d behind tags; the homepage is ISR (`revalidate = 60`) |
| **Bundle size** | Embla Carousel (~6 KB) instead of a heavier carousel; Zustand (~1 KB); the discount resolver is pure TS with no runtime deps |

---

## 7. Open Items for Engineering (as of the legacy platform's final state)

| # | Item | Section | Severity |
|---|---|---|---|
| 1 | **Fee-validation ceilings disagree** — the Settings fee sheet (`parseFee`) caps at 10 000; the Branch modal path (`validateBranchInput`) has no upper bound. Align on one rule. | §5.7 | Low |
| 2 | **Pickup with zero active branches still submits** — `checkoutSchema` doesn't require a branch for `PICKUP`, so submission yields an unassigned order with no pickup label. Disable submit for that state. | §5.6 | Low |
| 3 | Full-page `/cart` view if a deep-linkable cart is ever needed. | §5.8 | Low |
| 4 | Dead code remnant: `categoryUpdateSchema` is exported but referenced nowhere. | — | Low |
