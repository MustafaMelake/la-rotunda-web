import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-only connection (migrate deploy / studio / db push). Prefer the DIRECT
    // (non-pooled) URL so migrations run over a real session connection — the
    // pooler can't hold the advisory lock or run the DDL `migrate deploy` needs.
    // The app RUNTIME stays on the pooled DATABASE_URL via the pg driver adapter
    // in src/lib/prisma.ts. That split is intentional.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
