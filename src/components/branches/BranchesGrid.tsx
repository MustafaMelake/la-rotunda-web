"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bike, Clock, MapPin, Navigation, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRANCHES } from "@/lib/mock/branches";
import { fadeUp, staggerParent } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Branch rows come from `@/lib/mock/branches` — the same module the checkout fee
 * line reads. `deliveryFee` is money, and a second copy of a money value drifts
 * silently until the customer sees one figure here and another at the till.
 *
 * `address` and `phone` are `String?` in the schema, so the card survives either
 * being absent rather than assuming a string. There is deliberately NO map
 * field — no latitude, longitude or embed URL — so "Get directions" is derived
 * from `address`, and a branch without one gets no button. A real map pin needs
 * a migration, not a component change.
 */


/**
 * True when closing time lands on the following calendar day (11:00 → 03:00).
 *
 * A plain string compare is correct here *only* because the values are
 * zero-padded "HH:mm", which sorts lexicographically the same way it sorts
 * chronologically. This is display logic; the authoritative "are we open right
 * now" test belongs in a shared Africa/Cairo helper and is what `placeOrder`
 * must call. See .claude/rules/business-logic.md.
 */
function wrapsPastMidnight(openTime: string, closeTime: string): boolean {
  return closeTime < openTime;
}

/** "15:30" → "3:30 PM". Pure string work, no Date and no timezone involved. */
function formatTime(value: string): string {
  const [hourPart, minutePart] = value.split(":");
  const hour24 = Number(hourPart);
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minutePart} ${suffix}`;
}

function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function BranchesGrid() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.ul
          variants={staggerParent(0.14, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {BRANCHES.map((branch) => {
            const overnight = wrapsPastMidnight(branch.openTime, branch.closeTime);

            return (
              <motion.li
                key={branch.id}
                variants={fadeUp(Boolean(reduceMotion), 30)}
                whileHover={reduceMotion ? undefined : { y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="group relative flex flex-col overflow-hidden rounded-3xl bg-card p-7 ring-1 ring-border sm:p-8"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100"
                />

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-2xl leading-tight">
                    {branch.name}
                  </h2>

                  {/* State encoded in form as well as words: this is the
                      `isAcceptingOrders` kill switch, not the clock. */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                      branch.isAcceptingOrders
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        branch.isAcceptingOrders ? "bg-primary" : "bg-muted-foreground",
                      )}
                    />
                    {branch.isAcceptingOrders ? "Taking orders" : "Paused"}
                  </span>
                </div>

                <dl className="mt-6 flex flex-col gap-4 text-sm">
                  {branch.address ? (
                    <div className="flex gap-3">
                      <dt className="shrink-0">
                        <span className="sr-only">Address</span>
                        <MapPin aria-hidden="true" className="size-5 text-primary" />
                      </dt>
                      <dd className="text-pretty leading-relaxed text-muted-foreground">
                        {branch.address}
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <dt className="shrink-0">
                      <span className="sr-only">Opening hours</span>
                      <Clock aria-hidden="true" className="size-5 text-primary" />
                    </dt>
                    <dd className="text-muted-foreground">
                      <span className="num">
                        Daily {formatTime(branch.openTime)} –{" "}
                        {formatTime(branch.closeTime)}
                      </span>
                      {overnight ? (
                        <span className="ml-1.5 text-xs text-muted-foreground/80">
                          (closes next day)
                        </span>
                      ) : null}
                    </dd>
                  </div>

                  {branch.phone ? (
                    <div className="flex gap-3">
                      <dt className="shrink-0">
                        <span className="sr-only">Phone</span>
                        <Phone aria-hidden="true" className="size-5 text-primary" />
                      </dt>
                      <dd>
                        <a
                          href={`tel:${branch.phone.replace(/\s+/g, "")}`}
                          className="num text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          {branch.phone}
                        </a>
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <dt className="shrink-0">
                      <span className="sr-only">Delivery fee</span>
                      <Bike aria-hidden="true" className="size-5 text-primary" />
                    </dt>
                    <dd className="num text-muted-foreground">
                      Delivery EGP {branch.deliveryFee}
                    </dd>
                  </div>
                </dl>

                {/* Derived from `address`, because the schema stores no map pin.
                    No address, no button — rather than a link to nowhere. */}
                {branch.address ? (
                  <Button asChild variant="brand" size="pill" className="mt-8 self-start">
                    <a
                      href={directionsUrl(branch.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation aria-hidden="true" />
                      Get directions
                      <span className="sr-only"> to {branch.name} (opens in a new tab)</span>
                    </a>
                  </Button>
                ) : null}
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}

export default BranchesGrid;
