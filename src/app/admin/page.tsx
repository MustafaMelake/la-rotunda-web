// Per-role server-rendered data with no client-hydration path -> force-dynamic.
// (Catalog routes go the other way: `export const revalidate = 60` ISR, with
// any personalization hydrated client-side instead of server-seeded.)
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // TODO(la-rotunda): await requireDashboardAccess(); then load KPIs.
  // Revenue counts DELIVERED orders only — never "non-cancelled".
  return <h1 className="font-serif text-2xl">Dashboard</h1>;
}
