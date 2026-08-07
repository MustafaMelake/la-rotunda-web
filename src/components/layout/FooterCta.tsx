"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The pre-footer CTA copy, split out as the footer's ONLY client island.
 *
 * <Footer> itself stays a Server Component — its plates, sunburst, wave, link
 * columns and bottom bar are all static markup with CSS hovers, and there is
 * no reason to ship them to the browser. Keep any future footer animation
 * inside this file rather than adding "use client" to the parent.
 */
export function FooterCta() {
  const reduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className="mx-auto max-w-2xl px-5 pb-36 pt-24 text-center sm:pb-48 sm:pt-32"
    >
      <motion.h2
        variants={item}
        className="font-display text-balance text-[clamp(2rem,6vw,3.75rem)] leading-[0.95] text-white"
      >
        Hungry? We&apos;re ready. Come and enjoy.
      </motion.h2>

      <motion.p
        variants={item}
        className="mx-auto mt-6 max-w-md text-pretty leading-relaxed text-white/70"
      >
        Pick your branch, build your order, and we&apos;ll have it out of the
        fryer and on its way.
      </motion.p>

      <motion.div variants={item} className="mt-9">
        <Button asChild variant="brand" size="pillLg">
          <Link href="/menu">
            Order now
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default FooterCta;
