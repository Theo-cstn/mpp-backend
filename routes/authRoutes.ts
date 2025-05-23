// routes/authRoutes.ts - Version corrigée pour la redirection logout
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { authController } from "../controllers/authController.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { key } from "../controllers/authController.ts";

const router = new Router();

router
  .post("/auth/register", authController.register)
  .post("/auth/login", authController.login)
  .get("/me", async (ctx) => {
    const token = await ctx.cookies.get("token");
    if (!token) {
      ctx.response.status = 401;
      ctx.response.body = { username: null };
      return;
    }

    try {
      const payload = await verify(token, key);
      ctx.response.body = { username: payload.sub };
    } catch {
      ctx.response.status = 401;
      ctx.response.body = { username: null };
    }
  })
  .get("/logout", async (ctx) => {
    console.log("Logout request received");
    
    // Supprimer le token
    ctx.cookies.delete("token");
    
    ctx.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
      maxAge: 0,
      path: "/",
    });
    
    // 🚀 FIX: Redirection dynamique selon l'environnement
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";
    const redirectUrl = `${frontendUrl}/login.html`;
    
    ctx.response.headers.set("Location", redirectUrl);
    ctx.response.status = 302;
    
    console.log(`User logged out, redirecting to: ${redirectUrl}`);
  });

export default router;