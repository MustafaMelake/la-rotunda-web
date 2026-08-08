import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout · La Rotunda",
  description: "Confirm your details and place your order.",
  robots: { index: false, follow: false },
};

/**
 * Inside the (shop) route group, so the URL stays /checkout while the page
 * inherits the storefront shell.
 *
 * Deliberately NOT auth-gated, and deliberately absent from the proxy matcher:
 * checkout supports guest orders and `placeOrder` accepts `userId: null`. Adding
 * a session guard here would break that.
 *
 * Static shell + client island, same as /cart. When the branch list becomes a
 * real Prisma read it belongs in this component — passed down as a prop, with
 * every Decimal coerced via `.toNumber()` first.
 */
export default function CheckoutPage() {
  return <CheckoutView />;
}
