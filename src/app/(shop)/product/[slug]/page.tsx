import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductReviews } from "@/components/product/ProductReviews";
import {
  getProductBySlug,
  priceFrom,
  productSlugs,
} from "@/components/product/product-data";

/**
 * ISR, per the caching table in .claude/rules/frontend.md: this route takes no
 * per-request input and renders no per-user data, so it is cacheable. Note the
 * documented consequence — product mutations do NOT revalidate /category/[slug],
 * which is left to age out on its own 60s window. If this number is ever
 * tightened, revisit that trade rather than assuming it still holds.
 */
export const revalidate = 60;

/**
 * Any slug not returned by `generateStaticParams` 404s at the routing layer
 * instead of rendering on demand.
 *
 * This is here to fix a rendering bug, not for caching. With the default
 * (`true`), an unknown slug rendered on demand and hit `notFound()`, and Next
 * resolved that boundary on the CLIENT — the server shipped an empty <body> and
 * the page painted blank until hydration. Verified: the RSC payload named the
 * 404 component but the HTML held nothing. Flipping this to `false` makes the
 * 404 fully server-rendered, chrome and all.
 *
 * ⚠️ REVISIT WHEN THE CATALOGUE IS LIVE. With a real Prisma read,
 * `generateStaticParams` is evaluated at build time, so `false` means a product
 * added afterwards 404s until the next build — which defeats the point of the
 * 60s ISR window above. The right end state is `true` plus a catalogue where
 * nothing links to a slug that does not exist; today's mock links to eight that
 * don't, which is what makes this visible at all.
 */
export const dynamicParams = false;

/** Next 16: `params` is a Promise and must be awaited. */
type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return productSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) return { title: "Not found · La Rotunda" };

  return {
    title: `${product.name} · La Rotunda`,
    description: product.description,
    openGraph: {
      title: `${product.name} · La Rotunda`,
      description: product.description,
      images: [{ url: product.image }],
    },
  };
}

/**
 * Inside the (shop) route group, so the URL stays /product/[slug] while the page
 * inherits the storefront shell — Navbar, Footer, and the --nav-h clearance.
 *
 * Server Component. This is where the Prisma read lands, and it must carry the
 * three-level live-promotion hierarchy plus the modifier groups in ONE batched
 * query — not a findUnique per relation. Every Decimal needs `.toNumber()`
 * before it crosses into ProductInfo, which is a Client Component.
 */
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  // A missing slug is a real 404, not an empty page — the slug is minted once at
  // creation and never regenerated, so a bad one means the product is gone.
  if (!product) notFound();

  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <a href="/menu" className="underline-offset-4 hover:text-primary hover:underline">
              Menu
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{product.name}</li>
        </ol>
      </nav>

      <ProductInfo product={product} />
      <ProductReviews reviews={product.reviews} />

      {/* Structured data so the price and rating can surface in search results.
          Mirrors what is rendered — `priceFrom` is min(variants[].price). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            offers: {
              "@type": "Offer",
              priceCurrency: "EGP",
              price: priceFrom(product),
              availability: "https://schema.org/InStock",
            },
          }),
        }}
      />
    </>
  );
}
