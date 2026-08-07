# Business-Logic Rules — Pricing, Money, Fulfillment & Time

These are the domain invariants that protect the client's margins and books. They
run through the highest-blast-radius modules in the platform (`src/lib/pricing.ts`,
`placeOrder`, `src/lib/timezone.ts`). Treat every rule here as load-bearing.

> **Status tags.** `[BUILT]` = the described code exists. `[SPEC]` = it does not yet.
> Right now **only `roundMoney` exists** in `src/lib/pricing.ts`; the discount resolver,
> `placeOrder`, and `src/lib/timezone.ts` are all unwritten. Flip a tag in the same commit
> that ships its code.

## The Discount Engine (`src/lib/pricing.ts`) — one pure resolver, every surface `[SPEC]`

> **Filename note:** the legacy Ali Baba docs call this module `src/lib/discounts.ts`.
> In La Rotunda it is **`src/lib/pricing.ts`** — that is the path the charter declares and
> the file that exists. Don't create a second module.

The engine is a **pure, dependency-free module** (no Prisma, no React) shared by every price surface: shop cards, category cards, PDP, homepage badge, logged-in cart hydration, guest re-pricing — **and `placeOrder`'s billing**. That shared usage is *the* mechanism guaranteeing the shown price equals the billed price. **Never re-implement discount math inside a component** — cards and the PDP call the same functions; the math only ever lives in `pricing.ts`.

The three helpers a surface uses:

- `livePromotionWhere(now)` — a Prisma `where` (`isActive && startDate ≤ now ≤ endDate`) spread into every `promotions` include, alongside `PROMOTION_SELECT_FIELDS` for a uniform shape.
- `gatherPromotions(variantPromos, productPromos, categoryPromos)` — merges + de-dupes (by id) the three targeting levels. A promotion applies to a variant if it targets the **variant**, its **parent product**, or that product's **category**.
- `resolvePrice(basePrice, promos, now)` → `{ basePrice, finalPrice, discountAmount, hasDiscount, appliedPromotion }`.

### "Cheapest Wins" — the formalized overlap rule

When several live promotions apply, **exactly one** applies: the one yielding the **lowest** final price (best for the customer). Promotions **never stack**. There is deliberately **no priority/exclusivity field** — don't add one. `ProductVariant.compareAtPrice` is a purely **visual** manual "was" price (a strikethrough fallback shown only when no live promotion applies); it is **never an input to the discount math**.

### Single `now` per request — mandatory

Capture `const now = new Date()` **once** per request and pass the *same* instant to both `livePromotionWhere(now)` (the DB filter) and `resolvePrice(…, now)` (the in-memory re-check). This is what stops a promotion expiring mid-render/mid-loop from pricing two lines of one order against different instants. Any new consumer must follow it.

## Modifiers — priced after the discount, never discounted `[SPEC]`

A line's price is `resolvePrice(variant.price, …).finalPrice + Σ selected option.priceDelta`.
Three rules keep this from becoming a margin leak:

1. **Promotions discount the variant base price only.** A `priceDelta` is never
   percentage-discounted — a 50%-off pizza promotion must not also halve the +30 EGP
   stuffed-crust upcharge. Apply the promotion first, then add the deltas.
2. **Deltas are summed, then the line is rounded once.** `lineUnit = roundMoney(discountedBase + Σ deltas)`.
   Never round each delta individually.
3. **Selection rules are re-validated server-side against the freshly-read groups** —
   `isRequired`, `minSelect`, `maxSelect`, that every option actually belongs to a group
   attached to *this* product, and that each option is `isAvailable`. A tampered client
   must not be able to attach a cheaper product's options to an expensive line.

`modifierSignature` (sorted, comma-separated option ids) is the **cart line identity**, not
a pricing input. The server recomputes it from validated ids; it never trusts the client's.

## Money math — `roundMoney` is the 2-dp authority `[BUILT]` (`roundMoney` only)

- All currency rounds through `roundMoney` (`Math.round((n + Number.EPSILON) * 100) / 100`); discounts floor at 0.
- **Order of operations (never reorder):** per-line discount **first** → add modifier deltas → `subtotal = roundMoney(Σ line unit × qty)` → `vat = isVatEnabled ? roundMoney(subtotal × vatRate) : 0` (on the **discounted** subtotal) → `deliveryFee` (DELIVERY → `roundMoney(branch.deliveryFee ?? settings.defaultDeliveryFee)`; PICKUP → 0) → `totalAmount = roundMoney(subtotal + deliveryFee + vat)`. Nothing off-grid reaches the `Decimal` columns. VAT and delivery never apply to the pre-discount price.

## VAT is a residual — not a stored column `[SPEC]`

Only `subtotal`, `deliveryFee`, and `totalAmount` persist. Every receipt derives VAT as `Math.max(0, totalAmount - subtotal - deliveryFee)`. This guarantees the breakdown always reconciles to the total and lets legacy-shaped orders render `VAT 0` instead of `NaN`. The invariant `total = subtotal + fee + vat` couples three read sites (`dashboard.ts`, `/my-orders`, the admin order drawer) — changing how VAT is stored means touching all three.

