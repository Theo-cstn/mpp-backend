// models/prediction.ts - Adapté pour PostgreSQL avec correction BigInt
import { db } from "../database.ts";

export interface Prediction {
  id?: number;
  user_id: number;
  match_id: number;
  home_score_prediction: number;
  away_score_prediction: number;
  points_earned?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PredictionWithDetails extends Prediction {
  username: string;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
  match_status: string;
  actual_home_score?: number;
  actual_away_score?: number;
  league_id: number;  
  round?: string;
}

export const predictionRepository = {
  // Créer un nouveau pronostic
  async createPrediction(prediction: Omit<Prediction, "id" | "created_at" | "updated_at" | "points_earned">): Promise<number> {
    const result = await db.queryObject<{id: number}>(
      `INSERT INTO predictions (user_id, match_id, home_score_prediction, away_score_prediction) 
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        prediction.user_id,
        prediction.match_id,
        prediction.home_score_prediction,
        prediction.away_score_prediction
      ]
    );
    
    return Number(result[0].id); // Conversion BigInt -> Number
  },
  
  // Récupérer un pronostic par utilisateur et match
  async getPredictionByUserAndMatch(userId: number, matchId: number): Promise<Prediction | null> {
    const rows = await db.queryObject<{
      id: number;
      user_id: number;
      match_id: number;
      home_score_prediction: number;
      away_score_prediction: number;
      points_earned: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, user_id, match_id, home_score_prediction, away_score_prediction, 
              points_earned, created_at, updated_at 
       FROM predictions 
       WHERE user_id = $1 AND match_id = $2`,
      [userId, matchId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    return {
      id: Number(row.id), // Conversion BigInt -> Number
      user_id: Number(row.user_id), // Conversion BigInt -> Number
      match_id: Number(row.match_id), // Conversion BigInt -> Number
      home_score_prediction: row.home_score_prediction,
      away_score_prediction: row.away_score_prediction,
      points_earned: row.points_earned,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  },
  
  // Récupérer tous les pronostics d'un utilisateur avec les détails des matchs
  async getUserPredictions(userId: number): Promise<PredictionWithDetails[]> {
    const rows = await db.queryObject<{
      id: number;
      user_id: number;
      match_id: number;
      home_score_prediction: number;
      away_score_prediction: number;
      points_earned: number;
      created_at: string;
      updated_at: string;
      username: string;
      home_team_name: string;
      away_team_name: string;
      match_date: string;
      match_status: string;
      actual_home_score: number | null;
      actual_away_score: number | null;
      league_id: number;
      round: string | null;
    }>(`
      SELECT 
        p.id, p.user_id, p.match_id, p.home_score_prediction, p.away_score_prediction, 
        p.points_earned, p.created_at, p.updated_at,
        u.username, ht.name as home_team_name, at.name as away_team_name, 
        m.match_date, m.status as match_status, m.home_score as actual_home_score, m.away_score as actual_away_score, m.league_id, m.round
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      JOIN matches m ON p.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE p.user_id = $1
      ORDER BY m.match_date DESC
    `, [userId]);
    
    return rows.map(row => ({
      id: Number(row.id), // Conversion BigInt -> Number
      user_id: Number(row.user_id), // Conversion BigInt -> Number
      match_id: Number(row.match_id), // Conversion BigInt -> Number
      home_score_prediction: row.home_score_prediction,
      away_score_prediction: row.away_score_prediction,
      points_earned: row.points_earned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      username: row.username,
      home_team_name: row.home_team_name,
      away_team_name: row.away_team_name,
      match_date: row.match_date,
      match_status: row.match_status,
      actual_home_score: row.actual_home_score ?? undefined,
      actual_away_score: row.actual_away_score ?? undefined,
      league_id: Number(row.league_id), // Conversion BigInt -> Number
      round: row.round ?? undefined
    }));
  },
  
  // Récupérer tous les pronostics pour un match
  async getMatchPredictions(matchId: number): Promise<PredictionWithDetails[]> {
    const rows = await db.queryObject<{
      id: number;
      user_id: number;
      match_id: number;
      home_score_prediction: number;
      away_score_prediction: number;
      points_earned: number;
      created_at: string;
      updated_at: string;
      username: string;
      home_team_name: string;
      away_team_name: string;
      match_date: string;
      match_status: string;
      actual_home_score: number | null;
      actual_away_score: number | null;
    }>(`
      SELECT 
        p.id, p.user_id, p.match_id, p.home_score_prediction, p.away_score_prediction, 
        p.points_earned, p.created_at, p.updated_at,
        u.username, ht.name as home_team_name, at.name as away_team_name, 
        m.match_date, m.status as match_status, m.home_score as actual_home_score, m.away_score as actual_away_score
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      JOIN matches m ON p.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE p.match_id = $1
      ORDER BY p.created_at ASC
    `, [matchId]);
    
    return rows.map(row => ({
      id: Number(row.id), // Conversion BigInt -> Number
      user_id: Number(row.user_id), // Conversion BigInt -> Number
      match_id: Number(row.match_id), // Conversion BigInt -> Number
      home_score_prediction: row.home_score_prediction,
      away_score_prediction: row.away_score_prediction,
      points_earned: row.points_earned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      username: row.username,
      home_team_name: row.home_team_name,
      away_team_name: row.away_team_name,
      match_date: row.match_date,
      match_status: row.match_status,
      actual_home_score: row.actual_home_score ?? undefined,
      actual_away_score: row.actual_away_score ?? undefined,
      league_id: 0, // Cette valeur sera remplacée si nécessaire, car elle n'est pas présente dans la requête
      round: undefined // Cette valeur sera remplacée si nécessaire, car elle n'est pas présente dans la requête
    }));
  },
  
  // Mettre à jour un pronostic (avant que le match commence)
  async updatePrediction(id: number, prediction: Partial<Prediction>): Promise<boolean> {
    try {
      const existingPrediction = await this.getPredictionById(id);
      if (!existingPrediction) {
        return false;
      }
      
      await db.execute(
        `UPDATE predictions 
         SET home_score_prediction = $1, away_score_prediction = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          prediction.home_score_prediction ?? existingPrediction.home_score_prediction,
          prediction.away_score_prediction ?? existingPrediction.away_score_prediction,
          id
        ]
      );
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du pronostic:", error);
      return false;
    }
  },
  
  // Récupérer un pronostic par son ID
  async getPredictionById(id: number): Promise<Prediction | null> {
    const rows = await db.queryObject<{
      id: number;
      user_id: number;
      match_id: number;
      home_score_prediction: number;
      away_score_prediction: number;
      points_earned: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, user_id, match_id, home_score_prediction, away_score_prediction, 
              points_earned, created_at, updated_at 
       FROM predictions 
       WHERE id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    return {
      id: Number(row.id), // Conversion BigInt -> Number
      user_id: Number(row.user_id), // Conversion BigInt -> Number
      match_id: Number(row.match_id), // Conversion BigInt -> Number
      home_score_prediction: row.home_score_prediction,
      away_score_prediction: row.away_score_prediction,
      points_earned: row.points_earned,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  },
  
  // Mettre à jour les points après qu'un match soit terminé
  async updatePoints(predictionId: number, points: number): Promise<boolean> {
    try {
      await db.execute(
        `UPDATE predictions 
         SET points_earned = $1
         WHERE id = $2`,
        [points, predictionId]
      );
      
      return db.changes > 0;
    } catch (error) {
      console.error("Erreur lors de la mise à jour des points:", error);
      return false;
    }
  }
};