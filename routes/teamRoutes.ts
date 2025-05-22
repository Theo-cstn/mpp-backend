// routes/teamRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { teamController } from "../controllers/teamController.ts";
import { authMiddleware } from "../middlewares/authMiddleware.ts";

const router = new Router();

// Routes pour les équipes
router
  .get("/teams", teamController.getAllTeams)
  .get("/leagues/:leagueId/teams", teamController.getTeamsByLeague)
  .get("/teams/:id", teamController.getTeamById)
  .post("/teams", authMiddleware, teamController.createTeam)
  .put("/teams/:id", authMiddleware, teamController.updateTeam)
  .delete("/teams/:id", authMiddleware, teamController.deleteTeam);

export default router;