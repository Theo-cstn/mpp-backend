// back_server.ts - Configuration CORS corrigée pour déploiement
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

// Initialiser la base de données
await initDatabase();

const app = new Application();

// Configuration CORS pour le déploiement
const PORT = parseInt(Deno.env.get("PORT") || "8000");
const isProduction = Deno.env.get("NODE_ENV") === "production";

// URLs autorisées selon l'environnement
const allowedOrigins = isProduction ? [
  "http://mpp-frontend.cluster-ig3.igpolytech.fr:3000",
  "https://mpp-frontend.cluster-ig3.igpolytech.fr:3000"
] : [
  "http://localhost:3000", 
  "http://127.0.0.1:3000"
];

console.log("🚀 Backend MPP démarrage");
console.log(`🌐 Port: ${PORT}`);
console.log(`🔧 Environment: ${isProduction ? "production" : "development"}`);
console.log(`🔗 CORS autorisé pour:`, allowedOrigins);

// Configuration CORS 
app.use(oakCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
  maxAge: 3600,
  exposedHeaders: ["set-cookie"]
}));

// Logger
app.use(async (ctx, next) => {
  ctx.cookies.secure = false; // HTTP en développement
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

// Route health check
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.body = {
      status: "ok",
      service: "mpp-backend",
      timestamp: new Date().toISOString(),
      port: PORT,
      environment: isProduction ? "production" : "development"
    };
    return;
  }
  await next();
});

// Gestion des erreurs
app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { success: false, message: "Route non trouvée" };
});

// Route temporaire pour promouvoir admin - À SUPPRIMER APRÈS USAGE
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname === "/promote-admin-secret" && ctx.request.method === "GET") {
    try {
      // Lister tous les utilisateurs
      const allUsers = await db.queryObject("SELECT id, username, role FROM users ORDER BY id");
      
      // Chercher l'utilisateur admin
      const adminUsers = await db.queryObject("SELECT id, username, role FROM users WHERE username = 'admin'");
      
      if (adminUsers.length === 0) {
        ctx.response.body = { 
          success: false, 
          message: "Utilisateur 'admin' non trouvé",
          allUsers: allUsers 
        };
      } else {
        const user = adminUsers[0];
        
        if (user.role === 'admin') {
          ctx.response.body = { 
            success: true, 
            message: "Utilisateur admin déjà administrateur!",
            user: user
          };
        } else {
          // Promouvoir en admin
          await db.execute("UPDATE users SET role = 'admin' WHERE username = 'admin'");
          
          // Vérifier
          const updated = await db.queryObject("SELECT username, role FROM users WHERE username = 'admin'");
          
          ctx.response.body = { 
            success: true, 
            message: "Utilisateur admin promu avec succès!",
            before: user,
            after: updated[0]
          };
        }
      }
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, error: error.message };
    }
    return;
  }
  await next();
});


// Démarrer le serveur
console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);

await app.listen({ port: PORT });