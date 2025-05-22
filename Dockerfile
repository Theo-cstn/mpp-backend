# Dockerfile pour MPP Backend (Deno + PostgreSQL)
FROM denoland/deno:1.40.2

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration Deno
COPY deno.json deno.lock* ./

# Cache des dépendances
RUN deno cache --lock=deno.lock deno.json

# Copier tout le code source
COPY . .

# Cache de l'application principale
RUN deno cache --lock=deno.lock back_server.ts

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "back_server.ts"]