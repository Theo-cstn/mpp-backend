// controllers/leagueController.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { leagueRepository } from "../ models/league.ts";

export const leagueController = {
  // Récupérer tous les championnats
  async getAllLeagues(ctx: Context) {
    try {
      const leagues = await leagueRepository.getAllLeagues();
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: leagues };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer les championnats actifs
  async getActiveLeagues(ctx: Context) {
    try {
      const leagues = await leagueRepository.getActiveLeagues();
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: leagues };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer un championnat par son ID
  async getLeagueById(ctx: Context) {
    try {
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const league = await leagueRepository.getLeagueById(id);
      if (!league) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Championnat non trouvé" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: league };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Créer un nouveau championnat
  async createLeague(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { name, country, season, is_cup, active } = body;
      
      // Validation de base
      if (!name || !season) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Le nom et la saison sont requis" };
        return;
      }
      
      const id = await leagueRepository.createLeague({
        name,
        country,
        season,
        is_cup: Boolean(is_cup),
        active: active !== undefined ? Boolean(active) : true
      });
      
      ctx.response.status = 201;
      ctx.response.body = { 
        success: true, 
        message: "Championnat créé avec succès", 
        data: { id, name, country, season, is_cup, active }
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Mettre à jour un championnat
  async updateLeague(ctx: Context) {
    try {
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const body = await ctx.request.body().value;
      
      const success = await leagueRepository.updateLeague(id, body);
      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Championnat non trouvé" };
        return;
      }
      
      const updatedLeague = await leagueRepository.getLeagueById(id);
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        message: "Championnat mis à jour avec succès", 
        data: updatedLeague
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Supprimer un championnat
  async deleteLeague(ctx: Context) {
    try {
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const success = await leagueRepository.deleteLeague(id);
      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Championnat non trouvé" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, message: "Championnat supprimé avec succès" };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  }
};