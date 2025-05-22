// models/match.ts
import { db } from "../database.ts";

export interface Match {
  id?: number;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  status: 'scheduled' | 'in_progress' | 'finished';
  home_score?: number;
  away_score?: number;
  round?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MatchWithTeams extends Match {
  home_team_name: string;
  away_team_name: string;
  league_name: string;
}

export const matchRepository = {
  // Récupérer tous les matchs avec les noms des équipes
  async getAllMatches(): Promise<MatchWithTeams[]> {
    const rows = await db.query<[number, number, number, number, string, string, number | null, number | null, string, string, string | null, string, string, string]>(`
      SELECT 
        m.id, m.league_id, m.home_team_id, m.away_team_id, m.match_date, 
        m.status, m.home_score, m.away_score, m.created_at, m.updated_at, m.round,
        ht.name as home_team_name, at.name as away_team_name, l.name as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      JOIN leagues l ON m.league_id = l.id
      ORDER BY m.match_date DESC
    `);
    
    return rows.map(([id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, created_at, updated_at, round, home_team_name, away_team_name, league_name]) => ({
      id,
      league_id,
      home_team_id,
      away_team_id,
      match_date,
      status: status as Match["status"],
      home_score: home_score ?? undefined,
      away_score: away_score ?? undefined,
      round: round ?? undefined,
      created_at,
      updated_at,
      home_team_name,
      away_team_name,
      league_name
    }));
  },
  
  // Récupérer les matchs d'un championnat
  async getMatchesByLeague(leagueId: number): Promise<MatchWithTeams[]> {
    const rows = await db.query<[number, number, number, number, string, string, number | null, number | null, string, string, string | null, string, string, string]>(`
      SELECT 
        m.id, m.league_id, m.home_team_id, m.away_team_id, m.match_date, 
        m.status, m.home_score, m.away_score, m.created_at, m.updated_at, m.round,
        ht.name as home_team_name, at.name as away_team_name, l.name as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      JOIN leagues l ON m.league_id = l.id
      WHERE m.league_id = $1
      ORDER BY m.match_date DESC
    `, [leagueId]);
    
    return rows.map(([id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, created_at, updated_at, round, home_team_name, away_team_name, league_name]) => ({
      id,
      league_id,
      home_team_id,
      away_team_id,
      match_date,
      status: status as Match["status"],
      home_score: home_score ?? undefined,
      away_score: away_score ?? undefined,
      round: round ?? undefined,
      created_at,
      updated_at,
      home_team_name,
      away_team_name,
      league_name
    }));
  },
  
  // Récupérer les matchs à venir
  async getUpcomingMatches(): Promise<MatchWithTeams[]> {
    // Obtenir la date actuelle en format ISO
    const now = new Date().toISOString();
    
    const rows = await db.query<[number, number, number, number, string, string, number | null, number | null, string, string, string | null, string, string, string]>(`
      SELECT 
        m.id, m.league_id, m.home_team_id, m.away_team_id, m.match_date, 
        m.status, m.home_score, m.away_score, m.created_at, m.updated_at, m.round,
        ht.name as home_team_name, at.name as away_team_name, l.name as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      JOIN leagues l ON m.league_id = l.id
      WHERE m.status = 'scheduled' AND m.match_date > $1
      ORDER BY m.match_date ASC
    `, [now]);
    
    return rows.map(([id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, created_at, updated_at, round, home_team_name, away_team_name, league_name]) => ({
      id,
      league_id,
      home_team_id,
      away_team_id,
      match_date,
      status: status as Match["status"],
      home_score: home_score ?? undefined,
      away_score: away_score ?? undefined,
      round: round ?? undefined,
      created_at,
      updated_at,
      home_team_name,
      away_team_name,
      league_name
    }));
  },
  
  // Récupérer un match par son ID
  async getMatchById(id: number): Promise<MatchWithTeams | null> {
    const rows = await db.query<[number, number, number, number, string, string, number | null, number | null, string, string, string | null, string, string, string]>(`
      SELECT 
        m.id, m.league_id, m.home_team_id, m.away_team_id, m.match_date, 
        m.status, m.home_score, m.away_score, m.created_at, m.updated_at, m.round,
        ht.name as home_team_name, at.name as away_team_name, l.name as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      JOIN leagues l ON m.league_id = l.id
      WHERE m.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const [_id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, created_at, updated_at, round, home_team_name, away_team_name, league_name] = rows[0];
    
    return {
      id: _id,
      league_id,
      home_team_id,
      away_team_id,
      match_date,
      status: status as Match["status"],
      home_score: home_score ?? undefined,
      away_score: away_score ?? undefined,
      round: round ?? undefined,
      created_at,
      updated_at,
      home_team_name,
      away_team_name,
      league_name
    };
  },
  
  // Créer un nouveau match
  async createMatch(match: Omit<Match, "id" | "created_at" | "updated_at">): Promise<number> {
    await db.query(
      `INSERT INTO matches (league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, round) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        match.league_id,
        match.home_team_id,
        match.away_team_id,
        match.match_date,
        match.status,
        match.home_score ?? null,
        match.away_score ?? null,
        match.round ?? null
      ]
    );
    
    return db.lastInsertRowId;
  },
  
