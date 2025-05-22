// controllers/privateLeagueController.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { privateLeagueRepository } from "../models/privateLeague.ts";

export const privateLeagueController = {
  // Créer une nouvelle ligue privée
  async createPrivateLeague(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { name, description, max_members } = body;
      
      // Validation
      if (!name) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Le nom est requis" };
        return;
      }
      
      const userId = ctx.state.user.id;
      
      const leagueId = await privateLeagueRepository.createPrivateLeague({
        name,
        description,
        creator_id: userId,
        max_members: max_members || 20,
        is_active: true
      });
      
      const league = await privateLeagueRepository.getPrivateLeagueById(leagueId);
      
      ctx.response.status = 201;
      ctx.response.body = { 
        success: true, 
        message: "Ligue créée avec succès",
        data: league
      };
    } catch (error) {
      console.error("Erreur lors de la création de la ligue:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur" };
    }
  },

  // Rejoindre une ligue avec un code d'invitation
  async joinPrivateLeague(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { invite_code } = body;
      
      if (!invite_code) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Code d'invitation requis" };
        return;
      }
      
      const league = await privateLeagueRepository.getPrivateLeagueByInviteCode(invite_code.toUpperCase());
      
      if (!league) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Code d'invitation invalide" };
        return;
      }
      
      if (!league.is_active) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Cette ligue n'est plus active" };
        return;
      }
      
      const userId = ctx.state.user.id;
      const success = await privateLeagueRepository.addMember(league.id!, userId);
      
      if (!success) {
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false, 
          message: "Impossible de rejoindre la ligue (déjà membre ou ligue pleine)" 
        };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        message: "Vous avez rejoint la ligue avec succès",
        data: league
      };
    } catch (error) {
      console.error("Erreur:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur" };
    }
  },

  // Récupérer les ligues d'un utilisateur
  async getUserPrivateLeagues(ctx: Context) {
    try {
      const userId = ctx.state.user.id;
      const leagues = await privateLeagueRepository.getUserPrivateLeagues(userId);
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: leagues };
    } catch (error) {
      console.error("Erreur:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur" };
    }
  },

  // Récupérer les détails d'une ligue
  async getPrivateLeague(ctx: Context) {
    try {
      const leagueId = Number(ctx.params.id);
      if (isNaN(leagueId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const league = await privateLeagueRepository.getPrivateLeagueById(leagueId);
      
      if (!league) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Ligue non trouvée" };
        return;
      }
      
      // Vérifier que l'utilisateur est membre
      const userId = ctx.state.user.id;
      const members = await privateLeagueRepository.getLeagueMembers(leagueId);
      const isMember = members.some(m => m.user_id === userId);
      
      if (!isMember) {
        ctx.response.status = 403;
        ctx.response.body = { success: false, message: "Vous n'êtes pas membre de cette ligue" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        data: {
          league,
          members
        }
      };
    } catch (error) {
      console.error("Erreur:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur" };
    }
  },

  // Quitter une ligue
  async leavePrivateLeague(ctx: Context) {
    try {
      const leagueId = Number(ctx.params.id);
      if (isNaN(leagueId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const userId = ctx.state.user.id;
      
      // Vérifier qu'on n'est pas le créateur
      const league = await privateLeagueRepository.getPrivateLeagueById(leagueId);
      if (!league) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Ligue non trouvée" };
        return;
      }
      
      if (league.creator_id === userId) {
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false, 
          message: "Le créateur ne peut pas quitter la ligue" 
        };
        return;
      }
      
      const success = await privateLeagueRepository.removeMember(leagueId, userId);
      
      if (!success) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Erreur lors de la sortie de la ligue" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, message: "Vous avez quitté la ligue" };
    } catch (error) {
      console.error("Erreur:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur" };
    }
  },

  // Supprimer une ligue (admin seulement)
  async deletePrivateLeague(ctx: Context) {
    try {
      const leagueId = Number(ctx.params.id);
      if (isNaN(leagueId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const userId = ctx.state.user.id;
      
      // Vérifier qu'on est admin de la ligue
      if (!(await privateLeagueRepository.isUserAdminOfLeague(leagueId, userId))) {
        ctx.response.status = 403;
        ctx.response.body = { 
          success: false, 
          message: "Seuls les administrateurs peuvent supprimer la ligue" 
        };
        return;
      }
      
      const success = await privateLeagueRepository.deletePrivateLeague(leagueId);
      
      if (!success) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Erreur lors de la suppression" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, message: "Ligue supprimée avec succès" };
    } catch (error) {
      console.error("Erreur:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur" };
    }
  }
};