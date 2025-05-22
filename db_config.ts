// db_config.ts - Version compatible Dokku
export const dbConfig = (() => {
  // En production Dokku, utiliser DATABASE_URL fournie automatiquement
  const databaseUrl = Deno.env.get("DATABASE_URL");
  
  if (databaseUrl) {
    console.log("🔗 Utilisation de DATABASE_URL fournie par Dokku:", databaseUrl);
    
    // Parser l'URL PostgreSQL : postgres://user:pass@host:port/dbname
    try {
      const url = new URL(databaseUrl);
      const config = {
        hostname: url.hostname,
        port: parseInt(url.port || "5432"),
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Enlever le '/' du début
        tls: { enabled: false },
        poolSize: parseInt(Deno.env.get("DB_POOL_SIZE") || "10"),
      };
      
      console.log("📊 Config DB parsed:", {
        hostname: config.hostname,
        port: config.port,
        user: config.user,
        database: config.database,
        poolSize: config.poolSize
      });
      
      return config;
    } catch (error) {
      console.error("❌ Erreur parsing DATABASE_URL:", error);
      throw new Error("URL de base de données invalide");
    }
  } else {
    console.log("🏠 Utilisation de la configuration locale");
    
    // Configuration locale (développement)
    return {
      hostname: Deno.env.get("DB_HOST") || "localhost",
      port: parseInt(Deno.env.get("DB_PORT") || "5432"),
      user: Deno.env.get("DB_USER") || "postgres",
      password: Deno.env.get("DB_PASSWORD") || "postgres",
      database: Deno.env.get("DB_NAME") || "mpp",
      tls: { enabled: false },
      poolSize: parseInt(Deno.env.get("DB_POOL_SIZE") || "10"),
    };
  }
})();

// Log de la configuration (sans mot de passe)
console.log("📊 Configuration DB:", {
  hostname: dbConfig.hostname,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  poolSize: dbConfig.poolSize
});