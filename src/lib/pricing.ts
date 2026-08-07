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