  // Mettre à jour un match
  async updateMatch(id: number, match: Partial<Match>): Promise<boolean> {
    try {
      const existingMatch = await this.getMatchById(id);
      if (!existingMatch) {
        return false;
      }
      
      const updatedMatch = {
        ...existingMatch,
        ...match,
        updated_at: new Date().toISOString()
      };
      
      await db.query(
        `UPDATE matches 
         SET league_id = $1, home_team_id = $2, away_team_id = $3, match_date = $4, 
             status = $5, home_score = $6, away_score = $7, round = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [
          updatedMatch.league_id,
          updatedMatch.home_team_id,
          updatedMatch.away_team_id,
          updatedMatch.match_date,
          updatedMatch.status,
          updatedMatch.home_score ?? null,
          updatedMatch.away_score ?? null,
          updatedMatch.round ?? null,
          id
        ]
      );
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du match:", error);
      return false;
    }
  },
  
  // Mettre à jour le score d'un match
  async updateScore(id: number, home_score: number, away_score: number): Promise<boolean> {
    try {
      await db.query(
        `UPDATE matches 
         SET home_score = $1, away_score = $2, status = 'finished', updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [home_score, away_score, id]
      );
      
      return db.changes > 0;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du score:", error);
      return false;
    }
  },
  
  // Supprimer un match
  async deleteMatch(id: number): Promise<boolean> {
    try {
      // D'abord récupérer tous les pronostics pour ce match pour retirer les points
      const predictions = await db.query<[number, number, number]>(
        "SELECT id, user_id, points_earned FROM predictions WHERE match_id = $1",
        [id]
      );
      
      // Retirer les points des utilisateurs
      for (const [predictionId, userId, pointsEarned] of predictions) {
        if (pointsEarned > 0) {
          await db.query(
            "UPDATE users SET points = points - $1 WHERE id = $2",
            [pointsEarned, userId]
          );
        }
      }
      
      // Supprimer tous les pronostics associés à ce match
      await db.query("DELETE FROM predictions WHERE match_id = $1", [id]);
      
      // Enfin supprimer le match
      await db.query("DELETE FROM matches WHERE id = $1", [id]);
      
      return db.changes > 0;
    } catch (error) {
      console.error("Erreur lors de la suppression du match:", error);
      return false;
    }
  },

