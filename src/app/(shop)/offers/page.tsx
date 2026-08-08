import type { Metadata } from "next";

import { SpecialOffers } from "@/components/home/SpecialOffers";
import { OffersHero } from "@/components/offers/OffersHero";
import { TodaysSpecial } from "@/components/offers/TodaysSpecial";

export const metadata: Metadata = {
  title: "Offers · La Rotunda",
  description:
    "Live deals across the La Rotunda menu — already applied to the price you see, no codes needed.",
};

/**
 * Inside the (shop) route group, so the URL stays /offers while the page
 * inherits the storefront shell — Navbar, Footer, and the --nav-h clearance.
 *
 * Section order matters for the seam at the bottom: TodaysSpecial ends in a
 * black arch that has to land directly against the Footer's black CTA band.
 * Anything inserted between them breaks that transition.
 */
export default function OffersPage() {
  return (
    <>
      <OffersHero />
      {/* SpecialOffers ships with bottom padding only — the homepage's Categories
          band supplies its top gap — so it needs its own pt- here. */}
      <SpecialOffers className="pt-20 sm:pt-28" />
      <TodaysSpecial />
    </>
  );
}
