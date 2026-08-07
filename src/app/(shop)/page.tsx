import { AboutSection } from "@/components/home/AboutSection";
import { Categories } from "@/components/home/Categories";
import { FAQSection } from "@/components/home/FAQSection";
import { Hero } from "@/components/home/Hero";
import { SpecialOffers } from "@/components/home/SpecialOffers";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";

// Server Component by default: fetch with Prisma directly in the body — no API
// route, no client fetch, no first-paint spinner. The sections below are client
// islands only because of their entrance animation and hover motion; the page
// itself stays a Server Component and will host the catalog reads.
export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <SpecialOffers />
      <AboutSection />
      <TestimonialsSection />
      <FAQSection />
      {/* TODO(la-rotunda): featured products · branch finder. */}
    </>
  );
}
