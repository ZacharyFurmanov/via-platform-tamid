import type { Config } from "drizzle-kit";

// Migrations for the transactional core. Generate + apply with:
//   npx drizzle-kit generate   (create SQL from schema changes)
//   npx drizzle-kit push       (apply directly to the database)
// Requires DATABASE_URL in the environment (e.g. `node --env-file=.env.local`).
export default {
 schema: "./app/lib/db/schema.ts",
 out: "./drizzle",
 dialect: "postgresql",
 dbCredentials: { url: process.env.DATABASE_URL || process.env.POSTGRES_URL || "" },
} satisfies Config;
