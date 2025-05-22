// controllers/teamController.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { teamRepository } from "../models/team.ts";
import { leagueRepository } from "../models/league.ts";

export const teamController = {
  // Récupérer toutes les équipes
  async getAllTeams(ctx: Context) {
    try {
      const teams = await teamRepository.getAllTeams();
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: teams };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer les équipes d'un championnat
  async getTeamsByLeague(ctx: Context) {
    try {
      const leagueId = Number(ctx.params.leagueId);
      if (isNaN(leagueId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID de championnat invalide" };
        return;
      }
      
      // Vérifier si le championnat existe
      const league = await leagueRepository.getLeagueById(leagueId);
      if (!league) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Championnat non trouvé" };
        return;
      }
      
      const teams = await teamRepository.getTeamsByLeague(leagueId);
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        data: { 
          league,
          teams 
        }
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer une équipe par son ID
  async getTeamById(ctx: Context) {
    try {
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const team = await teamRepository.getTeamById(id);
      if (!team) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Équipe non trouvée" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: team };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Créer une nouvelle équipe
  async createTeam(ctx: Context) {
    try {
      const body = await ctx.request.body().json();
      const { name, league_id, logo_url } = body;
      
      // Validation de base
      if (!name || !league_id) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Le nom et l'ID du championnat sont requis" };
        return;
      }
      
      // Vérifier si le championnat existe
      const league = await leagueRepository.getLeagueById(league_id);
      if (!league) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Championnat non trouvé" };
        return;
      }
      
      const id = await teamRepository.createTeam({
        name,
        league_id,
        logo_url
      });
      
      ctx.response.status = 201;
      ctx.response.body = { 
        success: true, 
        message: "Équipe créée avec succès", 
        data: { id, name, league_id, logo_url }
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Mettre à jour une équipe
  async updateTeam(ctx: Context) {
    try {
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const body = await ctx.request.body().value;
      
      // Si league_id est fourni, vérifier si le championnat existe
      if (body.league_id) {
        const league = await leagueRepository.getLeagueById(body.league_id);
        if (!league) {
          ctx.response.status = 404;
          ctx.response.body = { success: false, message: "Championnat non trouvé" };
          return;
        }
      }
      
      const success = await teamRepository.updateTeam(id, body);
      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Équipe non trouvée" };
        return;
      }
      
      const updatedTeam = await teamRepository.getTeamById(id);
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        message: "Équipe mise à jour avec succès", 
        data: updatedTeam
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Supprimer une équipe
  async deleteTeam(ctx: Context) {
    try {
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const success = await teamRepository.deleteTeam(id);
      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Équipe non trouvée" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, message: "Équipe supprimée avec succès" };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  }
};