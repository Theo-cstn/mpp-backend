// routes/matchRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { matchController } from "../controllers/matchController.ts";
import { authMiddleware, adminMiddleware } from "../middlewares/authMiddleware.ts";

const router = new Router();

// Routes publiques 
router
  .get("/matches", matchController.getAllMatches)
  .get("/leagues/:leagueId/matches", matchController.getMatchesByLeague)
  .get("/matches/upcoming", matchController.getUpcomingMatches)
  .get("/matches/:id", matchController.getMatchById);

// Routes protégées (admin uniquement)
router
  .post("/matches", adminMiddleware, matchController.createMatch)
  .put("/matches/:id", adminMiddleware, matchController.updateMatch)
  .put("/matches/:id/score", adminMiddleware, matchController.updateScore)
  .delete("/matches/:id", adminMiddleware, matchController.deleteMatch);

export default router;