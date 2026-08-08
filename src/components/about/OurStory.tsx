"use client";

import * as React from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

import { SectionHeading } from "@/components/home/SectionHeading";
import { DURATION_SLOW, EASE_PREMIUM, fadeUp, staggerParent } from "@/lib/motion";

/** Verified to load. Swap for the client's own kitchen photography. */
const STORY_IMAGE = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c";

const PARAGRAPHS = [
  "In 2013 there was one fryer, one counter, and a queue that formed because the chicken was good — not because anyone had heard of us.",
  "The method has not moved since. Chicken is marinated overnight and breaded by hand each morning, in every kitchen, by whoever opens up. Nothing arrives pre-coated and nothing waits under a lamp; your order goes into the oil when it lands.",
  "What changed is the number of doors. The recipe travelled, the shortcuts did not.",
] as const;

export function OurStory() {
  const reduceMotion = useReducedMotion();
  const imageWrapRef = React.useRef<HTMLDivElement>(null);

  // Always computed, applied only when motion is permitted.
  const { scrollYProgress } = useScroll({
    target: imageWrapRef,
    offset: ["start end", "end start"],
  });
  const innerY = useTransform(scrollYProgress, [0, 1], ["-9%", "9%"]);

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            variants={staggerParent(0.13)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div variants={fadeUp(Boolean(reduceMotion), 22)}>
              <SectionHeading
                align="left"
                label="Our story"
                title="Thirteen years, one recipe"
              />
            </motion.div>

            {PARAGRAPHS.map((paragraph) => (
              <motion.p
                key={paragraph.slice(0, 24)}
                variants={fadeUp(Boolean(reduceMotion), 22)}
                className="mt-5 max-w-prose text-pretty leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </motion.p>
            ))}
          </motion.div>

          {/*
            Reveal is an animated `inset()` clip-path — the frame wipes open from
            the bottom while the photo inside drifts on scroll. clip-path
            interpolates cleanly as long as both keyframes use the same shape
            function, which is why both ends are `inset()`.
          */}
          <motion.div
            ref={imageWrapRef}
            initial={{
              clipPath: reduceMotion ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)",
              opacity: reduceMotion ? 0 : 1,
            }}
            whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: DURATION_SLOW + 0.2, ease: EASE_PREMIUM }}
            className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted"
          >
            {/* Over-tall so the parallax drift never exposes an edge. */}
            <motion.div
              style={reduceMotion ? undefined : { y: innerY }}
              className="absolute inset-x-0 -inset-y-[10%]"
            >
              <Image
                src={STORY_IMAGE}
                alt=""
                fill
                sizes="(min-width: 1024px) 34rem, 90vw"
                className="object-cover"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default OurStory;
