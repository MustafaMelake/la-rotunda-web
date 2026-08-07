"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { SectionHeading } from "@/components/home/SectionHeading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Offer = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Headline saving for the sticker. Display-only — the server bills the real price. */
  save: string;
  href: string;
  image: string;
  tone: "red" | "black";
};

/**
 * Placeholder campaigns. These become live `Promotion` rows — and when they do,
 * the percentages here must be *derived* from the promotion, never typed by
 * hand, or the sticker will advertise a discount the Discount Engine won't
 * honour at checkout.
 */
const OFFERS: readonly Offer[] = [
  {
    id: "menu-25",
    eyebrow: "All branches",
    title: "25% off the whole menu",
    body: "Meals, sandwiches and buckets included. No code needed — the discount is already in the price you see.",
    save: "25%",
    href: "/offers",
    image: "https://images.unsplash.com/photo-1608039755401-742074f0548d",
    tone: "red",
  },
  {
    id: "smash-combo",
    eyebrow: "Combo deal",
    title: "Double smash, fries and a drink",
    body: "Two beef patties with house sauce, skin-on fries and something cold, for one price.",
    save: "30%",
    href: "/offers",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add",
    tone: "black",
  },
] as const;

/**
 * `className` exists for reuse across pages: this section ships with bottom
 * padding only, because on the homepage the Categories band above it supplies
 * the top gap. Any page that mounts it directly under a hero must pass its own
 * `pt-*` or the banners collide with whatever precedes them.
 */
export function SpecialOffers({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className={cn("bg-background pb-20 sm:pb-28", className)}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading label="Special Offers" title="Delicious deals you can't miss">
          Live offers, applied automatically at checkout. When one ends, the
          price on the menu changes with it.
        </SectionHeading>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {OFFERS.map((offer, index) => (
            <motion.article
              key={offer.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.55,
                delay: reduceMotion ? 0 : index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={reduceMotion ? undefined : { scale: 1.02, y: -6 }}
              className={cn(
                "group relative isolate flex min-h-[25rem] overflow-hidden rounded-[2rem] p-7 sm:p-10",
                offer.tone === "red" ? "brand-panel" : "bg-brand-black",
              )}
            >
              {/* Lifts the black banner off a flat fill without adding a hue.
                  `.corner-sheen` is declared in globals.css — see the note
                  there on keeping colour literals out of the markup. */}
              {offer.tone === "black" ? (
                <div aria-hidden="true" className="corner-sheen absolute inset-0 -z-10" />
              ) : null}

              {/* Text column clears the sticker on top, and the photo below or
                  beside it depending on breakpoint. */}
              <div className="relative z-10 flex flex-1 flex-col items-start pb-48 pr-24 sm:pb-52 sm:pr-32 lg:pb-0 lg:pr-40">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                  {offer.eyebrow}
                </p>

                <h3 className="font-display mt-3 text-balance text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.02] text-white">
                  {offer.title}
                </h3>

                <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-white/75">
                  {offer.body}
                </p>

                <Button
                  asChild
                  size="pill"
                  variant={offer.tone === "red" ? "onBrand" : "brand"}
                  className="mt-8 lg:mt-auto"
                >
                  <Link href={offer.href}>Order this deal</Link>
                </Button>
              </div>

              <SaveSticker percent={offer.save} tone={offer.tone} />

              {/* Same circular treatment as the category rail — the round crop
                  is what lets an opaque stock photo sit on a flat brand ground
                  without a visible rectangular seam. */}
              <div className="absolute -bottom-14 -right-14 size-52 overflow-hidden rounded-full ring-8 ring-white/10 sm:size-64 lg:-bottom-16 lg:-right-16 lg:size-72">
                <Image
                  src={offer.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 288px, 256px"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The scalloped "Save up to" sticker.
 *
 * Three identical rounded squares stacked at 0°/30°/60° — the overlap of their
 * corner radii produces the twelve-lobed flower edge. Cheaper and crisper at
 * any size than hand-authored SVG path data, and it scales with the container.
 */
function SaveSticker({ percent, tone }: { percent: string; tone: Offer["tone"] }) {
  const lobe = tone === "red" ? "bg-white" : "bg-brand-red";
  const ink = tone === "red" ? "text-brand-red" : "text-white";

  return (
    <div className="absolute right-5 top-5 z-20 -rotate-12 transition-transform duration-500 group-hover:-rotate-3 sm:right-8 sm:top-8">
      <div className="relative grid size-[5.5rem] place-items-center sm:size-24">
        <span aria-hidden="true" className={cn("absolute inset-0 rounded-[32%]", lobe)} />
        <span
          aria-hidden="true"
          className={cn("absolute inset-0 rotate-[30deg] rounded-[32%]", lobe)}
        />
        <span
          aria-hidden="true"
          className={cn("absolute inset-0 rotate-[60deg] rounded-[32%]", lobe)}
        />

        <span className={cn("relative text-center leading-none", ink)}>
          <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.08em]">
            Save up to
          </span>
          <span className="font-display num mt-1 block text-2xl">{percent}</span>
        </span>
      </div>
    </div>
  );
}

export default SpecialOffers;
