"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";

import { SectionHeading } from "@/components/home/SectionHeading";
import { Button } from "@/components/ui/button";

/**
 * ⚠️ FABRICATED REVIEWS — PLACEHOLDER ONLY. DO NOT SHIP.
 *
 * Names, quotes, ratings and portraits below are all invented, and the photos
 * are stock images of real people who have never eaten here. Publishing
 * invented endorsements attributed to named individuals is deceptive and, in
 * most jurisdictions, regulated. Replace with approved `Review` rows before
 * this page goes near production.
 *
 * The real read is:
 *   prisma.review.findMany({
 *     where: { isApproved: true },          // reviews are hidden until moderated
 *     include: { user: true, product: true },
 *     orderBy: { createdAt: "desc" },
 *   })
 *
 * Schema notes (prisma/schema.prisma):
 *   - `rating`, `comment`, `authorName` exist — `authorName` is the snapshot
 *     taken at submission, so render THAT, never `user.name`.
 *   - the portrait maps to `user.image`, which is nullable — a real
 *     implementation needs a monogram fallback.
 *   - `role` below has NO column. `User.role` is the RBAC enum
 *     (USER/ADMIN/MANAGER), not a job title. Either add a field or drop it.
 */
const TESTIMONIALS = [
  {
    id: "r1",
    name: "Nour Abdelrahman",
    role: "Orders every Thursday",
    rating: 5,
    quote:
      "I get the bucket for the whole family and it turns up hot, with the skin still crisp. Nobody argues about dinner any more. That's worth more to me than the discount.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  },
  {
    id: "r2",
    name: "Karim Hassan",
    role: "Food writer, Cairo",
    rating: 5,
    quote:
      "Most fried chicken in this city goes soft on the drive over. This doesn't — you can hear it. The pepper arrives late, which is how you know someone actually seasoned the flour.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
  },
  {
    id: "r3",
    name: "Mariam Sabry",
    role: "Regular since 2019",
    rating: 5,
    quote:
      "I moved across the city and started ordering from a different branch. The sandwich tasted identical. Staying the same everywhere is the hard part, and they have it.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
  },
] as const;

export function TestimonialsSection() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  const total = TESTIMONIALS.length;
  const current = TESTIMONIALS[index];
  const upcoming = TESTIMONIALS[(index + 1) % total];

  const step = React.useCallback(
    (direction: 1 | -1) => setIndex((i) => (i + direction + total) % total),
    [total],
  );

  const fade = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -14 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  };

  // The portrait gets scale instead of translate — text scaled mid-transition
  // goes soft, so the copy above keeps its own translate-only fade.
  const portraitFade = {
    initial: { opacity: 0, scale: reduceMotion ? 1 : 1.06 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: reduceMotion ? 1 : 0.98 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <section className="bg-primary py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-14">
          {/* Left: the reviewer, full-bleed in a rounded square. */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 26, scale: reduceMotion ? 1 : 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto aspect-square w-full max-w-[20rem] overflow-hidden rounded-3xl bg-brand-black lg:mx-0"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                {...portraitFade}
                className="absolute inset-0"
              >
                <Image
                  src={current.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20rem, 90vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Right: heading + controls on one line, then the quote. */}
          <div className="lg:grid lg:grid-cols-[1fr_auto] lg:gap-10">
            <div className="flex flex-col">
              <SectionHeading
                align="left"
                tone="onBrand"
                label="Testimonials"
                title="What our customers say"
              />

              <Quote
                aria-hidden="true"
                className="mt-8 size-10 shrink-0 fill-white/90 text-white/90"
              />

              {/* Announce the swap for anyone not watching the animation. */}
              <div aria-live="polite" className="mt-6 min-h-[13rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.blockquote key={current.id} {...fade}>
                    <p className="max-w-xl text-pretty text-lg leading-relaxed text-white/90">
                      {current.quote}
                    </p>

                    <footer className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <cite className="font-semibold not-italic">{current.name}</cite>
                      <span aria-hidden="true" className="h-5 w-px bg-white/35" />
                      <span className="text-white/75">{current.role}</span>

                      <span className="flex items-center gap-0.5" aria-label={`${current.rating} out of 5`}>
                        {Array.from({ length: current.rating }, (_, i) => (
                          <Star key={i} aria-hidden="true" className="size-4 fill-white text-white" />
                        ))}
                      </span>
                    </footer>
                  </motion.blockquote>
                </AnimatePresence>
              </div>
            </div>

            {/* Controls rail: arrows up top, the next reviewer below. */}
            <div className="mt-10 flex items-center justify-between gap-6 lg:mt-0 lg:h-full lg:flex-col lg:items-end lg:justify-between">
              <div className="flex gap-3">
                <Button
                  variant="onBrand"
                  size="icon"
                  className="size-12 rounded-full"
                  onClick={() => step(-1)}
                  aria-label="Previous review"
                >
                  <ArrowLeft className="size-5" />
                </Button>
                <Button
                  variant="onBrand"
                  size="icon"
                  className="size-12 rounded-full"
                  onClick={() => step(1)}
                  aria-label="Next review"
                >
                  <ArrowRight className="size-5" />
                </Button>
              </div>

              {/* Doubles as the pager: it shows who is next AND jumps there,
                  which is more use than an anonymous row of dots. */}
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={`Read the review from ${upcoming.name}`}
                className="group relative size-28 shrink-0 overflow-hidden rounded-3xl bg-brand-black outline-none ring-offset-4 ring-offset-primary transition-transform duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-white sm:size-32"
              >
                <Image
                  src={upcoming.image}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
