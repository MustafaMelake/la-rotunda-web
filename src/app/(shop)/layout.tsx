/**
 * Storefront shell. This layout owns the single <main> and the navbar-clearance
 * padding — pages must NOT re-add pt-16/20 (documented double-offset hazard).
 */
export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* TODO(la-rotunda): <Navbar /> · <CartSidebar /> · <CartSyncProvider> */}
      <main className="pt-20">{children}</main>
      {/* TODO(la-rotunda): <Footer /> · <Toaster /> from sonner */}
    </>
  );
}
