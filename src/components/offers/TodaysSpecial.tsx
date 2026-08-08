"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURATION_SLOW, EASE_PREMIUM, fadeUp, staggerParent } from "@/lib/motion";

/**
 * ⚠️ DOES NOT EXIST YET — renders broken until added. Manifest:
 *   special-wings.jpg   standard JPG, ~1600x1200, close crop on the wings
 *
 * Unlike the hero decor this one sits inside a clipped card, so a plain JPG is
 * correct — no transparency needed.
 */
const SPECIAL_IMAGE = "/images/offers/special-wings.jpg";

/**
 * Flip to `true` once `special-wings.jpg` exists. Until then the card renders as
 * a single full-width red panel — which still reads as a deliberate promo block,
 * where a 404'd `next/image` would show a broken-image glyph inside it.
 */
const SPECIAL_IMAGE_READY = false;

export function TodaysSpecial() {
  const reduceMotion = useReducedMotion();

  return (
    /*
      `isolate` + `overflow-hidden` keep the oversized arch from escaping and
      adding a horizontal scrollbar. No bottom padding: the arch IS the bottom
      of this section, and it has to finish flush against the footer.
    */
    <section className="relative isolate overflow-hidden bg-background pt-20 sm:pt-28">
      {/*
        The seam. This arch is `bg-brand-black` because the Footer's topmost band
        is `bg-brand-black` too (see Footer.tsx) — black meets black at the
        section boundary and the curve reads as one continuous shape flowing into
        the footer. If the footer's first band is ever recoloured, THIS must move
        with it or a hard line appears across the page.

        Geometry: the inner element is deliberately wider than the viewport so
        only the shallow centre of the ellipse is visible. A 100%-wide dome would
        curve far too steeply on a wide screen.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-[clamp(7rem,20vw,17rem)] overflow-hidden"
      >
        <div className="absolute left-1/2 h-full w-[180%] -translate-x-1/2 rounded-t-[50%] bg-brand-black" />
      </div>

      <motion.div
        variants={staggerParent(0.11, 0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto max-w-7xl px-5 sm:px-8"
      >
        <motion.header
          variants={fadeUp(Boolean(reduceMotion), 20)}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3"
        >
          <h2 className="font-display text-[clamp(1.6rem,4.5vw,2.75rem)] leading-none">
            Today&apos;s special
          </h2>
          <span className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground">
            Limited time
          </span>
        </motion.header>

        <motion.article
          variants={fadeUp(Boolean(reduceMotion), 34, DURATION_SLOW)}
          whileHover={reduceMotion ? undefined : { scale: 1.008 }}
          transition={{ duration: 0.4, ease: EASE_PREMIUM }}
          className="relative mt-12 overflow-hidden rounded-[2rem] bg-primary text-white"
        >
          {/* Image is absolutely placed on lg so it reaches the card's own edges;
              below lg it stacks under the copy as a normal band. */}
          {SPECIAL_IMAGE_READY ? (
            <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-1/2">
              <Image
                src={SPECIAL_IMAGE}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              {/* Softens the vertical seam where photo meets flat red on lg. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 hidden bg-gradient-to-r from-primary via-primary/25 to-transparent lg:block"
              />
            </div>
          ) : null}

          <div
            className={
              SPECIAL_IMAGE_READY
                ? "relative p-7 sm:p-10 lg:w-1/2 lg:py-16 lg:pr-8"
                : "relative p-7 sm:p-10 lg:py-16"
            }
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Limited time
            </p>

            <h3 className="font-display mt-4 text-balance text-[clamp(1.7rem,4vw,2.6rem)] leading-[1.02]">
              BBQ chicken wings
            </h3>

            <p className="mt-4 max-w-md text-pretty leading-relaxed text-white/80">
              Smoky, sticky and fried to order, with a pot of dipping sauce on
              the side. On the menu this week only.
            </p>

            <Button asChild variant="onBrand" size="pillLg" className="mt-8">
              <Link href="/menu">
                Order now
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.article>
      </motion.div>

      {/* Clears the arch so the card never sits on top of the curve's crown.
          Matches the arch height, minus the overlap the design wants. */}
      <div aria-hidden="true" className="h-[clamp(4rem,13vw,11rem)]" />
    </section>
  );
}

export default TodaysSpecial;
