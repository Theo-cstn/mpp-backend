// controllers/rankingController.ts - Version adaptée pour PostgreSQL
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../database.ts";

export const rankingController = {
  // Récupérer le classement général
  async getGeneralRanking(ctx: Context) {
    try {
      // Requête SQL adaptée pour PostgreSQL
      const rankings = await db.queryObject<{
        id: number;
        username: string;
        points: number;
        total_predictions: number;
        exact_scores: number;
        correct_results: number;
        wrong_predictions: number;
      }>(`
        SELECT 
          u.id,
          u.username,
          u.points,
          COUNT(p.id)::integer as total_predictions,
          SUM(CASE WHEN p.points_earned = 3 THEN 1 ELSE 0 END)::integer as exact_scores,
          SUM(CASE WHEN p.points_earned = 1 THEN 1 ELSE 0 END)::integer as correct_results,
          SUM(CASE WHEN p.points_earned = 0 OR p.points_earned IS NULL THEN 1 ELSE 0 END)::integer as wrong_predictions
        FROM users u
        LEFT JOIN predictions p ON u.id = p.user_id
        GROUP BY u.id, u.username, u.points
        ORDER BY u.points DESC, exact_scores DESC
      `);
      
      // Formatage des résultats
      const formattedRankings = rankings.map(row => {
        return {
          id: row.id,
          username: row.username,
          points: row.points,
          total_predictions: row.total_predictions || 0,
          exact_scores: row.exact_scores || 0,
          correct_results: row.correct_results || 0,
          wrong_predictions: row.wrong_predictions || 0
        };
      });
      
      ctx.response.status = 200;
      ctx.response.body = { success: true, data: formattedRankings };
    } catch (error) {
      console.error("Erreur lors de la récupération du classement:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Erreur serveur", error: error.message };
    }
  }
};