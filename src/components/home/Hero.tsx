"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";

/**
 * Placeholder food photography. Swap for the client's shoot (via UploadThing)
 * and drop the `images.unsplash.com` remotePattern from next.config.ts.
 */
const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=2400&q=80";

/** Ticker copy. Kept short — long phrases read as a blur at marquee speed. */
const TICKER_PHRASES = [
  "Fried Chicken",
  "Handcrafted Burgers",
  "Neapolitan Pizza",
  "Eat, Drink, Enjoy",
] as const;

type HeroProps = {
  /** Override the background photograph. */
  imageSrc?: string;
  /** Describe the photo, or leave empty to mark it decorative. */
  imageAlt?: string;
};

export function Hero({
  imageSrc = DEFAULT_HERO_IMAGE,
  imageAlt = "",
}: HeroProps) {
  const reduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.085, delayChildren: 0.12 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 26 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="bleed-under-nav relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-brand-black">
      {/* A slow settle out of a slight over-scale. One gesture on load, not a
          loop — an endlessly drifting hero reads as a screensaver. */}
      <motion.div
        initial={{ scale: reduceMotion ? 1 : 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 -z-10"
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          // Next 16: `priority` is deprecated — `preload` is the replacement.
          preload
          quality={90}
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      {/* Two scrims, not one: the vertical pass seats the ticker and lifts the
          copy off the plate; the horizontal pass keeps the left column legible
          without greying out the food on the right. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/65 to-black/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/45 to-transparent"
      />

      <div className="flex flex-1 items-end">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-7xl px-5 pb-14 pt-24 sm:px-8 sm:pb-20"
        >
          <motion.p
            variants={item}
            className="flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70"
          >
            <span aria-hidden="true" className="text-brand-red">
              ★
            </span>
            Fried fresh to order · Since 2013
          </motion.p>

          <motion.h1
            variants={item}
            className="font-display sign-shadow mt-5 max-w-[16ch] text-[clamp(2.6rem,8.6vw,7rem)] leading-[0.88] text-white"
          >
            Chicken that
            <br />
            tells a story
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-white/75 sm:text-lg"
          >
            Hand-breaded chicken, smash burgers and stone-baked pizza — cooked
            to order and sent out hot, from every branch.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap gap-3">
            <Button asChild variant="brand" size="pillLg">
              <Link href="/menu">Order now</Link>
            </Button>
            <Button asChild variant="onDark" size="pillLg">
              <Link href="/menu">View menu</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <Ticker reduceMotion={Boolean(reduceMotion)} />
    </section>
  );
}

/**
 * Infinite marquee welded to the hero's bottom edge.
 *
 * Seamlessness depends on the geometry: two identical blocks, each carrying its
 * own trailing gap (`pr-12`) and NO gap on the flex parent, so translating -50%
 * lands exactly one block over and the loop has no visible seam. Adding
 * `gap-x-*` to the parent is what breaks this.
 */
function Ticker({ reduceMotion }: { reduceMotion: boolean }) {
  const block = (
    <div className="flex shrink-0 items-center gap-x-12 pr-12" aria-hidden="true">
      {TICKER_PHRASES.map((phrase) => (
        <span key={phrase} className="flex items-center gap-x-12">
          <span className="font-display text-sm text-white sm:text-base">
            {phrase}
          </span>
          <span className="text-white/55">★</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="brand-panel relative overflow-hidden border-y border-black/25 py-3.5">
      {/* One readable copy for assistive tech; the visual track is aria-hidden. */}
      <span className="sr-only">
        {TICKER_PHRASES.join(". ")}.
      </span>

      <motion.div
        className="flex w-max"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 26, ease: "linear", repeat: Infinity }
        }
      >
        {block}
        {block}
      </motion.div>
    </div>
  );
}

export default Hero;
