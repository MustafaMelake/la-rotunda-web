"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Local asset from `public/` — no remotePattern needed and no third-party
 * round-trip. Chosen because it is the one creative shot on a red ground, so it
 * blends into this section's red instead of sitting on it as a rectangle.
 *
 * Heads-up: like every file in `public/`, this is a promo composite with the
 * offer headline burned into the pixels. `object-cover` crops toward the food
 * and pushes most of that text out of frame, but a clean plate shot with no
 * type in it would serve this slot far better.
 */
const HERO_IMAGE = "/la-rotunda2.jpeg";

/**
 * Positions are hardcoded, never random. `Math.random()` here would produce
 * different values on the server and the client and blow up hydration — the
 * classic way decorative particles break a page.
 */
const SPARKS = [
  { top: "14%", left: "6%", size: 10, drift: 16, duration: 7.5, delay: 0 },
  { top: "32%", left: "17%", size: 6, drift: 12, duration: 6.2, delay: 0.8 },
  { top: "68%", left: "9%", size: 8, drift: 18, duration: 8.4, delay: 0.3 },
  { top: "22%", left: "46%", size: 5, drift: 10, duration: 6.8, delay: 1.4 },
  { top: "78%", left: "38%", size: 9, drift: 14, duration: 7.9, delay: 0.6 },
  { top: "10%", left: "78%", size: 7, drift: 15, duration: 8.1, delay: 1.1 },
  { top: "60%", left: "90%", size: 11, drift: 20, duration: 9.0, delay: 0.2 },
] as const;

export function MenuHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bleed-under-nav relative isolate overflow-hidden bg-primary text-white">
      {/* Drifting specks — the reference's grease-and-sparks flourish, kept to
          white-on-red so it stays inside the brand palette. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {SPARKS.map((spark, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white/25"
            style={{
              top: spark.top,
              left: spark.left,
              width: spark.size,
              height: spark.size,
            }}
            animate={
              reduceMotion ? undefined : { y: [0, -spark.drift, 0], opacity: [0.5, 1, 0.5] }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: spark.duration,
                    delay: spark.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:grid-cols-2 lg:gap-12 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-balance text-[clamp(2.4rem,7vw,4.75rem)] leading-[0.92] text-white">
            Designed for flavor, made to impress
          </h1>
          <p className="mt-6 max-w-md text-pretty leading-relaxed text-white/80">
            Every item on this menu is cooked to order — breaded, stacked and
            boxed the moment it&apos;s rung up, never held under a lamp.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-[5/4] w-full lg:aspect-[4/3]"
        >
          {/* `.feather-mask` fades the photo's edges into the red so the plate
              reads as a cut-out. See globals.css. A string path (rather than a
              static import) carries no intrinsic dimensions, so `fill` is
              required here — the parent supplies the aspect ratio. */}
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            preload
            quality={90}
            sizes="(min-width: 1024px) 40rem, 90vw"
            className="feather-mask object-cover object-center"
          />
        </motion.div>
      </div>
    </section>
  );
}

export default MenuHero;
