// routes/authRoutes.ts
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
    
    ctx.cookies.delete("token");
    
    ctx.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
      maxAge: 0,
      path: "/",
    });
    
    // Rediriger vers la page de login au lieu de login.html directement
    ctx.response.headers.set("Location", "http://localhost:3000/login.html");
    ctx.response.status = 302;
    console.log("User logged out, redirecting to login page");
  });

export default router;