/**
 * Staff console shell.
 *
 * Sidebar link-hiding is decoration only — every page and every action
 * re-enforces the role check server-side (requireAdminPage / requireAdmin).
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      {/* TODO(la-rotunda): <AdminSidebar /> */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
