import { roundMoney } from "@/lib/pricing";
import type { BranchMock } from "@/lib/mock/branches";
import { STORE_DEFAULTS } from "@/lib/mock/branches";

export type FulfillmentMethod = "DELIVERY" | "PICKUP";

export type CartLineModifier = {
  optionId: string;
  name: string;
  /** Signed. Added AFTER any discount and never itself discounted. */
  priceDelta: number;
};

/**
 * One cart line.
 *
 * The persisted half is `{ variantId, modifierSignature, quantity }` — that is
 * all `CartItem` stores, and there is deliberately no price column on it. Every
 * other field here is display data that the server re-resolves on read, which is
 * what keeps the shown price equal to the billed price.
 */
export type CartLine = {
  variantId: string;
  /** Sorted, comma-joined option ids. "" when nothing is selected. */
  modifierSignature: string;
  quantity: number;

  // ── display only, re-resolved server-side ────────────────────────────────
  /** Product id. For the PDP link ONLY — never dedup on it. */
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  image: string;
  /** Variant price. `Decimal` in the schema. */
  basePrice: number;
  modifiers: CartLineModifier[];
};

/**
 * The line identity: `variantId` + `modifierSignature`, always the pair.
 *
 * Keying on product id is a historical billing bug — it stacks "Large" onto the
 * "Small" line and charges twice the Small price. Keying on `variantId` alone is
 * the same bug wearing a different hat: "Large + extra cheese" and "Large plain"
 * share a variant and cost different amounts, so merging them bills the wrong
 * total. The DB agrees — `CartItem` is unique on the three-part
 * `[userId, variantId, modifierSignature]`.
 */
export function lineKey(line: Pick<CartLine, "variantId" | "modifierSignature">): string {
  return `${line.variantId}::${line.modifierSignature}`;
}

/**
 * PLACEHOLDER cart. Two of these lines share a `variantId` and differ only by
 * `modifierSignature` — that is not an accident, it is the case that breaks any
 * implementation keying on the variant alone.
 */
export const MOCK_CART: readonly CartLine[] = [
  {
    variantId: "var-mega-regular",
    modifierSignature: "",
    quantity: 1,
    productId: "prod-mega-box",
    productSlug: "mega-box",
    productName: "Mega Box",
    variantName: "Regular",
    image: "/la-rotunda5.jpg",
    basePrice: 545,
    modifiers: [],
  },
  {
    variantId: "var-mega-regular",
    modifierSignature: "mega-box-extra-fries,mega-box-heat-spicy",
    quantity: 2,
    productId: "prod-mega-box",
    productSlug: "mega-box",
    productName: "Mega Box",
    variantName: "Regular",
    image: "/la-rotunda5.jpg",
    basePrice: 545,
    modifiers: [
      { optionId: "mega-box-heat-spicy", name: "Spicy", priceDelta: 0 },
      { optionId: "mega-box-extra-fries", name: "Extra fries", priceDelta: 35 },
    ],
  },
  {
    variantId: "var-crepe-large",
    modifierSignature: "triple-shish-crepe-dip-garlic",
    quantity: 1,
    productId: "prod-triple-shish-crepe",
    productSlug: "triple-shish-crepe",
    productName: "Triple Shish Crepe",
    variantName: "Large",
    image: "/la-rotunda3.jpeg",
    basePrice: 340,
    modifiers: [{ optionId: "triple-shish-crepe-dip-garlic", name: "Garlic", priceDelta: 10 }],
  },
];

/**
 * Per-unit price: variant base, then the deltas summed and the whole thing
 * rounded ONCE. Never round a delta on its own, and never let a promotion touch
 * a delta — a half-price offer must not also halve an upcharge.
 *
 * `resolvePrice` is still a TODO in pricing.ts, so no discount is applied yet.
 * When it ships, the discounted base replaces `basePrice` here and nothing else
 * in this file changes.
 */
export function lineUnitPrice(line: CartLine): number {
  const deltas = line.modifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0);
  return roundMoney(line.basePrice + deltas);
}

export function lineTotal(line: CartLine): number {
  return roundMoney(lineUnitPrice(line) * line.quantity);
}

export function cartSubtotal(lines: readonly CartLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + lineTotal(line), 0));
}

export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** DELIVERY takes the branch's own fee, falling back to the store default. PICKUP is free. */
export function deliveryFeeFor(
  fulfillment: FulfillmentMethod,
  branch: BranchMock | null,
): number {
  if (fulfillment === "PICKUP") return 0;
  return roundMoney(branch?.deliveryFee ?? STORE_DEFAULTS.defaultDeliveryFee);
}

/** VAT is charged on the DISCOUNTED subtotal — never on the pre-discount price. */
export function vatFor(subtotal: number): number {
  return STORE_DEFAULTS.isVatEnabled
    ? roundMoney(subtotal * STORE_DEFAULTS.vatRate)
    : 0;
}

export function orderTotal(subtotal: number, fee: number, vat: number): number {
  return roundMoney(subtotal + fee + vat);
}

/**
 * The whole breakdown, in the one order the charter fixes and forbids
 * reordering: subtotal → VAT on that subtotal → delivery fee → total.
 *
 * Only `subtotal`, `deliveryFee` and `totalAmount` are ever persisted. On read,
 * VAT is recovered as `max(0, total - subtotal - fee)`, which is what keeps the
 * breakdown reconciling and lets a legacy-shaped order render "VAT 0" rather
 * than NaN.
 */
export function summarise(
  lines: readonly CartLine[],
  fulfillment: FulfillmentMethod,
  branch: BranchMock | null,
) {
  const subtotal = cartSubtotal(lines);
  const vat = vatFor(subtotal);
  const deliveryFee = deliveryFeeFor(fulfillment, branch);
  return { subtotal, vat, deliveryFee, total: orderTotal(subtotal, deliveryFee, vat) };
}
