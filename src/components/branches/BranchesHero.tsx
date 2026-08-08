"use client";

import { motion, useReducedMotion } from "framer-motion";

import { DURATION_SLOW, fadeUp, staggerParent } from "@/lib/motion";

export function BranchesHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bleed-under-nav relative isolate overflow-hidden bg-brand-black text-white">
      {/* Same conic ray field as the pre-footer CTA, so the two dark bands on
          the site read as one family. Utility lives in globals.css. */}
      <div aria-hidden="true" className="sunburst absolute inset-0 -z-10" />

      <motion.div
        variants={staggerParent(0.1, 0.15)}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36"
      >
        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 16)}
          className="flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/65"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-brand-red" />
          Branches
        </motion.p>

        <motion.h1
          variants={fadeUp(Boolean(reduceMotion), 28, DURATION_SLOW)}
          className="font-display mt-5 max-w-[20ch] text-balance text-[clamp(2.2rem,7vw,4.75rem)] leading-[0.92]"
        >
          Find your nearest La Rotunda
        </motion.h1>

        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 22, DURATION_SLOW)}
          className="mt-6 max-w-xl text-pretty leading-relaxed text-white/75"
        >
          Every kitchen runs the same recipe and the same hours. Pick the one
          closest to you — delivery fees are set per branch, so the nearer you
          are, the less you pay to get it.
        </motion.p>
      </motion.div>
    </section>
  );
}

export default BranchesHero;
