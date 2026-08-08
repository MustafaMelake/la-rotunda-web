"use client";

import * as React from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { Menu, ShoppingBag, ShoppingCart, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/branches", label: "Branches" },
  { href: "/offers", label: "Offers" },
  { href: "/about", label: "About" },
] as const;

/**
 * Hardcoded to mock an active cart. Replace with the distinct-line count from
 * the Zustand store once `src/lib/cart-store.ts` exists.
 *
 * Two things that mock hides and the real wiring must handle:
 *  - Render NOTHING until the persisted store has hydrated. Reading it during
 *    the first paint flashes 0 → 3, and on a statically cached shell a
 *    server-rendered count would be another visitor's cart.
 *  - The badge already handles 0 (hidden) and >99 (clamped), because a real
 *    cart reaches both and an un-clamped count blows the pill apart.
 */
// Annotated `number`, not left to infer the literal `3`: without this the
// compiler narrows it and rejects the pluralisation and clamp branches below as
// unreachable — which they are today, but will not be once this is a live count.
const CART_COUNT: number = 3;

/**
 * Floating glass navbar.
 *
 * Stays dark in BOTH scroll states on purpose. The alternative — inverting to
 * a light bar once you clear the hero — needs the bar to know what's behind it
 * at every scroll offset on every route, and it breaks the moment a page opens
 * on something other than dark artwork. A permanently dark bar is also just
 * the brand: black ground, red action.
 *
 * Height is pinned to `--nav-h` in globals.css, which is also what the (shop)
 * layout uses for clearance. Change it there, not here.
 */
export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Motion-value subscription rather than a useEffect scroll listener: the
  // read happens off the React render path and never sets state in an effect
  // body (which `react-hooks/set-state-in-effect` flags).
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock the page behind the mobile sheet.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-4 sm:px-5">
      <nav
        aria-label="Main"
        className={cn(
          "mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 rounded-full border pl-5 pr-2 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 sm:pl-7 sm:pr-3",
          scrolled || open
            ? "border-white/15 bg-black/85 shadow-xl shadow-black/40"
            : "border-white/10 bg-black/35",
        )}
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-logo shrink-0 rounded-full pb-1 text-2xl leading-none text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red sm:text-[1.7rem]"
        >
          La&nbsp;Rotunda
        </Link>

        <ul className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group relative block py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
              >
                {link.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-brand-red transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/*
            Visible at every width — it sits beside the hamburger on mobile,
            where "Order now" is hidden. Distinct icon from the CTA on purpose:
            two identical bags side by side read as one control.

            The count lives in the accessible name, and the badge itself is
            aria-hidden — otherwise a screen reader announces a bare "3" with no
            indication of what it counts.
          */}
          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            aria-label={`Cart, ${CART_COUNT} item${CART_COUNT === 1 ? "" : "s"}`}
            className="relative grid size-11 place-items-center rounded-full text-white transition duration-200 hover:scale-105 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red motion-reduce:transition-none motion-reduce:hover:scale-100"
          >
            <ShoppingCart className="size-5" />

            {CART_COUNT > 0 ? (
              <span
                aria-hidden="true"
                className="num absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-brand-red px-1 py-0.5 text-[0.65rem] font-bold leading-none text-white ring-2 ring-black/70"
              >
                {CART_COUNT > 99 ? "99+" : CART_COUNT}
              </span>
            ) : null}
          </Link>

          <Button asChild variant="brand" size="pill" className="hidden sm:inline-flex">
            <Link href="/menu">
              <ShoppingBag aria-hidden="true" />
              Order now
            </Link>
          </Button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-3xl border border-white/15 bg-black/90 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl lg:hidden"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-red"
                  >
                    {link.label}
                    <span aria-hidden="true" className="text-brand-red">
                      ★
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <Button
              asChild
              variant="brand"
              size="pill"
              className="mt-2 h-12 w-full"
              onClick={() => setOpen(false)}
            >
              <Link href="/menu">
                <ShoppingBag aria-hidden="true" />
                Order now
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
