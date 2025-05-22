// models/league.ts
import { db } from "../database.ts";

export interface League {
  id?: number;
  name: string;
  country: string | null;
  season: string;
  is_cup: boolean;
  active: boolean;
}

export const leagueRepository = {
  // Récupérer tous les championnats
  async getAllLeagues(): Promise<League[]> {
    const rows = await db.query<[number, string, string | null, string, number, number]>(
      "SELECT id, name, country, season, is_cup, active FROM leagues ORDER BY name ASC"
    );
    
    return rows.map(([id, name, country, season, is_cup, active]) => ({
      id,
      name,
      country,
      season,
      is_cup: Boolean(is_cup),
      active: Boolean(active)
    }));
  },
  
  // Récupérer les championnats actifs
  async getActiveLeagues(): Promise<League[]> {
    const rows = await db.query<[number, string, string | null, string, number, number]>(
      "SELECT id, name, country, season, is_cup, active FROM leagues WHERE active = 1 ORDER BY name ASC"
    );
    
    return rows.map(([id, name, country, season, is_cup, active]) => ({
      id,
      name,
      country,
      season,
      is_cup: Boolean(is_cup),
      active: Boolean(active)
    }));
  },
  
  // Récupérer un championnat par son ID
  async getLeagueById(id: number): Promise<League | null> {
    const rows = await db.query<[number, string, string | null, string, number, number]>(
      "SELECT id, name, country, season, is_cup, active FROM leagues WHERE id = $1",
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const [id_, name, country, season, is_cup, active] = rows[0];
    
    return {
      id: id_,
      name,
      country,
      season,
      is_cup: Boolean(is_cup),
      active: Boolean(active)
    };
  },
  
  // Créer un nouveau championnat
  async createLeague(league: Omit<League, "id">): Promise<number> {
    await db.query(
      "INSERT INTO leagues (name, country, season, is_cup, active) VALUES ($1, $2, $3, $4, $5)",
      [
        league.name, 
        league.country, 
        league.season, 
        league.is_cup ? 1 : 0, 
        league.active ? 1 : 0
      ]
    );
    
    return db.lastInsertRowId;
  },
  
  // Mettre à jour un championnat
  async updateLeague(id: number, league: Partial<League>): Promise<boolean> {
    try {
      const existingLeague = await this.getLeagueById(id);
      if (!existingLeague) {
        return false;
      }
      
      const updatedLeague = {
        ...existingLeague,
        ...league
      };
      
      await db.query(
        "UPDATE leagues SET name = $1, country = $2, season = $3, is_cup = $4, active = $5 WHERE id = $6",
        [
          updatedLeague.name,
          updatedLeague.country,
          updatedLeague.season,
          updatedLeague.is_cup ? 1 : 0,
          updatedLeague.active ? 1 : 0,
          id
        ]
      );
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du championnat:", error);
      return false;
    }
  },
  
  // Supprimer un championnat
  async deleteLeague(id: number): Promise<boolean> {
    try {
      await db.query("DELETE FROM leagues WHERE id = $1", [id]);
      return db.changes > 0;
    } catch (error) {
      console.error("Erreur lors de la suppression du championnat:", error);
      return false;
    }
  }
};