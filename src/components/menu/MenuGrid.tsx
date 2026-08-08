"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Mock shapes mirroring the Prisma models this grid will read from.
 *
 * `priceFrom` is deliberately NOT called `price`: per the charter, `Product`
 * has no price column at all. Price lives only on `ProductVariant`, and a
 * card's display price is the derived `min(variants[].price)`. When this goes
 * live the server computes that and calls `.toNumber()` on the Decimal before
 * it crosses the RSC boundary — a raw Prisma Decimal will not serialise.
 */
type MenuCategory = {
  id: string;
  name: string;
};

type MenuProduct = {
  id: string;
  /** Minted once at creation, never regenerated on rename — /product/[slug]. */
  slug: string;
  name: string;
  description: string;
  /** EGP, already 2-dp. Derived from variants, never stored on the product. */
  priceFrom: number;
  image: string;
  categoryId: string;
};

const CATEGORIES: readonly MenuCategory[] = [
  { id: "all", name: "All items" },
  { id: "boxes", name: "Boxes & Offers" },
  { id: "fried-chicken", name: "Fried Chicken" },
  { id: "burgers", name: "Burgers" },
  { id: "pizza", name: "Pizza" },
  { id: "sandwiches", name: "Sandwiches" },
  { id: "fries", name: "Fries" },
  { id: "drinks", name: "Drinks" },
] as const;

/**
 * PLACEHOLDER catalogue — prices are invented and need the client's real menu.
 *
 * Two tiers of imagery here, and the difference matters:
 *
 *  - The `boxes` items point at real La Rotunda photography in `public/`. Their
 *    names and descriptions are read off those photos, so card and image agree.
 *  - Everything below them is stock. Every one of those URLs was checked for a
 *    200 before it shipped, but they are generic food, not this kitchen's.
 *
 * Note the `public/` files are all promo composites with offer headlines burned
 * into the pixels, which is why they are only used at card size for the combo
 * they actually show. Pointing a single-item card ("Skin-On Fries") at one of
 * them would put a poster reading "4 قطع دجاج + بيتزا فرايد" under the wrong
 * label and price. Single-item shots are the gap to fill.
 */
