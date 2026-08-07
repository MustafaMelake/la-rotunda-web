# Frontend Rules — RSC, Client Islands & Interaction

Scope: `src/app/**` pages/layouts and `src/components/**`. The mental model is
**Server Components by default, Client Components by exception** — a mostly-static
server-rendered tree with thin interactive leaves dropped in exactly where state
is needed.

> **Status tags.** `[BUILT]` = implemented in this repo; the described code exists and
> is the contract to preserve. `[SPEC]` = **does not exist yet**; the section is the
> specification to build against. Do not cite a `[SPEC]` rule as if it described
> existing code. When a section ships, flip its tag in the same commit.
>
> As of now, `src/app/**` and `src/components/**` are **empty except for three layouts
> and two placeholder pages** — so nearly everything in this file is `[SPEC]`.

## Server vs Client boundary `[SPEC]`

- **Default to a Server Component.** Fetch data directly with Prisma in the component body (or a server-only loader) — no API route, no client `fetch`, no first-paint spinner. The HTML arrives already populated.
- **Reach for `"use client"` only for interactivity**: form state, `useTransition`, optimistic UI, animation, `useSession()`, portals. Keep islands thin leaves.
- **There is NO client-side data layer.** No Redux, React Query, or SWR anywhere. Zustand is used *only* for the cart (`src/lib/cart-store.ts`). Order lists, catalogs, admin tables, analytics are all server state re-derived through Server Components on navigation.

## Mutations — the universal pattern `[SPEC]`

Every mutation (place order, change status, edit product, moderate review, toggle promotion) is a Server Action invoked from a Client Component inside `useTransition`:

```tsx
const [isPending, startTransition] = useTransition();

function handleDelete() {
  startTransition(async () => {
    const result = await deleteProduct(id);          // Server Action
    if (!result.success) { toast.error(result.error); return; }  // sonner
    toast.success("Product deleted");
    router.refresh();                                 // re-run the RSC tree
  });
}
```

- **Never wrap a Server Action call in try/catch for the expected path.** Actions always return `{ success }` — branch on it. `isPending` drives the spinner/disabled state.
- **`router.refresh()` after success** re-runs the current route's Server Components (re-querying Prisma) — no full reload, no lost scroll.
- **Optimistic UI is layered with local `useState`** (highlighted status chip, selected variant pill) and **rolled back** when the result is `{ success: false }`.

## Pricing & money on the client `[SPEC]`

- The client is **display-only** for price. Add-to-cart passes the Discount-Engine price the customer *saw*; the server re-resolves and re-bills authoritatively (see `@rules/business-logic.md`).
- **Never render or receive a raw Prisma `Decimal` across the RSC→client boundary** — it does not serialize. The server coerces with `.toNumber()` first; `resolvePrice` already returns plain 2-dp numbers.
- **`tabular-nums` on every numeric node that can change at runtime** — PDP hero price, strikethroughs, variant pills, modifier price deltas, quantity readout, CTA line total, menu prices. This is the CLS guarantee; `60 → 450` must never reflow.

## The cart line identity is `variantId` + `modifierSignature` `[SPEC]`

Every drawer/summary React key and every store lookup (`addItem`, `removeItem`, `updateQuantity`) keys on the **pair**, never on the product id.

- Keying on **product id** is a historical **billing bug** (adds "Pizza — Large" onto the "Pizza — Small" line and charges 2× Small). The line still carries `id` (product id) for display/PDP links only — never dedup on it.
- Keying on **`variantId` alone** is the restaurant-specific version of the same bug: "Large + extra cheese" and "Large plain" share a `variantId` but are different prices. Merging them charges the wrong total.

`modifierSignature` is the **sorted, comma-separated list of selected `ModifierOption` ids**
(e.g. `"opt_a1,opt_f9"`), empty string when no modifiers are selected. Sorting makes it
order-independent so the same selection always produces the same signature. The client
computes it for local store keying; the server recomputes it from the validated option
ids and never trusts the client's string.

## Auth on the client `[SPEC]`

