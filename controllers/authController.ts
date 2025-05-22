// controllers/authController.ts - Correction BigInt pour PostgreSQL
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { userRepository } from "../models/user.ts";

// Générer une clé pour JWT (comme dans l'ancien code)
const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"]
);

export const authController = {
  async register(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      
      if (!body || !body.username || !body.password) {
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false, 
          message: "Le nom d'utilisateur et le mot de passe sont requis" 
        };
        return;
      }
      
      const { username, password } = body;
      
      const existingUser = await userRepository.getUserByUsername(username);
      if (existingUser) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Ce nom d'utilisateur est déjà pris" };
        return;
      }
      
      const salt = await bcrypt.genSalt(8);
      const passwordHash = await bcrypt.hash(password, salt);
      
      const userId = await userRepository.createUser(username, passwordHash);
      
      // Créer le JWT - CORRECTION: convertir BigInt en Number
      const payload = {
        sub: username,
        id: typeof userId === 'bigint' ? Number(userId) : userId, // Conversion BigInt -> Number
        role: "user",
        exp: getNumericDate(60 * 60), // 1 heure
      };
      
      const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);
      
      // Définir le cookie
      ctx.cookies.set("token", token, {
        httpOnly: true,
        maxAge: 60 * 60, // 1 heure
        secure: false, 
        sameSite: "lax",
      });
      
      ctx.response.status = 201;
      ctx.response.body = { 
        message: "Registration successful",
        success: true
      };
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  async login(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      
      if (!body || !body.username || !body.password) {
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false, 
          message: "Le nom d'utilisateur et le mot de passe sont requis" 
        };
        return;
      }
      
      const { username, password } = body;
      
      const user = await userRepository.getUserByUsername(username);
      if (!user) {
        ctx.response.status = 401;
        ctx.response.body = { success: false, message: "Identifiants incorrects" };
        return;
      }
      
      const isValid = await bcrypt.compare(password, user.password_hash || "");
      if (!isValid) {
        ctx.response.status = 401;
        ctx.response.body = { success: false, message: "Identifiants incorrects" };
        return;
      }
      
      // Créer le JWT - CORRECTION: convertir BigInt en Number si nécessaire
      const payload = {
        sub: username,
        id: typeof user.id === 'bigint' ? Number(user.id) : user.id, // Conversion BigInt -> Number
        role: user.role,
        exp: getNumericDate(60 * 60), // 1 heure
      };
      
      const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);
      
      // Définir le cookie
      ctx.cookies.set("token", token, {
        httpOnly: true,
        maxAge: 60 * 60, // 1 heure
        secure: false,
        sameSite: "lax",
      });
      
      ctx.response.status = 200;
      ctx.response.body = { 
        message: "Login successful",
        success: true
      };
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  }
};

// Exporter la clé pour l'utiliser dans le middleware
export { key };