const PRODUCTS: readonly MenuProduct[] = [
  {
    id: "b1",
    slug: "mega-box",
    name: "Mega Box",
    description:
      "Four pieces of chicken with a pizza fraid tray, fries, coleslaw and two dips.",
    priceFrom: 545,
    image: "/la-rotunda5.jpg",
    categoryId: "boxes",
  },
  {
    id: "b2",
    slug: "triple-box",
    name: "Triple Box",
    description: "Three burgers, crinkle fries and a bucket of saucy wings.",
    priceFrom: 495,
    image: "/la-rotunda4.jpeg",
    categoryId: "boxes",
  },
  {
    id: "b3",
    slug: "weekend-box",
    name: "Weekend Box",
    description:
      "Nine pieces of broast, fries, two coleslaw, three rice cups and kaizer buns.",
    priceFrom: 620,
    image: "/la-rotunda1.jpeg",
    categoryId: "boxes",
  },
  {
    id: "b4",
    slug: "triple-shish-crepe",
    name: "Triple Shish Crepe",
    description:
      "Three crepes rolled with grilled chicken, garlic sauce and peppers.",
    priceFrom: 285,
    image: "/la-rotunda3.jpeg",
    categoryId: "boxes",
  },
  {
    id: "p1",
    slug: "rotunda-bucket",
    name: "Rotunda Bucket",
    description: "Eight pieces, hand-breaded, original or hot.",
    priceFrom: 420,
    image: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc",
    categoryId: "fried-chicken",
  },
  {
    id: "p2",
    slug: "chicken-strips",
    name: "Chicken Strips",
    description: "Five strips with your choice of dip.",
    priceFrom: 185,
    image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2",
    categoryId: "fried-chicken",
  },
  {
    id: "p3",
    slug: "classic-beef-burger",
    name: "Classic Beef Burger",
    description: "Single smashed patty, cheese, pickles, house sauce.",
    priceFrom: 165,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    categoryId: "burgers",
  },
  {
    id: "p4",
    slug: "double-smash-burger",
    name: "Double Smash Burger",
    description: "Two patties, double cheese, grilled onions.",
    priceFrom: 245,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349",
    categoryId: "burgers",
  },
  {
    id: "p5",
    slug: "pepperoni-pizza",
    name: "Pepperoni Pizza",
    description: "Stone-baked, mozzarella, cured pepperoni.",
    priceFrom: 245,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    categoryId: "pizza",
  },
  {
    id: "p6",
    slug: "margherita-pizza",
    name: "Margherita Pizza",
    description: "Tomato, basil and a lot of mozzarella.",
    priceFrom: 210,
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
    categoryId: "pizza",
  },
  {
    id: "p7",
    slug: "crispy-chicken-sandwich",
    name: "Crispy Chicken Sandwich",
    description: "Buttermilk fillet, slaw, pickles, brioche.",
    priceFrom: 155,
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af",
    categoryId: "sandwiches",
  },
  {
    id: "p8",
    slug: "grilled-chicken-wrap",
    name: "Grilled Chicken Wrap",
    description: "Charred chicken, garlic sauce, warm flatbread.",
    priceFrom: 135,
    image: "https://images.unsplash.com/photo-1509722747041-616f39b57569",
    categoryId: "sandwiches",
  },
  {
    id: "p9",
    slug: "skin-on-fries",
    name: "Skin-On Fries",
    description: "Cut fresh daily, salted straight out of the fryer.",
    priceFrom: 55,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877",
    categoryId: "fries",
  },
  {
    id: "p10",
    slug: "loaded-fries",
    name: "Loaded Fries",
    description: "Cheese sauce, shredded chicken, jalapeños.",
    priceFrom: 95,
    image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d",
    categoryId: "fries",
  },
  {
    id: "p11",
    slug: "fresh-lemonade",
    name: "Fresh Lemonade",
    description: "Pressed to order, mint optional.",
    priceFrom: 45,
    image: "https://images.unsplash.com/photo-1437418747212-8d9709afab22",
    categoryId: "drinks",
  },
  {
    id: "p12",
    slug: "soft-drinks",
    name: "Soft Drinks",
    description: "Chilled cans, all the usual suspects.",
    priceFrom: 25,
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e",
    categoryId: "drinks",
  },
] as const;

export function MenuGrid() {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = React.useState<string>("all");

  const visible =
    activeId === "all"
      ? PRODUCTS
      : PRODUCTS.filter((product) => product.categoryId === activeId);

  const grid: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.055 } },
  };

  // Entrance transition sits inside `show` so it doesn't collide with the
  // spring on the `transition` prop, which drives the hover.
  const card: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="bg-background pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Filter chips. These toggle a filter rather than swapping panels, so
            they are buttons with aria-pressed — not a role="tablist", which
            would promise arrow-key navigation this doesn't implement. */}
        <div
          role="group"
          aria-label="Filter menu by category"
          className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:px-0"
        >
          {CATEGORIES.map((category) => {
            const isActive = category.id === activeId;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveId(category.id)}
                aria-pressed={isActive}
                className={cn(
                  "shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-border text-foreground hover:border-primary hover:text-primary",
                )}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="sr-only">
          Showing {visible.length}{" "}
          {visible.length === 1 ? "item" : "items"}.
        </p>

        {visible.length === 0 ? (
          <p className="mt-14 text-muted-foreground">
            Nothing in this category yet. Try another one.
          </p>
        ) : (
          /* Keyed on the filter so the grid re-mounts and re-staggers on every
             change — cheaper and steadier than animating a layout shuffle. */
          <motion.ul
            key={activeId}
            variants={grid}
            initial="hidden"
            animate="show"
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((product) => (
              <motion.li
                key={product.id}
                variants={card}
                whileHover={reduceMotion ? undefined : { scale: 1.02, y: -6 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <Image
                      src={product.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex flex-1 flex-col bg-primary p-5 text-white">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-lg leading-tight">
                        {product.name}
                      </h3>
                      <span className="num shrink-0 font-semibold">
                        EGP {product.priceFrom}
                      </span>
                    </div>
                    <p className="mt-2 text-pretty text-sm leading-relaxed text-white/75">
                      {product.description}
                    </p>
                  </div>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}

export default MenuGrid;
