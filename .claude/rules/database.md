# Database Rules — Prisma 7 · PostgreSQL (Neon)

The datastore is **PostgreSQL (Neon)**, accessed through **Prisma 7** with the
`@prisma/adapter-pg` driver adapter over `pg`. It is **relational — not MongoDB,
not any document store.** If any source implies otherwise, this is authoritative:
`prisma/schema.prisma` declares `provider = "postgresql"`.

> **Status tags.** `[BUILT]` = true of the repo right now. `[SPEC]` = the target the
> schema is being built toward. **There are currently ZERO migrations in
> `prisma/migrations/`** and the generated client in `src/generated/prisma` is an empty
> stub — so every model rule below is `[SPEC]` until the first `migrate dev --name init`
> lands. Flip the tags in that same commit.

## Layout & environment `[BUILT]`

- Schema: `prisma/schema.prisma`. Generator `prisma-client` emits to `src/generated/prisma` (**checked in**) — import as `@/generated/prisma/client` and `@/generated/prisma/enums`.
- **CLI vs runtime split (Prisma 7):** `prisma.config.ts` is the single source of truth for schema path, migrations path, and the connection string the **CLI** uses (`migrate`, `studio`, `db push`). At runtime, `src/lib/prisma.ts` builds the `PrismaClient` independently via the driver adapter and **hard-throws if `DATABASE_URL` is missing**. It also sets `dns.setDefaultResultOrder("ipv4first")` (Neon advertises AAAA+A; broken IPv6 caused `ETIMEDOUT`) and memoizes on `globalThis` outside production to survive dev hot-reload without exhausting connections.
- Env contract: `DATABASE_URL` (hard-required at module load), `NEXT_PUBLIC_APP_URL` (optional).

## Money is `Decimal` — everywhere but the VAT rate `[SPEC]`

Every currency column is `Decimal`, so no binary-float drift accumulates at rest: `ProductVariant.price` / `compareAtPrice`, `ModifierOption.priceDelta`, `OrderItemModifier.priceDelta`, `Promotion.value`, `Order.subtotal` / `deliveryFee` / `totalAmount`, `OrderItem.unitPrice`, `Branch.deliveryFee`, `StoreSettings.defaultDeliveryFee`, `MenuItem.price`. **The one deliberate exception is `StoreSettings.vatRate` (`Float`)** — it's a rate/fraction (`0.14`), not a currency amount. Prisma returns `Decimal` as objects: **`.toNumber()` at the client-component serialization boundary** (never pass a raw `Decimal` across the RSC boundary); `src/lib/pricing.ts` accepts `number | Decimal`; writes pass plain numbers, which Prisma coerces.

## Prices live ONLY on `ProductVariant` (+ modifier deltas) `[SPEC]`

The cardinal schema rule. `Product` has **no** price column. Variants are the purchasable unit; carts and orders carry a `variantId` and the server resolves price at read/bill time. A product's "from X" display price is `min(variants[].price)`, derived.

The **one** additional price input is `ModifierOption.priceDelta` — a signed adjustment
added to the resolved variant price. It is not an independent price and never replaces
one. **The client never supplies a price or a delta anywhere in the platform** — it sends
`{ variantId, quantity, modifierOptionIds[] }` and the server resolves both halves.

## Deletion physics — the referential-integrity contract `[SPEC]`

These `onDelete` policies *are* the data-safety model. **Do not weaken them** — flipping any `Restrict` on the order chain to `Cascade` silently destroys order history.

| Relation | Policy | Meaning |
|---|---|---|
| `Product → Category` | **Restrict** | a category with products can't be deleted |
| `Product → ProductVariant` | **Cascade** | deleting a product cascades to its variants… |
| `ProductVariant → OrderItem` | **Restrict** | …**but** an ever-ordered variant can't be hard-deleted — the invariant the whole CRUD-safety model is built on |
| `OrderItem → Order` | Cascade | items die with their order |
| `Order → User` | **SetNull** | orders outlive account deletion |
| `Order → Branch` | **SetNull** | history survives branch deletion; row becomes "unassigned" (Super-Admin-only) |
| `User → Branch` | **Restrict** | a staffed branch can't be deleted (reassign or deactivate first) |
| `Review → User` / `→ Product` | Cascade | reviews die with either |
| `CartItem → User` / `→ ProductVariant` | Cascade | no orphan cart lines |
| `MenuItem → MenuCategory` | Cascade | dine-in items die with their category |
| `ModifierGroup → Product` | **Cascade** | a product's option groups die with it |
| `ModifierOption → ModifierGroup` | **Cascade** | options die with their group |
| `CartItemModifier → CartItem` / `→ ModifierOption` | Cascade | carts are ephemeral; no orphan selections |
| `OrderItemModifier → OrderItem` | Cascade | selections die with their line |
| `OrderItemModifier → ModifierOption` | **SetNull** | **asymmetric on purpose — see below** |

