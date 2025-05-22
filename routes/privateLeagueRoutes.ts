// routes/privateLeagueRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { privateLeagueController } from "../controllers/privateLeagueController.ts";
import { authMiddleware } from "../middlewares/authMiddleware.ts";

const router = new Router();

// Toutes les routes nécessitent une authentification
router
  .get("/private-leagues", authMiddleware, privateLeagueController.getUserPrivateLeagues)
  .get("/private-leagues/:id", authMiddleware, privateLeagueController.getPrivateLeague)
  .post("/private-leagues", authMiddleware, privateLeagueController.createPrivateLeague)
  .post("/private-leagues/join", authMiddleware, privateLeagueController.joinPrivateLeague)
  .post("/private-leagues/:id/leave", authMiddleware, privateLeagueController.leavePrivateLeague)
  .delete("/private-leagues/:id", authMiddleware, privateLeagueController.deletePrivateLeague);

export default router;