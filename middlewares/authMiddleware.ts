// middlewares/authMiddleware.ts
import { Context, Next } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { key } from "../controllers/authController.ts";

export async function authMiddleware(ctx: Context, next: Next) {
  try {
    // Vérifier d'abord le cookie
    let token = await ctx.cookies.get("token");
    
    // Si pas de cookie, vérifier l'en-tête Authorization
    if (!token) {
      const authHeader = ctx.request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }
    
    if (!token) {
      ctx.response.status = 401;
      ctx.response.body = { success: false, message: "Authentification requise" };
      return;
    }
    
    // Vérifier le JWT
    const payload = await verify(token, key);
    
    // Ajouter les informations de l'utilisateur à l'état de la requête
    ctx.state.user = {
      id: payload.id,
      username: payload.sub,
      role: payload.role
    };
    
    await next();
  } catch (error) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Token invalide ou expiré" };
  }
}

export async function adminMiddleware(ctx: Context, next: Next) {
  await authMiddleware(ctx, async () => {
    if (ctx.state.user && ctx.state.user.role === "admin") {
      await next();
    } else {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "Accès refusé. Privilèges d'administrateur requis." };
    }
  });
}