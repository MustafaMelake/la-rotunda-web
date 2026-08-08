import type { Metadata } from "next";

import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Your cart · La Rotunda",
  description: "Review your order before checkout.",
  // The cart is personal; keep it out of search results.
  robots: { index: false, follow: false },
};

/**
 * Inside the (shop) route group, so the URL stays /cart while the page inherits
 * the storefront shell — Navbar, Footer, and the --nav-h clearance.
 *
 * The page itself is a static shell and the cart is a client island. That is the
 * charter's shape for personalised UI: a cached shell with a client store keyed
 * by user, never per-user state server-rendered into cacheable HTML.
 */
export default function CartPage() {
  return <CartView />;
}
