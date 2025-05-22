// back_server.ts
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

const PORT = parseInt(Deno.env.get("PORT") || "8000");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";

// Initialiser la base de données
await initDatabase();

const app = new Application();

app.use(oakCors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
  maxAge: 3600,
  exposedHeaders: ["set-cookie"]
}));

// Logger
app.use(async (ctx, next) => {
  ctx.cookies.secure = false; // Désactiver 'secure' pour utiliser HTTP au lieu de HTTPS
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

// Gestion des erreurs
app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { success: false, message: "Route non trouvée" };
});


// Fonction pour démarrer le serveur avec ou sans HTTPS
async function startServer() {
  // Vérifier si des certificats sont fournis en arguments
  if (Deno.args.length >= 2) {
    try {
      const certFile = Deno.args[0];
      const keyFile = Deno.args[1];
      
      // Charger les certificats
      const cert = await Deno.readTextFile(certFile);
      const key = await Deno.readTextFile(keyFile);
      
      console.log(`🔒 Serveur HTTPS démarré sur https://localhost:${PORT}`);
      console.log("Certificats chargés avec succès");
      
      await app.listen({
        port: PORT,
        secure: true,
        cert,
        key,
      });
    } catch (error) {
      console.error("Erreur lors du chargement des certificats:", error);
      console.log("Démarrage en HTTP à la place...");
      await app.listen({ port: PORT });
    }
  } else {
    // ✅ MODIFIÉ : Utiliser la variable PORT au lieu de hardcodé
    console.log(`🚀 Serveur HTTP démarré sur http://localhost:${PORT}`);
    console.log(`🔗 Frontend autorisé depuis: ${FRONTEND_URL}`);
    console.log("Pour utiliser HTTPS, lancez avec : deno run ... server.ts cert.pem key.pem");
    await app.listen({ port: PORT });
  }
}

// Démarrer le serveur
startServer().catch(err => {
  console.error("Erreur de démarrage du serveur:", err);
  Deno.exit(1);
});