// The server-side session door. Every auth guard in the app lives here.
//
// TODO(la-rotunda): implement once @/lib/auth is wired.
//
//   Guard                     | On failure          | Reads role from
//   --------------------------|---------------------|---------------------------
//   getServerSession()        | returns null        | Better Auth, in cache()
//   requireAdmin()            | throws              | session payload
//   requireAdminPage()        | redirects           | session payload
//   requireDashboardAccess()  | throws              | live DB (role + branchId)
//   resolveBranchScope(...)   | throws on foreign   | —
//
//   Wrap getServerSession in React `cache()` so a request hits Better Auth once.
//   RBAC is structural, not cosmetic: hiding a sidebar link is decoration —
//   every page AND every action re-enforces. A MANAGER is pinned to their
//   branch, so spread `branchId ? { branchId } : {}` at the TOP LEVEL of every
//   order-reading `where`, or it is a cross-branch data leak.

export {};
