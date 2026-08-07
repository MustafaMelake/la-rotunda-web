import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";

import { FooterCta } from "@/components/layout/FooterCta";

/**
 * Global storefront footer: a black CTA band that waves down into the red
 * footer proper.
 *
 * Deliberately a Server Component — every interaction here is a CSS hover, so
 * there is nothing to hydrate. Keep it that way; adding framer-motion would
 * ship the whole footer to the client for no benefit.
 */

/** Placeholder routes — most of these pages do not exist yet and will 404. */
const LINK_COLUMNS = [
  {
    heading: "Menu",
    links: [
      { label: "Full menu", href: "/menu" },
      { label: "Offers", href: "/offers" },
      { label: "Categories", href: "/shop" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Branches", href: "/branches" },
      { label: "Catering", href: "/catering" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "My orders", href: "/my-orders" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
] as const;

const SOCIALS = [
  { label: "YouTube", href: "https://youtube.com", Icon: YouTubeMark },
  { label: "X", href: "https://x.com", Icon: XMark },
  { label: "Instagram", href: "https://instagram.com", Icon: InstagramMark },
  { label: "LinkedIn", href: "https://linkedin.com", Icon: LinkedInMark },
] as const;

export function Footer() {
  // Rendered on the server, so it refreshes whenever the page is rebuilt or
  // revalidated — no hardcoded year to go stale, no hydration mismatch.
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      {/* ---------------------------------------------------------------
          Pre-footer CTA
          --------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-brand-black">
        <div aria-hidden="true" className="sunburst absolute inset-0 -z-10" />

        {/* Plates half off the edge. Round, like every other food image on the
            site — and like an actual plate. Hidden on small screens, where
            they would crowd the headline rather than frame it. */}
        <div
          aria-hidden="true"
          className="absolute -left-24 top-1/2 hidden size-72 -translate-y-1/2 overflow-hidden rounded-full md:block lg:-left-20 lg:size-96"
        >
          <Image
            src="https://images.unsplash.com/photo-1594007654729-407eedc4be65"
            alt=""
            fill
            sizes="384px"
            className="object-cover"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute -right-24 top-1/2 hidden size-72 -translate-y-1/2 overflow-hidden rounded-full md:block lg:-right-20 lg:size-96"
        >
          <Image
            src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
            alt=""
            fill
            sizes="384px"
            className="object-cover"
          />
        </div>

        <FooterCta />

        {/* The wave takes its fill from `currentColor` and the <footer> ground
            is the same `primary` token, so the seam cannot drift — including
            in dark mode, where the token shifts. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-14 w-full text-primary sm:h-24"
        >
          <path
            fill="currentColor"
            d="M0,64 C240,112 480,16 720,48 C960,80 1200,120 1440,68 L1440,120 L0,120 Z"
          />
        </svg>
      </section>

      {/* ---------------------------------------------------------------
          Main footer
          --------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Link
              href="/"
              className="font-logo inline-block rounded-full pb-1 text-4xl leading-none text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              La&nbsp;Rotunda
            </Link>

            <h3 className="font-display mt-8 text-sm">Address</h3>
            <address className="mt-3 space-y-3 not-italic text-white/75">
              <p className="flex items-start gap-2.5">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Menouf, Menofia Governorate, Egypt
              </p>
              <p>
                <a
                  href="tel:+201000000000"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  <span className="num">+20 100 000 0000</span>
                </a>
              </p>
            </address>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4"
          >
            {LINK_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h3 className="font-display text-sm">{column.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-block text-white/75 transition-all duration-200 hover:translate-x-1 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* ---------------------------------------------------------------
          Bottom bar
          --------------------------------------------------------------- */}
      <div className="border-t border-white/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-6 sm:flex-row sm:justify-between sm:px-8">
          <p className="text-sm text-white/70">
            © <span className="num">{year}</span> La Rotunda. All rights
            reserved.
          </p>

          <ul className="flex items-center gap-2">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-10 place-items-center rounded-full text-white/75 transition-all duration-200 hover:scale-110 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Icon />
                  <span className="sr-only">
                    La Rotunda on {label} (opens in a new tab)
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------
   Social marks.

   lucide-react v1 dropped every brand icon, so these are drawn here in
   lucide's own visual language (24px box, 2px stroke, round caps) to sit
   consistently beside the ArrowUpRight/MapPin/Phone used elsewhere. They are
   recognisable approximations, not the official trademarks — if you need
   pixel-exact marks, use the platforms' own brand assets or add
   `@icons-pack/react-simple-icons`.
   ------------------------------------------------------------------------- */

const markProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function YouTubeMark() {
  return (
    <svg {...markProps}>
      <rect x="2" y="5" width="20" height="14" rx="4.5" />
      <path d="m10.5 9.2 4.8 2.8-4.8 2.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XMark() {
  return (
    <svg {...markProps}>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg {...markProps}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg {...markProps}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" />
      <path d="M7 10.5V17" />
      <path d="M11 17v-4a2.5 2.5 0 0 1 5 0v4" />
      <circle cx="7" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default Footer;
