// models/leagueChat.ts
import { db } from "../database.ts";

export interface LeagueMessage {
  id?: number;
  private_league_id: number;
  user_id: number;
  username?: string; // Join avec users
  message: string;
  created_at?: string;
}

export const leagueChatRepository = {
  // Ajouter un message dans une ligue
  async addMessage(message: Omit<LeagueMessage, "id" | "created_at" | "username">): Promise<number> {
    await db.query(
      `INSERT INTO league_messages (private_league_id, user_id, message) 
       VALUES ($1, $2, $3)`,
      [
        message.private_league_id,
        message.user_id,
        message.message
      ]
    );
    
    return db.lastInsertRowId;
  },
  
  // Récupérer les derniers messages d'une ligue (avec username)
  async getLeagueMessages(leagueId: number, limit = 50): Promise<LeagueMessage[]> {
    const rows = await db.query<[number, number, number, string, string, string]>(
      `SELECT 
        lm.id, lm.private_league_id, lm.user_id, u.username, lm.message, lm.created_at
      FROM league_messages lm
      JOIN users u ON lm.user_id = u.id
      WHERE lm.private_league_id = $1
      ORDER BY lm.created_at DESC
      LIMIT $2`,
      [leagueId, limit]
    );
    
    // Inverser pour avoir les messages les plus anciens en premier
    return rows.reverse().map(([id, private_league_id, user_id, username, message, created_at]) => ({
      id,
      private_league_id,
      user_id,
      username,
      message,
      created_at
    }));
  },
  
  // Supprimer les messages d'une ligue (pour nettoyage)
  async deleteLeagueMessages(leagueId: number): Promise<boolean> {
    try {
      await db.query(
        "DELETE FROM league_messages WHERE private_league_id = $1",
        [leagueId]
      );
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression des messages:", error);
      return false;
    }
  }
};