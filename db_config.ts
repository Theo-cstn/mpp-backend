// db_config.ts - Configuration PostgreSQL pour production
import { parse } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// Charger les variables d'environnement
let env: Record<string, string> = {};
try {
  env = await parse(await Deno.readTextFile(".env"));
} catch {
  // Fichier .env optionnel, utiliser les variables d'environnement système
}

// Configuration pour production avec Dokku
export const dbConfig = {
  // Dokku injecte automatiquement DATABASE_URL
  // Format: postgres://user:password@host:port/database
  database_url: Deno.env.get("DATABASE_URL"),
  
  // Configuration de fallback
  hostname: Deno.env.get("DB_HOST") || env.DB_HOST || "localhost",
  port: parseInt(Deno.env.get("DB_PORT") || env.DB_PORT || "5432"),
  user: Deno.env.get("DB_USER") || env.DB_USER || "postgres", 
  password: Deno.env.get("DB_PASSWORD") || env.DB_PASSWORD || "postgres",
  database: Deno.env.get("DB_NAME") || env.DB_NAME || "mpp",
  
  // Configuration SSL pour production
  tls: {
    enabled: Deno.env.get("NODE_ENV") === "production",
    enforce: false,
    caCertificates: []
  },
  
  // Pool de connexions
  poolSize: parseInt(Deno.env.get("DB_POOL_SIZE") || env.DB_POOL_SIZE || "10"),
  
  // Timeouts
  connection: {
    attempts: 3,
    delay: 1000
  }
};

// Configuration spéciale pour Dokku PostgreSQL
if (dbConfig.database_url) {
  console.log("✅ Utilisation de DATABASE_URL fournie par Dokku");
} else {
  console.log("⚠️ DATABASE_URL non trouvée, utilisation de la configuration manuelle");
}