- Session comes from `useSession()` exported by `@/lib/auth-client` (typed `session.user.role` via `inferAdditionalFields`). **Never import from `better-auth` directly.**
- While `useSession()` is `isPending`, render a **pulse skeleton, not "Sign In"** — a logged-in user must never see a Sign-In flash. Apply this guard to any new auth-aware UI.
- "My Orders" is an *is-authenticated* check; the "Admin Dashboard" link is a *role* check (`ADMIN`/`MANAGER`).

## Caching: never seed per-user state into a shared-cache page `[SPEC]`

A page served from a **shared cache must not render per-user state at all**. If a surface
needs personalization, either it is genuinely dynamic, or the personalization is hydrated
client-side over a cached shell — never server-seeded into cacheable HTML.

Three modes, and each catalog surface has already picked one — **do not "fix" a
page by moving it between them without a reason that outlives the diff:**

| Surface | Mode | Why |
|---|---|---|
| `/category/[slug]`, `/product/[slug]` | `export const revalidate = 60` (ISR) | No per-request input, no per-user data → cacheable. |
| `/shop` | **No export** — dynamic by nature | It `await`s `searchParams` for the server-side category filter, which is request-time data. A `revalidate` here would be **inert**, not wrong; don't add one to "make it consistent." |
| `/my-orders`, `/admin/**` | `export const dynamic = "force-dynamic"` | Genuinely per-user/per-role server-rendered data with no client-hydration path. |

**Any new personalized affordance on a cached surface follows one shape:** cached shell,
client store keyed by user, one fetch per user shared across every consumer on the page,
optimistic writes that roll back on failure. While that store is loading (or `useSession()`
is `isPending`), render the **neutral/empty** affordance — see the pulse-skeleton rule in
**Auth on the client** above.

> **Wishlist is dead.** La Rotunda has no wishlist — no `WishlistItem` model, no store, no
> `/wishlist` route, no proxy matcher entry. The legacy Ali Baba docs in `docs/reference/`
> describe one, along with a `force-dynamic`-for-hearts caching trade; both are **history,
> not spec.** Do not reintroduce either.

## Search params & Suspense `[SPEC]`

Any Client Component reading `useSearchParams()` **must** sit under a `<Suspense>` boundary, or the whole route bails to client rendering at build time. `/login` and `/signup` pages are Server Components whose only job is that boundary around a client form that recovers `?redirect=`. Always run a `?redirect=` value through `sanitizeRedirect` from `@/lib/utils` before navigating. *(`sanitizeRedirect` itself is `[BUILT]`.)*

## URL as state `[SPEC]`

Filters, search, and pagination live in the **URL** (`searchParams`), not client state — bookmarkable, shareable, refresh-proof, and one targeted server query per request. Drive changes with `router.push(pathname + "?" + params, { scroll: false })` inside `useTransition`. Debounce free-text search (~400ms) before it touches the URL. Validate any enum param (e.g. `status`) against the real enum server-side — never trust the raw string in a `where`.

## Motion & portals `[SPEC]`

- **framer-motion idioms**: a single shared `layoutId` pill animates between active tabs (`layoutId="admin-status-pill"` / `"order-status-pill"`); destructive actions use an inline confirm-in-place control (`AnimatePresence` width/opacity), not a modal.
- **Portals** (`createPortal(…, document.body)`) guard with a render-time check — `if (typeof document === "undefined") return null;` — **not** a `mounted` flag set in `useEffect` (that trips `react-hooks/set-state-in-effect`). Safe because these drawers start closed, so there's nothing to mismatch.

## Styling `[BUILT]` (shell only) / `[SPEC]` (components)

Tailwind v4, token-driven. Serif headings, `stone-*` neutral palette, a single turquoise `primary` accent, `rounded-full` pills. Arabic content (dine-in menu item names) is RTL-scoped per element (`dir="rtl" lang="ar"`) inside the otherwise-LTR shell.

The `(shop)` layout owns the single `<main>` and the navbar-clearance padding — **pages must not re-add `pt-16/20`** (documented double-offset hazard). That layout exists (`src/app/(shop)/layout.tsx`) and is `[BUILT]`; the `<Navbar>`, `<CartSidebar>`, `<CartSyncProvider>`, `<Footer>` and `<Toaster>` it is meant to host are all `[SPEC]`.
