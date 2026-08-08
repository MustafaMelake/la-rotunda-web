import { NotFoundContent } from "@/components/layout/NotFoundContent";

/**
 * 404 boundary for the (shop) segment — this is what `notFound()` inside
 * /product/[slug] resolves to.
 *
 * Without it, that call walks all the way up to the root `app/not-found.tsx`,
 * and Next resolves that boundary on the CLIENT: the server ships an empty
 * <body> and the page paints blank until JS hydrates. Verified — the RSC payload
 * named the component but the HTML held nothing. A boundary inside the segment
 * renders server-side instead.
 *
 * Content only, no chrome: `(shop)/layout.tsx` already wraps this in <Navbar>,
 * <main> with the --nav-h clearance, and <Footer>. Mounting them again here
 * would render two navbars.
 */
export default function ShopNotFound() {
  return <NotFoundContent />;
}
