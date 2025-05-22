// controllers/matchController.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { matchRepository } from "../models/match.ts";
import { leagueRepository } from "../models/league.ts";
import { teamRepository } from "../models/team.ts";
import { predictionController } from "./predictionController.ts";


export const matchController = {
  // Récupérer tous les matchs
  async getAllMatches(ctx: Context) {
    try {
      const matches = await matchRepository.getAllMatches();
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: matches };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer les matchs d'un championnat
  async getMatchesByLeague(ctx: Context) {
    try {
      const leagueId = Number(ctx.params.leagueId);
      if (isNaN(leagueId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID de championnat invalide" };
        return;
      }
      
      const matches = await matchRepository.getMatchesByLeague(leagueId);
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: matches };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer les matchs à venir avec filtres optionnels
async getUpcomingMatches(ctx: Context) {
  try {
    // Récupérer les paramètres de requête
    const leagueId = ctx.request.url.searchParams.get('league_id');
    const round = ctx.request.url.searchParams.get('round');
    
    let matches;
    
    if (leagueId && round) {
      // Si les deux filtres sont présents
      matches = await matchRepository.getUpcomingMatchesByLeagueAndRound(Number(leagueId), round);
    } else if (leagueId) {
      // Si seulement le championnat est filtré
      matches = await matchRepository.getUpcomingMatchesByLeague(Number(leagueId));
    } else {
      // Sans filtre - comportement par défaut
      matches = await matchRepository.getUpcomingMatches();
    }
    
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: matches };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
  }
},
  
  // Récupérer un match par son ID
  async getMatchById(ctx: Context) {
    try {
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const match = await matchRepository.getMatchById(id);
      if (!match) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Match non trouvé" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: match };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Créer un nouveau match (admin uniquement)
  async createMatch(ctx: Context) {
    try {
      // Vérifier si l'utilisateur est admin
      if (!ctx.state.user || ctx.state.user.role !== "admin") {
        ctx.response.status = 403;
        ctx.response.body = { success: false, message: "Accès refusé" };
        return;
      }
      
      const body = await ctx.request.body.json();
      const { league_id, home_team_id, away_team_id, match_date, round } = body;
      
      // Validation
      if (!league_id || !home_team_id || !away_team_id || !match_date) {
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false, 
          message: "Tous les champs sont requis (league_id, home_team_id, away_team_id, match_date)" 
        };
        return;
      }
      
      // Vérifier que le championnat existe
      const league = leagueRepository.getLeagueById(league_id);
      if (!league) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Championnat non trouvé" };
        return;
      }
      
      // Vérifier que les équipes existent
      const homeTeam = teamRepository.getTeamById(home_team_id);
      const awayTeam = teamRepository.getTeamById(away_team_id);
      
      if (!homeTeam || !awayTeam) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Une ou plusieurs équipes non trouvées" };
        return;
      }
      
      const id = await matchRepository.createMatch({
        league_id,
        home_team_id,
        away_team_id,
        match_date,
        status: "scheduled",
        round
      });
      
      const createdMatch = await matchRepository.getMatchById(id);
      
      ctx.response.status = 201;
      ctx.response.body = { 
        success: true, 
        message: "Match créé avec succès", 
        data: createdMatch
      };
    } catch (error) {
      console.error("Erreur createMatch:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Mettre à jour un match (admin uniquement)
  async updateMatch(ctx: Context) {
    try {
      // Vérifier si l'utilisateur est admin
      if (!ctx.state.user || ctx.state.user.role !== "admin") {
        ctx.response.status = 403;
        ctx.response.body = { success: false, message: "Accès refusé" };
        return;
      }
      
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const body = await ctx.request.body.json();
      
      const success = await matchRepository.updateMatch(id, body);
      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Match non trouvé" };
        return;
      }
      
      const updatedMatch = await matchRepository.getMatchById(id);
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        message: "Match mis à jour avec succès", 
        data: updatedMatch
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Mettre à jour le score d'un match (admin uniquement)
  async updateScore(ctx: Context) {
    try {
      // Vérifier si l'utilisateur est admin
      if (!ctx.state.user || ctx.state.user.role !== "admin") {
        ctx.response.status = 403;
        ctx.response.body = { success: false, message: "Accès refusé" };
        return;
      }
      
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const body = await ctx.request.body.json();
      const { home_score, away_score } = body;
      
      if (home_score === undefined || away_score === undefined) {
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false, 
          message: "Les scores des deux équipes sont requis" 
        };
        return;
      }
      
      const success = await matchRepository.updateScore(id, home_score, away_score);
      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Match non trouvé" };
        return;
      }
      
      const updatedMatch = await matchRepository.getMatchById(id);

      // Calculer automatiquement les points pour les pronostics
      try {
        // Créer un contexte fictif pour appeler calculateMatchPoints
        const pointsContext = {
          params: { matchId: id.toString() },
          state: { user: ctx.state.user },
          response: {
            status: 0,
            body: undefined
          }
        };
        
        // Appeler la fonction de calcul des points
        await predictionController.calculateMatchPoints(pointsContext as any);
        
        // Vérifier si le calcul a réussi
        if (pointsContext.response.status === 200) {
          console.log("Points calculés automatiquement pour les pronostics");
        } else {
          console.error("Erreur lors du calcul automatique des points");
        }
      } catch (error) {
        console.error("Erreur lors du calcul des points:", error);
        // Ne pas bloquer la mise à jour du score si le calcul des points échoue
      }
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        message: "Score mis à jour avec succès", 
        data: updatedMatch
      };
    } catch (error) {
      console.error("Erreur updateScore:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Supprimer un match (admin uniquement)
  async deleteMatch(ctx: Context) {
    try {
      // Vérifier si l'utilisateur est admin
      if (!ctx.state.user || ctx.state.user.role !== "admin") {
        ctx.response.status = 403;
        ctx.response.body = { success: false, message: "Accès refusé" };
        return;
      }
      
      const id = Number(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const success = await matchRepository.deleteMatch(id);
      if (!success) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Match non trouvé" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, message: "Match supprimé avec succès" };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  }
};