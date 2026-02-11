import postgres from "postgres";

// Direct PostgreSQL connection for operations that need to bypass PostgREST.
// Uses Supabase's connection pooler (transaction mode) for serverless compatibility.
// Requires DATABASE_URL env var from Supabase Dashboard > Settings > Database.

let sql: ReturnType<typeof postgres> | null = null;

export function getDirectDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required. Get it from Supabase Dashboard > Settings > Database > Connection string (URI)."
    );
  }

  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Required for Supabase transaction pooler
      ssl: { rejectUnauthorized: false },
    });
  }

  return sql;
}
