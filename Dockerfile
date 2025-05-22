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

# Exposer le port
EXPOSE 8000

# Health check pour Dokku (VERSION CORRIGÉE)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval 'try { const response = await fetch("http://localhost:8000/health"); if (response.ok) { console.log("Health check passed"); Deno.exit(0); } else { console.log("Health check failed"); Deno.exit(1); } } catch (error) { console.log("Health check error:", error.message); Deno.exit(1); }'

# Commande de démarrage
CMD ["deno", "run", \
     "--allow-net", \
     "--allow-read", \
     "--allow-write", \
     "--allow-env", \
     "--allow-run", \
     "back_server.ts"]