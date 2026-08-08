"use client";

import * as React from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

import {
  DURATION_SLOW,
  EASE_PREMIUM,
  fadeUp,
  staggerParent,
  wordReveal,
} from "@/lib/motion";

/** Verified to load. Swap for the client's own interior shot. */
const HERO_IMAGE = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0";

/**
 * Split on spaces rather than characters. Per-character splitting is the flashier
 * demo but it shreds the accessibility tree — a screen reader announces the
 * heading letter by letter. Word-level keeps real text nodes and real spaces.
 */
const HEADING_WORDS = "One fryer. One recipe. Every branch.".split(" ");

export function AboutHero() {
  const reduceMotion = useReducedMotion();
  const sectionRef = React.useRef<HTMLElement>(null);

  // Hooks must run unconditionally, so the scroll values are always computed
  // and only *applied* when motion is allowed (see the `style` props below).
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);

  return (
    <section
      ref={sectionRef}
      className="bleed-under-nav relative isolate flex min-h-[100svh] items-end overflow-hidden bg-brand-black"
    >
      {/* Parallax and the mount scale are on SEPARATE elements on purpose: the
          outer one owns `y` from a scroll MotionValue, the inner one owns the
          one-shot `scale`. Driving both on a single node makes the two fight. */}
      <motion.div
        style={reduceMotion ? undefined : { y: imageY }}
        className="absolute inset-0 -z-10"
      >
        <motion.div
          initial={{ scale: reduceMotion ? 1 : 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.9, ease: EASE_PREMIUM }}
          className="absolute inset-0"
        >
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            // Next 16: `priority` is deprecated in favour of `preload`.
            preload
            quality={90}
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>
      </motion.div>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/75 to-black/40"
      />

      <motion.div
        style={reduceMotion ? undefined : { y: copyY }}
        variants={staggerParent(0.09, 0.25)}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-7xl px-5 pb-20 pt-32 sm:px-8 sm:pb-28"
      >
        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 18)}
          className="flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/65"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-brand-red" />
          About La Rotunda · Est. 2013
        </motion.p>

        {/*
          Each word sits in its own clipping box and rises into view. The literal
          space between the boxes is a real text node, so the heading still reads
          as one sentence to assistive tech.

          The server renders the words already pushed down by 110%, which means
          that without JS they stay clipped and the h1 is invisible forever. This
          fallback un-shifts them when scripting is off, so the headline
          degrades to plain static text instead of vanishing.
        */}
        <noscript>
          <style>{`.word-reveal span{transform:none!important}`}</style>
        </noscript>

        <motion.h1
          variants={staggerParent(0.07)}
          className="word-reveal font-display mt-6 max-w-[22ch] text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.9] text-white"
        >
          {HEADING_WORDS.map((word, i) => (
            <React.Fragment key={`${word}-${i}`}>
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  variants={wordReveal(Boolean(reduceMotion))}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>{" "}
            </React.Fragment>
          ))}
        </motion.h1>

        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 24, DURATION_SLOW)}
          className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-white/75"
        >
          We started in Menouf with a single fryer and a recipe we refused to
          change. Everything since has just been more branches.
        </motion.p>
      </motion.div>
    </section>
  );
}

export default AboutHero;
