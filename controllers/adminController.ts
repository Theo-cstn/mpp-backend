// front_and_back/controllers/adminController.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { userRepository } from "../models/user.ts";

export const adminController = {
  // Vérifier si l'utilisateur est admin
  async checkAdminAccess(ctx: Context) {
    if (!ctx.state.user || ctx.state.user.role !== "admin") {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "Accès refusé" };
      return;
    }
    
    ctx.response.body = { 
      success: true, 
      username: ctx.state.user.username,
      role: ctx.state.user.role 
    };
  },
  
  // Récupérer tous les utilisateurs
  async getAllUsers(ctx: Context) {
    if (!ctx.state.user || ctx.state.user.role !== "admin") {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "Accès refusé" };
      return;
    }
    
    try {
      const users = await userRepository.getAllUsers(100, 0); // Limite à 100 pour l'instant
      ctx.response.body = { success: true, data: users };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur" };
    }
  }
};