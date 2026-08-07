"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { SectionHeading } from "@/components/home/SectionHeading";

/**
 * Placeholder artwork + copy. Swap for real `Category` rows once the catalog is
 * seeded — the shape below mirrors what the Prisma read will return, so the
 * only change here should be where the array comes from.
 */
const CATEGORIES = [
  {
    slug: "fried-chicken",
    name: "Fried Chicken",
    image: "https://images.unsplash.com/photo-1562967914-608f82629710",
  },
  {
    slug: "burgers",
    name: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
  },
  {
    slug: "pizza",
    name: "Pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
  },
  {
    slug: "sandwiches",
    name: "Sandwiches",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af",
  },
  {
    slug: "fries",
    name: "Fries",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877",
  },
  {
    slug: "drinks",
    name: "Drinks",
    image: "https://images.unsplash.com/photo-1437418747212-8d9709afab22",
  },
] as const;

export function Categories() {
  const reduceMotion = useReducedMotion();

  const rail: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };

  // The entrance transition lives INSIDE the `show` variant so it doesn't
  // fight the spring on the `transition` prop, which is there for the hover.
  const card: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading label="Categories" title="Explore our menu">
          Everything we cook, sorted the way you order it. Pick a category to
          see the full lineup.
        </SectionHeading>

        {/*
          One rail, two behaviours: a snapping horizontal scroller that bleeds
          to both screen edges below `lg`, and a plain 6-up grid above it. The
          negative margins must mirror the container padding at every
          breakpoint or the first card sits at the wrong inset.
          `.scrollbar-none` is the project utility in globals.css — Tailwind v4
          ships no built-in for hiding a scrollbar.
        */}
        <motion.ul
          variants={rail}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="scrollbar-none -mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:gap-5 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-x-visible lg:px-0"
        >
          {CATEGORIES.map((category) => (
            <motion.li
              key={category.slug}
              variants={card}
              whileHover={reduceMotion ? undefined : { scale: 1.05, y: -4 }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="w-32 shrink-0 snap-start sm:w-36 lg:w-auto"
            >
              <Link
                href={`/category/${category.slug}`}
                className="group block rounded-3xl outline-none"
              >
                <div className="grid aspect-square place-items-center rounded-3xl bg-muted ring-1 ring-border transition-colors duration-300 group-hover:bg-accent group-focus-visible:ring-2 group-focus-visible:ring-primary">
                  {/*
                    Every food image on this page is a circle. The brand is a
                    roundel — and a circular crop reads as a plated dish, which
                    is what makes non-transparent stock photography work here.
                  */}
                  <div className="relative size-[68%] overflow-hidden rounded-full shadow-md shadow-black/15">
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                <p className="mt-3 text-center text-sm font-semibold transition-colors group-hover:text-primary">
                  {category.name}
                </p>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

export default Categories;