**Why modifier options are `SetNull` while variants are `Restrict`.** Both snapshot their
display data onto the order line, but they differ in churn: a restaurant retires
"Extra Jalapeños" seasonally, and `Restrict` would make every ever-ordered option
permanently undeletable. Because `OrderItemModifier` carries its own `name` +
`priceDelta` snapshot, the FK is **not load-bearing for rendering** — nulling it costs
nothing a receipt can observe. `ProductVariant` keeps `Restrict` because the variant FK
*is* still read by analytics rollups.

**Ordered variants are archived, not deleted.** When an edit removes a variant that has shipped, `updateProduct` catches the `P2003` **after** the transaction commits and archives it (`isAvailable: false`, `sku: null` to free the SKU) instead of deleting — reporting `archivedCount` to the UI. This cleanup runs post-commit deliberately: a `P2003` must never roll back an otherwise-valid product update.

## Snapshots — order history never joins back to the live catalog `[SPEC]`

`OrderItem` stores `productName`, `variantName`, `unitPrice` (the **already-discounted** base price billed), and `quantity`, captured at purchase. Each `OrderItemModifier` likewise stores its own `name` and `priceDelta`. Orders render entirely from these snapshots even after the product/variant/option is edited, archived, or deleted. Never join a placed order back to a live `Product`/`Variant`/`ModifierOption` to render it.

## Let the DB own invariants — catch, don't pre-check `[SPEC]`

Prefer a unique constraint + caught error over an application-level pre-check that can race under concurrency:

- `Review @@unique([userId, productId])` → the `P2002` *is* the "You've already reviewed this product" path. Also indexed on `productId` and `isApproved` (moderation queue).
- `CartItem @@unique([userId, variantId, modifierSignature])` → the upsert key for cart sync. **Note the three-part key** — `[userId, variantId]` alone is the pre-modifier shape and is wrong here.
- `CartItemModifier @@unique([cartItemId, optionId])` / `OrderItemModifier @@unique([orderItemId, optionId])` → an option can't be selected twice on one line.
- `StoreSettings` is a **singleton** `id @default("store")` — never create a second row; a missing row is answered from frozen in-memory defaults that must mirror the schema defaults.
- `Category.slug`, `Product.slug`, `Branch.slug`, `MenuCategory.slug`, `Order.orderNumber` are all `@unique`. Slugs are minted once at creation and **never regenerated on rename** (so `/[slug]` links never 404).

## Constraints the schema can't express (enforced in app logic) `[SPEC]`

- **"MANAGER ⇒ has a `branchId`"** — `branchId` is optional (`USER`/`ADMIN` have none), so it's enforced at two chokepoints: assignment (`updateUserRole` requires a valid branch) and access (`requireDashboardAccess` rejects a branchless manager). See `@rules/backend.md`.
- **Modifier selection rules** — `ModifierGroup.minSelect` / `maxSelect` / `isRequired` are plain integer columns; Postgres cannot enforce "between 1 and 3 options chosen from this group." Validate at both chokepoints: the shared Zod schema the form uses, and again inside `placeOrder` against the freshly-read group rows.
- **`modifierSignature` correctness** — it is a derived column. The server **recomputes** it from the validated option ids on every write; a client-supplied signature is never persisted.
- **Branch opening hours** — stored as `"HH:mm"` strings; the "is the branch open right now" check is app logic against `Africa/Cairo` (see `@rules/business-logic.md`), including the overnight-wrap case where `closeTime < openTime`.
- **`MenuItem` price parity in a fixed-price category** is an admin-workflow convention (bulk `updateMany` multiply), not a DB constraint. If a fixed-price category renders a wrong price, check for divergent `MenuItem.price` rows first.

## Two sealed worlds — don't confuse the models `[SPEC]`

The commerce catalog (`Category`, `Product`, `ProductVariant`, `ModifierGroup`, `ModifierOption`) and the dine-in menu (`MenuCategory`, `MenuItem`) are **different models with no foreign key between them**. The dine-in menu has no variants, no modifiers, no promotions, no cart/order path. Never wire an Add-to-Cart, a `Promotion`, or a `ModifierGroup` onto a `MenuItem`. (`Category` ≠ `MenuCategory`.)

## Migrations & vestigial columns

- Change the schema only via a Prisma migration (`prisma/migrations/`); the generated client is regenerated and checked in.
- **Deleted models/columns — do not reintroduce:** `WishlistItem` (the whole wishlist feature is dead — see `@rules/frontend.md`), `MenuPage` (+ `Product.menuPageId`), `ProductVariant.sortOrder`, `CategoryType`/`Category.type`/`MenuPage.type`, and the `CategoryIdentifier` enum. Variants sort strictly by `price: asc` everywhere.
- **Inherited from Ali Baba and deliberately dropped:** the hardcoded Menoufia towns in `DeliveryLocation`. Delivery areas are the live `Branch` table, not an enum.
- **Retained-by-decision (not dead code):** `Order.deliveryCity` + the `DeliveryLocation` enum (kept only so a legacy-shaped row still renders; checkout never writes them) and `Branch.address` / `Branch.phone` (planned roadmap surfaces).
