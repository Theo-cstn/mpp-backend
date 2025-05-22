// front_and_back/routes/adminRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { adminController } from "../controllers/adminController.ts";
import { authMiddleware, adminMiddleware } from "../middlewares/authMiddleware.ts";

const router = new Router();

router
  .get("/admin/check", authMiddleware, adminController.checkAdminAccess)
  .get("/admin/users", adminMiddleware, adminController.getAllUsers);

export default router;