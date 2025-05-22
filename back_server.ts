// back_server.ts - Version optimisée pour production
import { Application } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { initDatabase, closeDatabase } from "./database.ts";
import authRoutes from "./routes/authRoutes.ts";
import leagueRoutes from "./routes/leagueRoutes.ts";
import teamRoutes from "./routes/teamRoutes.ts";
import matchRoutes from "./routes/matchRoutes.ts"; 
import websocketRoutes from "./routes/websocketRoutes.ts";
import adminRoutes from "./routes/adminRoutes.ts";
import predictionRoutes from "./routes/predictionRoutes.ts";
import rankingRoutes from "./routes/rankingRoutes.ts";
import privateLeagueRoutes from "./routes/privateLeagueRoutes.ts";

// Configuration de l'environnement
const NODE_ENV = Deno.env.get("NODE_ENV") || "development";
const PORT = parseInt(Deno.env.get("PORT") || "8000");
const HOST = Deno.env.get("HOST") || "0.0.0.0";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";

console.log(`🚀 Démarrage du serveur MPP Backend`);
console.log(`Environment: ${NODE_ENV}`);
console.log(`Port: ${PORT}`);
console.log(`Frontend URL: ${FRONTEND_URL}`);

// Initialiser la base de données
try {
  await initDatabase();
  console.log("✅ Base de données initialisée");
} catch (error) {
  console.error("❌ Erreur d'initialisation de la base de données:", error);
  Deno.exit(1);
}

const app = new Application();

// Configuration CORS pour production
app.use(oakCors({
  origin: [
    FRONTEND_URL,
    // Patterns pour les domaines Polytech
    /^https:\/\/.*\.igpolytech\.fr$/,
    // Développement local
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  optionsSuccessStatus: 200,
  maxAge: 3600,
  exposedHeaders: ["set-cookie"]
}));

// Middleware de logging en production
app.use(async (ctx, next) => {
  const start = Date.now();
  
  // Configuration des cookies pour production
  if (NODE_ENV === "production") {
    ctx.cookies.secure = true;  // HTTPS uniquement
    ctx.cookies.sameSite = "strict";
  } else {
    ctx.cookies.secure = false; // HTTP en développement
  }
  
  await next();
  
  const ms = Date.now() - start;
  
  // Log simplifié en production
  if (NODE_ENV === "development") {
    console.log(`${ctx.request.method} ${ctx.request.url.pathname} - ${ms}ms`);
  }
});

// Middleware de gestion d'erreurs
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: NODE_ENV === "production" 
        ? "Erreur interne du serveur" 
        : err.message,
      ...(NODE_ENV === "development" && { stack: err.stack })
    };
  }
});

// Health check endpoint
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.status = 200;
    ctx.response.body = {
      status: "ok",
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: performance.now()
    };
    return;
  }
  await next();
});

// Routes
app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());
app.use(leagueRoutes.routes());
app.use(leagueRoutes.allowedMethods());
app.use(teamRoutes.routes());
app.use(teamRoutes.allowedMethods());
app.use(matchRoutes.routes());
app.use(matchRoutes.allowedMethods());
app.use(predictionRoutes.routes());      
app.use(predictionRoutes.allowedMethods()); 
app.use(websocketRoutes.routes());
app.use(websocketRoutes.allowedMethods());
app.use(adminRoutes.routes());
app.use(adminRoutes.allowedMethods());
app.use(rankingRoutes.routes());
app.use(rankingRoutes.allowedMethods());
app.use(privateLeagueRoutes.routes());
app.use(privateLeagueRoutes.allowedMethods());

// Gestion des routes non trouvées
app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { 
    success: false, 
    message: "Route non trouvée",
    path: ctx.request.url.pathname
  };
});

// Gestion des signaux pour arrêt propre
const abortController = new AbortController();

// Gestionnaire d'arrêt propre
async function gracefulShutdown() {
  console.log("🛑 Arrêt en cours...");
  
  abortController.abort();
  
  try {
    await closeDatabase();
    console.log("✅ Base de données fermée proprement");
  } catch (error) {
    console.error("❌ Erreur lors de la fermeture de la DB:", error);
  }
  
  console.log("👋 Serveur arrêté");
  Deno.exit(0);
}

// Écoute des signaux d'arrêt
if (Deno.build.os !== "windows") {
  Deno.addSignalListener("SIGINT", gracefulShutdown);
  Deno.addSignalListener("SIGTERM", gracefulShutdown);
}

// Démarrage du serveur
try {
  console.log(`🌐 Serveur démarré sur http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  
  await app.listen({ 
    port: PORT, 
    hostname: HOST,
    signal: abortController.signal 
  });
} catch (error) {
  if (error.name !== "AbortError") {
    console.error("❌ Erreur de démarrage du serveur:", error);
    await gracefulShutdown();
  }
}