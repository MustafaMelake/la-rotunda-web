import type { Metadata } from "next";

import { SpecialOffers } from "@/components/home/SpecialOffers";
import { MenuGrid } from "@/components/menu/MenuGrid";
import { MenuHero } from "@/components/menu/MenuHero";

export const metadata: Metadata = {
  title: "Menu · La Rotunda",
  description:
    "Fried chicken, burgers, pizza and sides — cooked to order at every La Rotunda branch.",
};

/**
 * Lives inside the (shop) route group, so the URL is still /menu but the page
 * inherits the storefront shell — Navbar, Footer, and the --nav-h clearance on
 * <main>. A top-level src/app/menu/page.tsx would render with no chrome at all.
 *
 * Server Component: the horizontal padding and max-width live in each section
 * so the hero can run full-bleed while the grid stays in the 7xl container.
 * This is where the Prisma catalogue read will go — `MenuGrid` takes its data
 * as a prop the moment there is a database to read from.
 */
export default function MenuPage() {
  return (
    <>
      <MenuHero />
      {/* SpecialOffers ships with bottom padding only (the homepage's Categories
          band supplies its top gap), so it needs its own pt- here. */}
      <SpecialOffers className="pt-20 sm:pt-28" />
      <MenuGrid />
    </>
  );
}
