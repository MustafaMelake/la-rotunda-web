import type { Metadata } from "next";

import { BranchesGrid } from "@/components/branches/BranchesGrid";
import { BranchesHero } from "@/components/branches/BranchesHero";

export const metadata: Metadata = {
  title: "Branches · La Rotunda",
  description:
    "Addresses, opening hours and delivery fees for every La Rotunda kitchen in Menofia.",
};

/**
 * Inside the (shop) route group, so the URL stays /branches while the page
 * inherits the storefront shell — Navbar, Footer, and the --nav-h clearance.
 *
 * Server Component. Each section owns its own container and vertical rhythm, so
 * the hero runs full-bleed under the navbar while the cards stay in the 7xl
 * measure. This is where `prisma.branch.findMany({ where: { isActive: true } })`
 * will go — `isActive` is the soft-retirement flag, so a retired branch must
 * never reach this page.
 */
export default function BranchesPage() {
  return (
    <>
      <BranchesHero />
      <BranchesGrid />
    </>
  );
}
