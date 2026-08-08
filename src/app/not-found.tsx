import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { NotFoundContent } from "@/components/layout/NotFoundContent";

/**
 * Global 404.
 *
 * WHY THE CHROME IS MOUNTED HERE AND NOT INHERITED
 *
 * This file sits at the ROOT of `app/`, so it renders inside `app/layout.tsx` —
 * NOT inside `(shop)/layout.tsx`, which is where <Navbar> and <Footer> live.
 * An unmatched URL like /faq never enters the (shop) segment at all, so there is
 * no group layout to inherit from and the page would render as a bare black
 * slab. That is exactly why the stock 404 arrived with no navigation.
 *
 * A `(shop)/not-found.tsx` does not replace this one — a group boundary only
 * catches `notFound()` raised from inside that segment, never a URL that matches
 * no route. The two are complementary and both are needed:
 *
 *   this file            → unmatched URLs (/faq, /category/pizza, anything)
 *   (shop)/not-found.tsx → notFound() from inside the segment (/product/[slug])
 *
 * The split also fixes a rendering bug: routing an in-segment `notFound()` up to
 * this root boundary made Next resolve it on the client, shipping an empty
 * <body> that painted blank until hydration.
 *
 * The consequence to remember: the navbar-clearance padding normally supplied by
 * the (shop) layout's <main> is not present either, so it is applied below. If
 * `--nav-h` ever changes, it changes in globals.css and both follow.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="pt-[var(--nav-h)]">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
