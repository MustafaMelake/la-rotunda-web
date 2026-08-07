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
| Client state | **Zustand 5** (`persist`) | The cart only, keyed by `variantId` + `modifierSignature`. Everything else is server state. |

## The five rules everything else derives from

1. **The server is the only source of truth for price, stock, identity, and
   permission.** The client sends `{ variantId, quantity, modifierOptionIds }` —
   never a price and never a modifier `priceDelta`.
2. **Every write is a Server Action** returning a discriminated union
   (`{ success: true, … } | { success: false, error }`) — never a thrown
   exception across the client boundary. There is no REST/GraphQL data API.
3. **Prices live ONLY on `ProductVariant`**, plus signed `ModifierOption.priceDelta`
   adjustments. Carts and orders carry ids; the server resolves price at read/bill
   time. Promotions discount the variant base only — never the deltas.
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

## Reading the rules — `[BUILT]` vs `[SPEC]`

This project is **early**: the schema is drafted, but `src/lib/actions/`,
`src/components/`, and most of `src/app/` are still empty. Every section in the rule
files therefore carries a status tag — `[BUILT]` means the code exists and the rule is
the contract to preserve; `[SPEC]` means it does not exist and the section is the
specification to build against. **Never cite a `[SPEC]` rule as if it described existing
code.** When a section ships, flip its tag in the same commit.

`docs/reference/` holds the legacy **Ali Baba** patisserie docs. They are architectural
reference only — La Rotunda is a restaurant, the wishlist they describe is dead here, and
**where they conflict with `.claude/rules/`, the rules always win.**

## Modular rules (loaded every session)

@rules/frontend.md
@rules/backend.md
@rules/database.md
@rules/business-logic.md
