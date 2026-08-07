"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { SectionHeading } from "@/components/home/SectionHeading";
import { Button } from "@/components/ui/button";

/**
 * Placeholder portrait. Verified to load, but pick the final frame by eye —
 * ideally the client's own shoot, served from UploadThing.
 */
const ABOUT_IMAGE = "https://images.unsplash.com/photo-1552526881-721ce8509abb";

const OPENING_HOURS = [{ days: "Every day", hours: "11:00 AM – 2:00 AM" }] as const;

/**
 * PLACEHOLDER FIGURES — every one of these needs a real number from the client
 * before launch. Publishing invented metrics on a live business site is a
 * problem, not a design detail.
 *
 * Three of the four are already derivable once the catalog and orders are
 * seeded: branches from `Branch`, menu size from `Product`, orders from
 * `Order` where status = DELIVERED (revenue and volume rules in
 * @rules/business-logic.md).
 */
const STATS = [
  { value: "8K+", label: "Dishes served monthly" },
  { value: "40+", label: "Dishes on the menu" },
  { value: "80K+", label: "Happy customers" },
  { value: "5+", label: "Branches" },
] as const;

export function AboutSection() {
  const reduceMotion = useReducedMotion();

  const statsContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  };

  const statItem: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="bg-background pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* ---------------------------------------------------------------
              Left: the arch.
              A rotunda is a round, domed building — the arch is the brand's
              own silhouette rather than borrowed decoration, and it carries
              forward the circular crops used in the category rail and offers.
              --------------------------------------------------------------- */}
          <motion.div
            initial={{
              opacity: 0,
              y: reduceMotion ? 0 : 24,
              scale: reduceMotion ? 1 : 0.96,
            }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[26rem] lg:mx-0"
          >
            <ArchStrokes />

            {/* The red ground the portrait sits against, as a concentric frame.
                Nothing clips here — the wrapper must stay overflow-visible or
                the stroke fan disappears. */}
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-t-full bg-primary"
            />

            <div className="relative aspect-[3/4] overflow-hidden rounded-t-full">
              <Image
                src={ABOUT_IMAGE}
                alt=""
                fill
                sizes="(min-width: 1024px) 26rem, 90vw"
                className="object-cover"
              />
            </div>
          </motion.div>

          {/* ---------------------------------------------------------------
              Right: the story, hours, and the action.
              --------------------------------------------------------------- */}
          <div>
            <SectionHeading
              align="left"
              label="About us"
              title="Hand-breaded every morning, fried when you order"
            >
              We have done one thing since 2013: chicken marinated overnight and
              breaded by hand at every branch. Nothing waits under a heat lamp —
              your order hits the fryer when it lands.
            </SectionHeading>

            <div className="mt-10">
              <h3 className="font-display text-lg">Opening hours</h3>
              <dl className="mt-3 space-y-1.5">
                {OPENING_HOURS.map((row) => (
                  <div key={row.days} className="flex flex-wrap gap-x-3 text-muted-foreground">
                    <dt>{row.days}</dt>
                    <dd className="num font-medium text-foreground">{row.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Button asChild variant="brand" size="pillLg" className="mt-9">
              <Link href="/branches">
                Find a branch
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            Stats. Staggered in on scroll, once.
            ----------------------------------------------------------------- */}
        <motion.dl
          variants={statsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mt-20 grid grid-cols-2 gap-x-6 gap-y-12 border-t border-border pt-14 sm:mt-24 lg:grid-cols-4"
        >
          {/* DOM order stays dt → dd so the list is a valid description list;
              `flex-col-reverse` puts the figure above its label visually. An
              sr-only <dt> duplicating the visible label would make a screen
              reader announce every stat twice. */}
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={statItem}
              className="flex flex-col-reverse gap-3 text-center"
            >
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="font-display num text-[clamp(2.5rem,6vw,4.25rem)] leading-none">
                {stat.value}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

/**
 * The stroke fan radiating from the arch crown.
 *
 * Geometry is computed, not hand-authored: the viewBox matches the arch's 3:4
 * box, so the crown centre sits at (150, 150) with radius 150, and each ray is
 * placed on that same circle. Change the arch aspect and the rays follow.
 * `overflow-visible` is load-bearing — the rays are drawn outside the viewBox.
 */
function ArchStrokes() {
  const reduceMotion = useReducedMotion();

  const fan: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05, delayChildren: 0.25 } },
  };

  // `pathLength` lets each ray draw outward from the arch crown rather than
  // just fading in — the rays read as radiating, which is the whole point.
  const ray: Variants = {
    hidden: { pathLength: reduceMotion ? 1 : 0, opacity: 0 },
    show: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  };

  const RAY_COUNT = 9;
  const SPREAD_DEG = 156;
  const CENTRE = 150;
  const INNER = 168;
  const OUTER = 190;

  const rays = Array.from({ length: RAY_COUNT }, (_, i) => {
    const deg = -SPREAD_DEG / 2 + (SPREAD_DEG / (RAY_COUNT - 1)) * i;
    const rad = (deg * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);

    return {
      x1: CENTRE + sin * INNER,
      y1: CENTRE - cos * INNER,
      x2: CENTRE + sin * OUTER,
      y2: CENTRE - cos * OUTER,
    };
  });

  return (
    <motion.svg
      viewBox="0 0 300 400"
      fill="none"
      aria-hidden="true"
      variants={fan}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-primary"
    >
      {rays.map((line, i) => (
        <motion.line
          key={i}
          variants={ray}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
    </motion.svg>
  );
}

export default AboutSection;
