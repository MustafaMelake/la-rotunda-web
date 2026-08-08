"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURATION_SLOW, fadeUp, staggerParent } from "@/lib/motion";

/**
 * ⚠️ THESE FILES DO NOT EXIST YET — the hero decor will render broken until
 * they are added. `public/images/offers/` has been created for them.
 *
 * Required manifest:
 *   hero-burger.png   transparent PNG, ~900px wide, burger angled right
 *   hero-pizza.png    transparent PNG, ~900px wide, pizza angled left
 *
 * Transparency is the point: these sit directly on the red ground with no card
 * or mask behind them, so a JPG would show its rectangle. Until the real
 * cut-outs land you can point these at any file in `public/` to see the layout
 * render — the composites there are opaque, so they will look like rectangles.
 */
/**
 * Flip to `true` once the two PNGs above are in `public/images/offers/`.
 *
 * Guard rather than optimism: both paths currently 404, and `next/image` has no
 * fallback for a missing source — it renders the browser's broken-image glyph.
 * On a flat red hero that is far more visible than simply omitting the decor,
 * which is purely ornamental and already `aria-hidden`.
 */
const DECOR_READY = false;

const DECOR = [
  {
    src: "/images/offers/hero-burger.png",
    className:
      "left-0 top-1/2 w-[15rem] -translate-x-1/4 -translate-y-1/2 lg:w-[22rem] xl:w-[26rem]",
    duration: 7.5,
    delay: 0,
  },
  {
    src: "/images/offers/hero-pizza.png",
    className:
      "right-0 top-1/2 w-[15rem] translate-x-1/4 -translate-y-1/2 lg:w-[22rem] xl:w-[26rem]",
    duration: 8.6,
    delay: 0.7,
  },
] as const;

export function OffersHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bleed-under-nav relative isolate overflow-hidden bg-primary text-white">
      {/* Decor is hidden below md: at phone widths these would crowd the
          headline rather than frame it. Purely presentational, so aria-hidden. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {(DECOR_READY ? DECOR : []).map((item) => (
          <motion.div
            key={item.src}
            className={`absolute hidden md:block ${item.className}`}
            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: item.duration,
                    delay: item.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          >
            {/* Intrinsic dimensions are unknown for a string path, so the
                aspect ratio is pinned here and the image fills it. */}
            <div className="relative aspect-square w-full">
              <Image
                src={item.src}
                alt=""
                fill
                sizes="(min-width: 1280px) 26rem, (min-width: 1024px) 22rem, 15rem"
                className="object-contain drop-shadow-2xl"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={staggerParent(0.1, 0.2)}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-3xl px-5 pb-20 pt-32 text-center sm:px-8 sm:pb-28 sm:pt-36"
      >
        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 16)}
          className="flex items-center justify-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-white" />
          Offers
        </motion.p>

        <motion.h1
          variants={fadeUp(Boolean(reduceMotion), 28, DURATION_SLOW)}
          className="font-display mt-5 text-balance text-[clamp(2.2rem,7vw,4.75rem)] leading-[0.94]"
        >
          Special deals you can&apos;t miss
        </motion.h1>

        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 22, DURATION_SLOW)}
          className="mx-auto mt-6 max-w-xl text-pretty leading-relaxed text-white/80"
        >
          Every offer below is already applied to the price you see. No codes, no
          small print — and when one ends, the menu price changes with it.
        </motion.p>

        <motion.div
          variants={fadeUp(Boolean(reduceMotion), 20)}
          className="mt-9 flex justify-center"
        >
          <Button asChild variant="onBrand" size="pillLg">
            <Link href="/menu">
              Order now
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default OffersHero;
