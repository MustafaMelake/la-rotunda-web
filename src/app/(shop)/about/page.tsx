import type { Metadata } from "next";

import { AboutHero } from "@/components/about/AboutHero";
import { OurStory } from "@/components/about/OurStory";
import { OurValues } from "@/components/about/OurValues";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";

export const metadata: Metadata = {
  title: "About · La Rotunda",
  description:
    "One fryer in Menouf, one recipe, and every branch since. The story behind La Rotunda.",
};

/**
 * Inside the (shop) route group, so the URL stays /about while the page inherits
 * the storefront shell — Navbar, Footer, and the --nav-h clearance on <main>.
 *
 * Server Component. Each section owns its own vertical rhythm and container, so
 * the hero can run full-bleed while the copy stays in the 7xl measure.
 * `TestimonialsSection` already carries `py-20 sm:py-28`, so unlike
 * `SpecialOffers` it needs no padding override when reused here.
 */
export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <OurStory />
      <OurValues />
      <TestimonialsSection />
    </>
  );
}