  // Nouvelle fonction : Récupérer les matchs par championnat et journée
  async getMatchesByLeagueAndRound(leagueId: number, round: string): Promise<MatchWithTeams[]> {
    const rows = await db.query<[number, number, number, number, string, string, number | null, number | null, string, string, string | null, string, string, string]>(`
      SELECT 
        m.id, m.league_id, m.home_team_id, m.away_team_id, m.match_date, 
        m.status, m.home_score, m.away_score, m.created_at, m.updated_at, m.round,
        ht.name as home_team_name, at.name as away_team_name, l.name as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      JOIN leagues l ON m.league_id = l.id
      WHERE m.league_id = $1 AND m.round = $2
      ORDER BY m.match_date ASC
    `, [leagueId, round]);
    
    return rows.map(([id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, created_at, updated_at, round, home_team_name, away_team_name, league_name]) => ({
      id,
      league_id,
      home_team_id,
      away_team_id,
      match_date,
      status: status as Match["status"],
      home_score: home_score ?? undefined,
      away_score: away_score ?? undefined,
      round: round ?? undefined,
      created_at,
      updated_at,
      home_team_name,
      away_team_name,
      league_name
    }));
  },

  // Nouvelle fonction : Récupérer toutes les journées d'un championnat
  async getRoundsByLeague(leagueId: number): Promise<string[]> {
    const rows = await db.query<[string]>(`
      SELECT DISTINCT round 
      FROM matches 
      WHERE league_id = $1 AND round IS NOT NULL
      ORDER BY round
    `, [leagueId]);
    
    return rows.map(([round]) => round);
  },

  // Récupérer les matchs à venir par championnat
  async getUpcomingMatchesByLeague(leagueId: number): Promise<MatchWithTeams[]> {
    const now = new Date().toISOString();
    
    const rows = await db.query<[number, number, number, number, string, string, number | null, number | null, string, string, string | null, string, string, string]>(`
      SELECT 
        m.id, m.league_id, m.home_team_id, m.away_team_id, m.match_date, 
        m.status, m.home_score, m.away_score, m.created_at, m.updated_at, m.round,
        ht.name as home_team_name, at.name as away_team_name, l.name as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      JOIN leagues l ON m.league_id = l.id
      WHERE m.status = 'scheduled' AND m.match_date > $1 AND m.league_id = $2
      ORDER BY m.match_date ASC
    `, [now, leagueId]);
    
    return rows.map(([id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, created_at, updated_at, round, home_team_name, away_team_name, league_name]) => ({
      id,
      league_id,
      home_team_id,
      away_team_id,
      match_date,
      status: status as Match["status"],
      home_score: home_score ?? undefined,
      away_score: away_score ?? undefined,
      round: round ?? undefined,
      created_at,
      updated_at,
      home_team_name,
      away_team_name,
      league_name
    }));
  },

  // Récupérer les matchs à venir par championnat et journée
  async getUpcomingMatchesByLeagueAndRound(leagueId: number, round: string): Promise<MatchWithTeams[]> {
    const now = new Date().toISOString();
    
    const rows = await db.query<[number, number, number, number, string, string, number | null, number | null, string, string, string | null, string, string, string]>(`
      SELECT 
        m.id, m.league_id, m.home_team_id, m.away_team_id, m.match_date, 
        m.status, m.home_score, m.away_score, m.created_at, m.updated_at, m.round,
        ht.name as home_team_name, at.name as away_team_name, l.name as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      JOIN leagues l ON m.league_id = l.id
      WHERE m.status = 'scheduled' AND m.match_date > $1 AND m.league_id = $2 AND m.round = $3
      ORDER BY m.match_date ASC
    `, [now, leagueId, round]);
    
    return rows.map(([id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score, created_at, updated_at, round, home_team_name, away_team_name, league_name]) => ({
      id,
      league_id,
      home_team_id,
      away_team_id,
      match_date,
      status: status as Match["status"],
      home_score: home_score ?? undefined,
      away_score: away_score ?? undefined,
      round: round ?? undefined,
      created_at,
      updated_at,
      home_team_name,
      away_team_name,
      league_name
    }));
  },
};