// routes/predictionRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { predictionController } from "../controllers/predictionController.ts";
import { authMiddleware, adminMiddleware } from "../middlewares/authMiddleware.ts";

const router = new Router();

// Routes pour les pronostics
router
  // Routes protégées pour les utilisateurs connectés
  .post("/predictions", authMiddleware, predictionController.createPrediction)
  .put("/predictions/:id", authMiddleware, predictionController.updatePrediction)
  .get("/predictions/mine", authMiddleware, predictionController.getUserPredictions)
  
  // Routes admin
  .get("/matches/:matchId/predictions", adminMiddleware, predictionController.getMatchPredictions)
  .post("/matches/:matchId/calculate-points", adminMiddleware, predictionController.calculateMatchPoints);

export default router;