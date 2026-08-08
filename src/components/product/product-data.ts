/**
 * PDP mock data, shaped to the real Prisma models rather than to a flat product.
 *
 * Three deliberate departures from a naive `{ title, price, addons }` shape,
 * each forced by the schema:
 *
 *  1. There is NO price on a product. `Product` has no price column at all —
 *     price lives only on `ProductVariant`, so a PDP must offer a variant
 *     selector and the "from" figure is the derived min(variants[].price).
 *     Baking a flat `price` in here would encode the one bug the charter calls
 *     its cardinal schema rule.
 *  2. "Add-ons" are `ModifierGroup` + `ModifierOption`, not a flat list. The
 *     groups carry `isRequired` / `minSelect` / `maxSelect`, which Postgres
 *     cannot enforce, so the UI validates them and the server re-validates.
 *  3. Every money figure here is a plain number. In production these are
 *     `Decimal`, and `.toNumber()` must run server-side — a raw Prisma Decimal
 *     does not serialise across the RSC boundary.
 *
 * Slugs match the box products in `MenuGrid`, so the links from /menu actually
 * resolve instead of 404ing.
 */

export type VariantMock = {
  id: string;
  name: string;
  /** EGP. `Decimal` in the schema. */
  price: number;
  /** Manual strikethrough "was" price. Purely visual — never a pricing input. */
  compareAtPrice: number | null;
  isAvailable: boolean;
};

export type ModifierOptionMock = {
  id: string;
  name: string;
  /** Signed adjustment added AFTER any discount. Never itself discounted. */
  priceDelta: number;
  isAvailable: boolean;
};

export type ModifierGroupMock = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOptionMock[];
};

export type ReviewMock = {
  id: string;
  rating: number;
  comment: string;
  /** Snapshot taken at submission — render THIS, never `user.name`. */
  authorName: string;
  /** ISO date. Formatted at render with a fixed locale to avoid SSR drift. */
  createdAt: string;
};

export type ProductMock = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  description: string;
  image: string;
  variants: VariantMock[];
  modifierGroups: ModifierGroupMock[];
  reviews: ReviewMock[];
};

/** Group ids are minted per product: a ModifierGroup belongs to one product. */
function extrasFor(slug: string): ModifierGroupMock[] {
  return [
    {
      id: `${slug}-heat`,
      name: "Choose your heat",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: `${slug}-heat-original`, name: "Original", priceDelta: 0, isAvailable: true },
        { id: `${slug}-heat-spicy`, name: "Spicy", priceDelta: 0, isAvailable: true },
        { id: `${slug}-heat-extra`, name: "Extra hot", priceDelta: 5, isAvailable: true },
      ],
    },
    {
      id: `${slug}-extras`,
      name: "Add extras",
      isRequired: false,
      minSelect: 0,
      maxSelect: 3,
      options: [
        { id: `${slug}-extra-fries`, name: "Extra fries", priceDelta: 35, isAvailable: true },
        { id: `${slug}-extra-slaw`, name: "Coleslaw", priceDelta: 20, isAvailable: true },
        { id: `${slug}-extra-cheese`, name: "Extra cheese", priceDelta: 15, isAvailable: true },
        { id: `${slug}-extra-cola`, name: "Cola 330ml", priceDelta: 25, isAvailable: false },
      ],
    },
    {
      id: `${slug}-dips`,
      name: "Dips",
      isRequired: false,
      minSelect: 0,
      maxSelect: 2,
      options: [
        { id: `${slug}-dip-garlic`, name: "Garlic", priceDelta: 10, isAvailable: true },
        { id: `${slug}-dip-bbq`, name: "BBQ", priceDelta: 10, isAvailable: true },
        { id: `${slug}-dip-hot`, name: "Hot sauce", priceDelta: 10, isAvailable: true },
      ],
    },
  ];
}

/**
 * ⚠️ FABRICATED REVIEWS — PLACEHOLDER ONLY. DO NOT SHIP.
 *
 * Invented names and comments. Publishing made-up endorsements attributed to
 * named people is deceptive and regulated in most jurisdictions. The real read
 * is `where: { isApproved: true }` — reviews are hidden until an admin approves
 * them, and `Review` has no avatar and no job-title column.
 */