## `placeOrder` — the price-integrity boundary `[SPEC]`

The most consequential write path. The client sends only `{ variantId, quantity, modifierOptionIds[] }[]` + fulfillment + contact + a resolved `branchId` — **no price or delta ever crosses the wire.** Server-side, inside a two-statement transaction: batched `findMany({ id: { in: … } })` with the three-level live-promotion hierarchy **and the modifier groups/options** → in-memory loop that **throws (rolls back the whole order)** on any missing/unavailable variant, parent product, or modifier option, or any violated selection rule → `resolvePrice` + delta sum per line → the resulting `unitPrice` is **snapshotted** onto `OrderItem`, and each option's `name`/`priceDelta` onto `OrderItemModifier`.

Order preconditions: shared `checkoutSchema` validation (a DELIVERY order **must** carry a non-empty `addressLine`), a per-phone throttle (**≤ 3 simultaneously-`PENDING` orders per exact `customerPhone`** — Egypt COD fake-order protection), and the **branch-open check** below. Never thread a client price into the payload "for convenience."

## Branch opening hours — the order window `[SPEC]`

`Branch.openTime` / `closeTime` are `"HH:mm"` strings in **`Africa/Cairo`**, and
`Branch.isAcceptingOrders` is a manual kill switch for "we're slammed, stop the queue."

- **The overnight wrap is the case that gets missed.** A restaurant closing at `"03:00"`
  has `closeTime < openTime`; the open test is then `now >= open || now < close`, not the
  naive `open <= now && now < close`. Write it once, in a helper, with a test for both shapes.
- The check runs in `placeOrder` against the **resolved branch row**, not the client's
  claim, and rejects with a plain-language error. The storefront may also disable the CTA,
  but that is decoration — the server is the boundary.
- An **unassigned** ("Other Areas") delivery order has no branch and therefore no hours to
  check; it falls back to the store-wide default and stays acceptable.

## Reporting — two formalized rules `[SPEC]`

1. **Revenue strictly counts `DELIVERED` orders only** — not "non-cancelled." Unconfirmed PENDING/PREPARING/SHIPPED cash is never revenue. Every revenue aggregate, groupBy, and raw rollup (dashboard, branch sales, star-of-month, top products) carries `status: DELIVERED`. **Order-*volume* counters** (today/yesterday, peak hours) deliberately stay status-agnostic (they exclude at most `CANCELLED`) — they measure activity, not money.
2. **Every business "day"/"month" is an `Africa/Cairo` calendar boundary**, expressed as an exact UTC instant. Use `src/lib/timezone.ts` (`STORE_TZ`, `storeMidnight`, `storeMonthStart`, `storeDayKey`) — **DST-safe** (Egypt reinstated DST in 2023; a hardcoded UTC+2 is wrong for part of the year) and **never the Node server's local clock**. Raw-SQL analytics do the equivalent with `AT TIME ZONE`, importing the same `STORE_TZ` so JS and SQL agree on the store day.

## Branches — five hats, soft retirement `[SPEC]`

A `Branch` is simultaneously a **pickup point**, a **delivery area**, the **per-branch delivery-fee source**, the **opening-hours owner**, and the **unit of MANAGER RBAC**. Retire with `isActive: false`; deletion is deliberately hard (blocked by `User.branch` Restrict). At checkout the `"Other Areas"` option is a client-side sentinel (`id: "__other__"`) that maps to `branchId: null` (→ unassigned → Super-Admin-only) — **it must never reach the server.** The delivery fee shipped to the client is display-only; `placeOrder` re-reads the fee from the real, active branch row.

## Cart sync — identity & intent, never money `[SPEC]`

`CartItem` persists only `{ userId, variantId, modifierSignature, quantity }` plus its `CartItemModifier` rows — **no price column**; `getDbCartAction` re-resolves price on every read. The store keys everything on `variantId + modifierSignature` (see `@rules/frontend.md`). A **record-then-confirm `pendingOps` ledger** writes intent to `localStorage` before each logged-in sync leaves and clears it only on exact-match confirmation, so a failed sync replays on the next hydrate. `CartSyncProvider` distinguishes **hydrate** (already-logged-in on mount — plain adopt, never sum) from the **one true merge** (guest → logged-in — server SUMs, clamped). Shared limits from `@/lib/validators`: `CHECKOUT_MAX_QUANTITY = 99` (per line) and `CHECKOUT_MAX_ITEMS = 50` (distinct lines, enforced by the store, the cart actions, `checkoutSchema`, and the DB-cart cap alike).

## Reviews `[SPEC]`

Auth-gated (no anonymous path); `userId` + `authorName` come from the session, **never** form input (`authorName` is a point-in-time snapshot). Created `isApproved: false` — invisible until an admin approves. Moderation revalidates the queue always, and the public PDP only when the change affects it.
