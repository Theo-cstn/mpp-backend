// db_config.ts - Configuration simplifiée sans SSL
export const dbConfig = {
    hostname: Deno.env.get("DB_HOST") || "localhost",
    port: parseInt(Deno.env.get("DB_PORT") || "5432"),
    user: Deno.env.get("DB_USER") || "postgres",
    password: Deno.env.get("DB_PASSWORD") || "postgres",
    database: Deno.env.get("DB_NAME") || "mpp",
    tls: { enabled: false }, // Désactiver explicitement SSL
    poolSize: parseInt(Deno.env.get("DB_POOL_SIZE") || "10"),
  };