const REVIEWS: Record<string, ReviewMock[]> = {
  "mega-box": [
    {
      id: "rv1",
      rating: 5,
      comment:
        "Ordered this for four people and there was still pizza left. The chicken was properly crisp, not the soft breading you get when it's been sitting.",
      authorName: "Nour A.",
      createdAt: "2026-07-18",
    },
    {
      id: "rv2",
      rating: 4,
      comment:
        "Good value and it arrived hot. I'd ask for extra dips next time — two isn't enough between four of us.",
      authorName: "Karim H.",
      createdAt: "2026-07-02",
    },
    {
      id: "rv3",
      rating: 5,
      comment:
        "The pizza fraid is the surprise here. I came for the chicken and now I order it for that.",
      authorName: "Mariam S.",
      createdAt: "2026-06-21",
    },
  ],
};

const FALLBACK_REVIEWS: ReviewMock[] = [
  {
    id: "rvf1",
    rating: 5,
    comment:
      "Turned up hot and the breading was still crunching by the time I got to the last piece.",
    authorName: "Omar E.",
    createdAt: "2026-07-11",
  },
  {
    id: "rvf2",
    rating: 4,
    comment: "Solid portion for the price. Delivery took a little longer than quoted.",
    authorName: "Salma R.",
    createdAt: "2026-06-29",
  },
];

/** PLACEHOLDER catalogue — prices and copy need the client's real menu. */
export const PRODUCTS: Record<string, ProductMock> = {
  "mega-box": {
    id: "prod-mega-box",
    slug: "mega-box",
    name: "Mega Box",
    categoryName: "Boxes & Offers",
    description:
      "Four pieces of chicken breaded to order, a tray of pizza fraid straight from the oven, fries, coleslaw and two dips. Built to be put in the middle of a table and argued over.",
    image: "/la-rotunda5.jpg",
    variants: [
      { id: "var-mega-regular", name: "Regular", price: 545, compareAtPrice: null, isAvailable: true },
      { id: "var-mega-family", name: "Family", price: 720, compareAtPrice: 780, isAvailable: true },
    ],
    modifierGroups: extrasFor("mega-box"),
    reviews: REVIEWS["mega-box"] ?? FALLBACK_REVIEWS,
  },
  "triple-box": {
    id: "prod-triple-box",
    slug: "triple-box",
    name: "Triple Box",
    categoryName: "Boxes & Offers",
    description:
      "Three burgers with house sauce, a mound of crinkle fries and a bucket of wings tossed while they're still hot.",
    image: "/la-rotunda4.jpeg",
    variants: [
      { id: "var-triple-regular", name: "Regular", price: 495, compareAtPrice: null, isAvailable: true },
    ],
    modifierGroups: extrasFor("triple-box"),
    reviews: FALLBACK_REVIEWS,
  },
  "weekend-box": {
    id: "prod-weekend-box",
    slug: "weekend-box",
    name: "Weekend Box",
    categoryName: "Boxes & Offers",
    description:
      "Nine pieces of broast, fries, two coleslaw, three rice cups and kaizer buns. The one people order when the whole family is in.",
    image: "/la-rotunda1.jpeg",
    variants: [
      { id: "var-weekend-regular", name: "Regular", price: 620, compareAtPrice: 690, isAvailable: true },
    ],
    modifierGroups: extrasFor("weekend-box"),
    reviews: FALLBACK_REVIEWS,
  },
  "triple-shish-crepe": {
    id: "prod-triple-shish-crepe",
    slug: "triple-shish-crepe",
    name: "Triple Shish Crepe",
    categoryName: "Boxes & Offers",
    description:
      "Three crepes rolled around grilled chicken, garlic sauce and charred peppers, wrapped tight so nothing escapes on the way over.",
    image: "/la-rotunda3.jpeg",
    variants: [
      { id: "var-crepe-regular", name: "Regular", price: 285, compareAtPrice: null, isAvailable: true },
      { id: "var-crepe-large", name: "Large", price: 340, compareAtPrice: null, isAvailable: true },
    ],
    modifierGroups: extrasFor("triple-shish-crepe"),
    reviews: FALLBACK_REVIEWS,
  },
};

export function getProductBySlug(slug: string): ProductMock | null {
  return PRODUCTS[slug] ?? null;
}

export function productSlugs(): string[] {
  return Object.keys(PRODUCTS);
}

/** Derived "from" price — min(variants[].price). Never stored on the product. */
export function priceFrom(product: ProductMock): number {
  return Math.min(...product.variants.map((variant) => variant.price));
}

export function averageRating(reviews: readonly ReviewMock[]): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
