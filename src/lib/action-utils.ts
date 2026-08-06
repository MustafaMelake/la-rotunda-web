// Shared Server-Action helpers. Deliberately NOT "use server": a "use server"
// file may only export async functions, so plain utilities live here and are
// imported BY action files.
//
// TODO(la-rotunda): implement
//   ensureAdmin()        -> { error } | null      (envelope, so the UI toasts)
//   ensureAdminSession() -> same gate, returns the session
//   prismaErrorCode(err) -> "P2002" | "P2003" | "P2025" | undefined
//
// This module is server-only by dependency (its gates read request headers),
// so a "use client" component must import slugify from @/lib/utils instead —
// importing it from here pulls next/headers into the client bundle.

export {};
