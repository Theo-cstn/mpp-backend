// routes/rankingRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { rankingController } from "../controllers/rankingController.ts";

const router = new Router();

router.get("/ranking", rankingController.getGeneralRanking);

export default router;