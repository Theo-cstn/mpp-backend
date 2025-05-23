# Dockerfile pour MPP Backend (Deno + PostgreSQL)
FROM denoland/deno:1.40.2

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration Deno
COPY deno.json deno.lock* ./

# Cache des dépendances
RUN deno cache --lock=deno.lock deno.json || deno cache deno.json

# Copier tout le code source
COPY . .

# Cache de l'application principale
RUN deno cache --lock=deno.lock back_server.ts || deno cache back_server.ts

# Health check pour Dokku (utilise la variable PORT de Dokku)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval 'const port = Deno.env.get("PORT") || "8000"; try { const response = await fetch(`http://localhost:${port}/health`); if (response.ok) { console.log("Health check passed"); Deno.exit(0); } else { console.log("Health check failed"); Deno.exit(1); } } catch (error) { console.log("Health check error:", error.message); Deno.exit(1); }'

# Commande de démarrage (sans port hardcodé)
CMD ["deno", "run", \
     "--allow-net", \
     "--allow-read", \
     "--allow-write", \
     "--allow-env", \
     "--allow-run", \
     "back_server.ts"]