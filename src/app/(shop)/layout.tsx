import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

/**
 * Storefront shell. This layout owns the single <main> and the navbar-clearance
 * padding — pages must NOT re-add pt-16/20 (documented double-offset hazard).
 *
 * The clearance is the `--nav-h` token from globals.css, which the Navbar sizes
 * itself from too. A full-bleed section that needs to run under the navbar
 * (the homepage hero) opts out with `.bleed-under-nav` rather than fighting
 * this padding with an ad-hoc negative margin.
 *
 * <Navbar> and <Footer> live HERE and not in the root layout: the root layout
 * also wraps /admin, and the staff console must not inherit a storefront
 * chrome ("Order now", social links, marketing CTA).
 */
export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      {/* TODO(la-rotunda): <CartSidebar /> · <CartSyncProvider> */}
      <main className="pt-[var(--nav-h)]">{children}</main>
      <Footer />
      {/* TODO(la-rotunda): <Toaster /> from sonner */}
    </>
  );
}
