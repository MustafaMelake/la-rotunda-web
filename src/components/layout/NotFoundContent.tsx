"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Drumstick, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURATION_SLOW, fadeUp, staggerParent } from "@/lib/motion";

/**
 * The animated half of the 404, split out so `app/not-found.tsx` can stay a
 * Server Component — it has to mount <Footer />, which is one, and a Client
 * Component cannot render a Server Component as anything but children.
 *
 * A drumstick rather than the pizza slice in the brief: the roundel logo is a
 * rooster and the wordmark reads "FRIED CHICKEN", so this is the icon that
 * belongs to this restaurant.
 */
export function NotFoundContent() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate flex min-h-[80svh] items-center overflow-hidden bg-brand-black text-white">
      {/* Same ray field as the pre-footer CTA and the branches header, so this
          page reads as part of the site rather than a system error screen. */}
      <div aria-hidden="true" className="sunburst absolute inset-0 -z-10" />

      <motion.div
        variants={staggerParent(0.1, 0.15)}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-2xl px-5 py-20 text-center sm:px-8"
      >
        {/* The one moving element. A slow hover, not a bounce — a bouncing icon
            on an error page reads as a toy. */}
        <motion.div
          variants={fadeUp(Boolean(reduceMotion), 20)}
          className="flex justify-center"
        >
          <motion.span
            aria-hidden="true"
            animate={reduceMotion ? undefined : { y: [0, -12, 0] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
            }
            className="grid size-20 place-items-center rounded-full bg-brand-red shadow-lg shadow-brand-red/30 sm:size-24"
          >
            <Drumstick className="size-9 text-white sm:size-11" />
          </motion.span>
        </motion.div>

        {/* `.sign-shadow` is the hard red offset from the homepage headline —
            the storefront's 3D letters mounted on tile. Reused, not reinvented. */}
        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 26, DURATION_SLOW)}
          className="font-display sign-shadow mt-8 text-[clamp(4.5rem,18vw,10rem)] leading-[0.85]"
        >
          404
        </motion.p>

        <motion.h1
          variants={fadeUp(Boolean(reduceMotion), 24)}
          className="font-display mt-4 text-balance text-[clamp(1.4rem,4.5vw,2.5rem)] leading-[1.05]"
        >
          This item isn&apos;t on our menu
        </motion.h1>

        <motion.p
          variants={fadeUp(Boolean(reduceMotion), 22)}
          className="mx-auto mt-5 max-w-md text-pretty leading-relaxed text-white/75"
        >
          The page you&apos;re looking for was moved, renamed, or devoured by a
          hungry guest.
        </motion.p>

        <motion.div
          variants={fadeUp(Boolean(reduceMotion), 20)}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <Button asChild variant="brand" size="pillLg">
            <Link href="/">
              <ArrowLeft aria-hidden="true" />
              Back to home
            </Link>
          </Button>

          <Button asChild variant="onDark" size="pillLg">
            <Link href="/menu">
              <UtensilsCrossed aria-hidden="true" />
              Explore menu
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default NotFoundContent;
