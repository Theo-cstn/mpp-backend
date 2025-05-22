// routes/leagueRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { leagueController } from "../controllers/leagueController.ts";
import { authMiddleware } from "../middlewares/authMiddleware.ts";

const router = new Router();

// Routes pour les championnats
router
  .get("/leagues", leagueController.getAllLeagues)
  .get("/leagues/active", leagueController.getActiveLeagues)
  .get("/leagues/:id", leagueController.getLeagueById)
  .post("/leagues", authMiddleware, leagueController.createLeague)
  .put("/leagues/:id", authMiddleware, leagueController.updateLeague)
  .delete("/leagues/:id", authMiddleware, leagueController.deleteLeague);

export default router;