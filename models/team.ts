// models/team.ts
import { db } from "../database.ts";

export interface Team {
  id?: number;
  name: string;
  league_id: number;
  logo_url?: string;
}

export const teamRepository = {
  // Récupérer toutes les équipes
  async getAllTeams(): Promise<Team[]> {
    const rows = await db.query<[number, string, number, string | null]>(
      "SELECT id, name, league_id, logo_url FROM teams ORDER BY name ASC"
    );
    
    return rows.map(([id, name, league_id, logo_url]) => ({
      id,
      name,
      league_id,
      logo_url: logo_url || undefined
    }));
  },
  
  // Récupérer les équipes d'un championnat spécifique
  async getTeamsByLeague(leagueId: number): Promise<Team[]> {
    const rows = await db.query<[number, string, number, string | null]>(
      "SELECT id, name, league_id, logo_url FROM teams WHERE league_id = $1 ORDER BY name ASC",
      [leagueId]
    );
    
    return rows.map(([id, name, league_id, logo_url]) => ({
      id,
      name,
      league_id,
      logo_url: logo_url || undefined
    }));
  },
  
  // Récupérer une équipe par son ID
  async getTeamById(id: number): Promise<Team | null> {
    const rows = await db.query<[number, string, number, string | null]>(
      "SELECT id, name, league_id, logo_url FROM teams WHERE id = $1",
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const [id_, name, league_id, logo_url] = rows[0];
    
    return {
      id: id_,
      name,
      league_id,
      logo_url: logo_url || undefined
    };
  },
  
  // Créer une nouvelle équipe
  async createTeam(team: Omit<Team, "id">): Promise<number> {
    await db.query(
      "INSERT INTO teams (name, league_id, logo_url) VALUES ($1, $2, $3)",
      [team.name, team.league_id, team.logo_url || null]
    );
    
    return db.lastInsertRowId;
  },
  
  // Mettre à jour une équipe
  async updateTeam(id: number, team: Partial<Team>): Promise<boolean> {
    try {
      const existingTeam = await this.getTeamById(id);
      if (!existingTeam) {
        return false;
      }
      
      const updatedTeam = {
        ...existingTeam,
        ...team
      };
      
      await db.query(
        "UPDATE teams SET name = $1, league_id = $2, logo_url = $3 WHERE id = $4",
        [
          updatedTeam.name,
          updatedTeam.league_id,
          updatedTeam.logo_url || null,
          id
        ]
      );
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'équipe:", error);
      return false;
    }
  },
  
  // Supprimer une équipe
  async deleteTeam(id: number): Promise<boolean> {
    try {
      await db.query("DELETE FROM teams WHERE id = $1", [id]);
      return db.changes > 0;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'équipe:", error);
      return false;
    }
  }
};