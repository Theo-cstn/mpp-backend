// controllers/predictionController.ts - Correction BigInt pour PostgreSQL
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { predictionRepository } from "../models/prediction.ts";
import { matchRepository } from "../models/match.ts";
import { userRepository } from "../models/user.ts";
import { privateLeagueRepository } from "../models/privateLeague.ts";

export const predictionController = {
  // Créer un pronostic
  async createPrediction(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { match_id, home_score_prediction, away_score_prediction } = body;
      
      // Vérifications
      if (!match_id || home_score_prediction === undefined || away_score_prediction === undefined) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Données manquantes" };
        return;
      }
      
      // Récupérer l'utilisateur connecté
      const userId = ctx.state.user.id;
      
      // Vérifier que le match existe et n'a pas encore commencé
      const match = await matchRepository.getMatchById(match_id);
      if (!match) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Match non trouvé" };
        return;
      }
      
      if (match.status !== 'scheduled') {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Le match a déjà commencé ou est terminé" };
        return;
      }
      
      // Vérifier si un pronostic existe déjà
      const existingPrediction = await predictionRepository.getPredictionByUserAndMatch(userId, match_id);
      if (existingPrediction) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Vous avez déjà fait un pronostic pour ce match" };
        return;
      }
      
      // Créer le pronostic
      const predictionId = await predictionRepository.createPrediction({
        user_id: userId,
        match_id,
        home_score_prediction,
        away_score_prediction
      });
      
      ctx.response.status = 201;
      ctx.response.body = { 
        success: true, 
        message: "Pronostic créé avec succès",
        data: { id: Number(predictionId) } // S'assurer que l'ID est un Number
      };
    } catch (error) {
      console.error("Erreur lors de la création du pronostic:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Modifier un pronostic
  async updatePrediction(ctx: Context) {
    try {
      const predictionId = Number(ctx.params.id);
      if (isNaN(predictionId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID invalide" };
        return;
      }
      
      const body = await ctx.request.body.json();
      const { home_score_prediction, away_score_prediction } = body;
      
      if (home_score_prediction === undefined || away_score_prediction === undefined) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Données manquantes" };
        return;
      }
      
      // Vérifier que le pronostic existe
      const prediction = await predictionRepository.getPredictionById(predictionId);
      if (!prediction) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Pronostic non trouvé" };
        return;
      }
      
      // Vérifier que l'utilisateur est bien le propriétaire du pronostic
      if (prediction.user_id !== ctx.state.user.id) {
        ctx.response.status = 403;
        ctx.response.body = { success: false, message: "Vous ne pouvez pas modifier ce pronostic" };
        return;
      }
      
      // Vérifier que le match n'a pas encore commencé
      const match = await matchRepository.getMatchById(prediction.match_id);
      if (!match || match.status !== 'scheduled') {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Le match a déjà commencé ou est terminé" };
        return;
      }
      
      // Mettre à jour le pronostic
      const success = await predictionRepository.updatePrediction(predictionId, {
        home_score_prediction,
        away_score_prediction
      });
      
      if (!success) {
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Erreur lors de la mise à jour" };
        return;
      }
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        message: "Pronostic mis à jour avec succès"
      };
    } catch (error) {
      console.error("Erreur lors de la mise à jour du pronostic:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer les pronostics de l'utilisateur connecté
  async getUserPredictions(ctx: Context) {
    try {
      const userId = ctx.state.user.id;
      const predictions = await predictionRepository.getUserPredictions(userId);
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        data: predictions
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des pronostics:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Récupérer tous les pronostics pour un match (admin seulement)
  async getMatchPredictions(ctx: Context) {
    try {
      const matchId = Number(ctx.params.matchId);
      if (isNaN(matchId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID de match invalide" };
        return;
      }
      
      const predictions = await predictionRepository.getMatchPredictions(matchId);
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        data: predictions
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des pronostics du match:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },
  
  // Calculer les points pour tous les pronostics d'un match terminé
  async calculateMatchPoints(ctx: Context) {
    try {
      const matchId = Number(ctx.params.matchId);
      if (isNaN(matchId)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "ID de match invalide" };
        return;
      }
      
      // Vérifier que l'utilisateur est admin
      if (ctx.state.user.role !== "admin") {
        ctx.response.status = 403;
        ctx.response.body = { success: false, message: "Accès refusé" };
        return;
      }
      
      // Récupérer le match
      const match = await matchRepository.getMatchById(matchId);
      if (!match) {
        ctx.response.status = 404;
        ctx.response.body = { success: false, message: "Match non trouvé" };
        return;
      }
      
      // Vérifier que le match est terminé
      if (match.status !== 'finished' || match.home_score === undefined || match.away_score === undefined) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Le match n'est pas terminé" };
        return;
      }
      
      // Récupérer tous les pronostics pour ce match
      const predictions = await predictionRepository.getMatchPredictions(matchId);
      let updatedCount = 0;
      
      // Map pour collecter les points par utilisateur pour les ligues privées
      const userPoints = new Map<number, number>();
      
      console.log(`Calcul des points pour ${predictions.length} pronostics du match ${matchId}`);
      
      for (const prediction of predictions) {
        let points = 0;
        
        // Score exact = 3 points
        if (prediction.home_score_prediction === match.home_score && 
            prediction.away_score_prediction === match.away_score) {
          points = 3;
        }
        // Bon résultat (victoire/nul/défaite) = 1 point
        else {
          const actualResult = getMatchResult(match.home_score, match.away_score);
          const predictedResult = getMatchResult(prediction.home_score_prediction, prediction.away_score_prediction);
          
          if (actualResult === predictedResult) {
            points = 1;
          }
        }
        
        console.log(`Joueur ${prediction.user_id}: ${points} points`);
        
        // Mettre à jour les points du pronostic
        const pointsUpdated = await predictionRepository.updatePoints(prediction.id!, points);
        if (pointsUpdated) {
          await userRepository.updateUserPoints(prediction.user_id, points);
          
          if (points > 0) {
            userPoints.set(prediction.user_id, points);
          }
          
          updatedCount++;
        }
      }
      
      console.log(`Points collectés pour ${userPoints.size} utilisateurs:`, 
                Array.from(userPoints.entries()).map(([userId, pts]) => `User ${userId}: ${pts} pts`).join(', '));
      
      // Mettre à jour les points dans les ligues privées après la boucle
      if (userPoints.size > 0) {
        try {
          const result = await this.updatePrivateLeaguePoints(matchId, userPoints);
          console.log(`Mise à jour des points des ligues privées: ${result ? 'succès' : 'échec'}`);
        } catch (err) {
          console.error("Erreur lors de la mise à jour des ligues privées:", err);
        }
      }
      
      ctx.response.status = 200;
      ctx.response.body = { 
        success: true, 
        message: `Points calculés avec succès pour ${updatedCount} pronostics`,
        data: { updated_predictions: updatedCount }
      };
    } catch (error) {
      console.error("Erreur lors du calcul des points:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  },

  // Mettre à jour les points des ligues privées pour un match terminé
  async updatePrivateLeaguePoints(matchId: number, points: Map<number, number>) {
    try {
      // points est une Map qui associe user_id -> points gagnés
      
      // 1. Récupérer toutes les ligues privées
      const leaguesQuery = await db.queryObject<{id: number}>("SELECT id FROM private_leagues WHERE is_active = true");
      const leagueIds = leaguesQuery.map(row => Number(row.id)); // Conversion BigInt -> Number
      
      // 2. Pour chaque ligue, mettre à jour les points des membres qui ont fait des pronostics
      for (const leagueId of leagueIds) {
        // Récupérer les membres de cette ligue
        const members = await privateLeagueRepository.getLeagueMembers(leagueId);
        
        // Pour chaque membre qui a des points à ajouter
        for (const member of members) {
          if (points.has(member.user_id)) {
            const pointsToAdd = points.get(member.user_id)!;
            
            // Mettre à jour les points du membre dans cette ligue
            await privateLeagueRepository.updateMemberPoints(leagueId, member.user_id, pointsToAdd);
            console.log(`Points mis à jour pour user ${member.user_id} dans ligue ${leagueId}: +${pointsToAdd}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour des points des ligues privées:", error);
      return false;
    }
  }
};

// Fonction utilitaire pour déterminer le résultat d'un match
function getMatchResult(homeScore: number, awayScore: number): 'home_win' | 'away_win' | 'draw' {
  if (homeScore > awayScore) return 'home_win';
  if (homeScore < awayScore) return 'away_win';
  return 'draw';
}