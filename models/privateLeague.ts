// models/privateLeague.ts 
import { db } from "../database.ts";

export interface PrivateLeague {
  id?: number;
  name: string;
  description?: string;
  creator_id: number;
  invite_code: string;
  max_members: number;
  is_active: boolean;
  created_at?: string;
}

export interface PrivateLeagueMember {
  id?: number;
  private_league_id: number;
  user_id: number;
  role: 'admin' | 'member';
  points: number;
  joined_at?: string;
}

export interface PrivateLeagueWithDetails extends PrivateLeague {
  creator_username: string;
  member_count: number;
}

export interface PrivateLeagueMemberWithDetails extends PrivateLeagueMember {
  username: string;
  league_name: string;
}

export const privateLeagueRepository = {
  // Générer un code d'invitation unique
  generateInviteCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  },

  // Créer une nouvelle ligue privée
  async createPrivateLeague(league: Omit<PrivateLeague, "id" | "created_at" | "invite_code">): Promise<number> {
    let inviteCode = this.generateInviteCode();
    
    // Vérifier que le code est unique
    let existingLeague = await this.getPrivateLeagueByInviteCode(inviteCode);
    while (existingLeague) {
      inviteCode = this.generateInviteCode();
      existingLeague = await this.getPrivateLeagueByInviteCode(inviteCode);
    }
    
    // Utiliser queryObject pour récupérer l'ID inséré
    const result = await db.queryObject<{id: number}>(
      `INSERT INTO private_leagues (name, description, creator_id, invite_code, max_members, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        league.name,
        league.description || null,
        league.creator_id,
        inviteCode,
        league.max_members,
        league.is_active ? true : false
      ]
    );
    
    const leagueId = result[0].id;
    
    // Ajouter le créateur comme admin de la ligue
    await this.addMember(leagueId, league.creator_id, 'admin');
    
    return leagueId;
  },

  // Récupérer une ligue par son ID
  async getPrivateLeagueById(id: number): Promise<PrivateLeagueWithDetails | null> {
    const rows = await db.queryObject<{
      id: number;
      name: string;
      description: string | null;
      creator_id: number;
      invite_code: string;
      max_members: number;
      is_active: boolean;
      created_at: string;
      creator_username: string;
      member_count: bigint; // PostgreSQL COUNT retourne un BigInt
    }>(`
      SELECT 
        pl.id, pl.name, pl.description, pl.creator_id, pl.invite_code, 
        pl.max_members, pl.is_active, pl.created_at, u.username as creator_username,
        (SELECT COUNT(*) FROM private_league_members WHERE private_league_id = pl.id) as member_count
      FROM private_leagues pl
      JOIN users u ON pl.creator_id = u.id
      WHERE pl.id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      creator_id: row.creator_id,
      invite_code: row.invite_code,
      max_members: row.max_members,
      is_active: row.is_active,
      created_at: row.created_at,
      creator_username: row.creator_username,
      member_count: Number(row.member_count) // Convertir BigInt en Number
    };
  },

  // Récupérer une ligue par son code d'invitation
  async getPrivateLeagueByInviteCode(inviteCode: string): Promise<PrivateLeague | null> {
    const rows = await db.queryObject<{
      id: number;
      name: string;
      description: string | null;
      creator_id: number;
      invite_code: string;
      max_members: number;
      is_active: boolean;
      created_at: string;
    }>(`
      SELECT id, name, description, creator_id, invite_code, max_members, is_active, created_at 
      FROM private_leagues 
      WHERE invite_code = $1`,
      [inviteCode]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      creator_id: row.creator_id,
      invite_code: row.invite_code,
      max_members: row.max_members,
      is_active: row.is_active,
      created_at: row.created_at
    };
  },

  // Récupérer toutes les ligues d'un utilisateur
  async getUserPrivateLeagues(userId: number): Promise<PrivateLeagueWithDetails[]> {
    const rows = await db.queryObject<{
      id: number;
      name: string;
      description: string | null;
      creator_id: number;
      invite_code: string;
      max_members: number;
      is_active: boolean;
      created_at: string;
      creator_username: string;
      member_count: bigint; // PostgreSQL COUNT retourne un BigInt
      role: string;
    }>(`
      SELECT 
        pl.id, pl.name, pl.description, pl.creator_id, pl.invite_code, 
        pl.max_members, pl.is_active, pl.created_at, u.username as creator_username,
        (SELECT COUNT(*) FROM private_league_members WHERE private_league_id = pl.id) as member_count,
        plm.role
      FROM private_leagues pl
      JOIN users u ON pl.creator_id = u.id
      JOIN private_league_members plm ON pl.id = plm.private_league_id
      WHERE plm.user_id = $1 AND pl.is_active = true
      ORDER BY pl.created_at DESC`,
      [userId]
    );
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      creator_id: row.creator_id,
      invite_code: row.invite_code,
      max_members: row.max_members,
      is_active: row.is_active,
      created_at: row.created_at,
      creator_username: row.creator_username,
      member_count: Number(row.member_count) // Convertir BigInt en Number
    }));
  },

  // Ajouter un membre à une ligue
  async addMember(leagueId: number, userId: number, role: 'admin' | 'member' = 'member'): Promise<boolean> {
    try {
      // Vérifier si l'utilisateur n'est pas déjà membre
      const existing = await db.queryObject<{id: number}>(
        `SELECT id FROM private_league_members 
         WHERE private_league_id = $1 AND user_id = $2`,
        [leagueId, userId]
      );
      
      if (existing.length > 0) {
        return false; // Déjà membre
      }
      
      // Vérifier si la ligue n'est pas pleine
      const memberCountResult = await db.queryObject<{count: bigint}>(
        `SELECT COUNT(*) as count FROM private_league_members 
         WHERE private_league_id = $1`,
        [leagueId]
      );
      const memberCount = Number(memberCountResult[0].count); // Convertir BigInt en Number
      
      const league = await this.getPrivateLeagueById(leagueId);
      if (!league || memberCount >= league.max_members) {
        return false; // Ligue pleine ou inexistante
      }
      
      // Récupérer les points actuels de l'utilisateur
      const userResult = await db.queryObject<{points: number}>(
        `SELECT points FROM users WHERE id = $1`,
        [userId]
      );
      const userPoints = userResult.length > 0 ? userResult[0].points : 0;
      
      // Ajouter le membre avec ses points actuels
      await db.execute(
        `INSERT INTO private_league_members (private_league_id, user_id, role, points) 
         VALUES ($1, $2, $3, $4)`,
        [leagueId, userId, role, userPoints]
      );
      
      return true;
    } catch (error) {
      console.error("Erreur lors de l'ajout du membre:", error);
      return false;
    }
  },

  // Retirer un membre d'une ligue
  async removeMember(leagueId: number, userId: number): Promise<boolean> {
    try {
      await db.execute(
        `DELETE FROM private_league_members 
         WHERE private_league_id = $1 AND user_id = $2`,
        [leagueId, userId]
      );
      
      return db.changes > 0;
    } catch (error) {
      console.error("Erreur lors de la suppression du membre:", error);
      return false;
    }
  },

  // Récupérer les membres d'une ligue
  async getLeagueMembers(leagueId: number): Promise<PrivateLeagueMemberWithDetails[]> {
    const rows = await db.queryObject<{
      id: number;
      private_league_id: number;
      user_id: number;
      role: string;
      points: number;
      joined_at: string;
      username: string;
      league_name: string;
    }>(`
      SELECT 
        plm.id, plm.private_league_id, plm.user_id, plm.role, plm.points, plm.joined_at,
        u.username, pl.name as league_name
      FROM private_league_members plm
      JOIN users u ON plm.user_id = u.id
      JOIN private_leagues pl ON plm.private_league_id = pl.id
      WHERE plm.private_league_id = $1
      ORDER BY plm.points DESC, plm.joined_at ASC`,
      [leagueId]
    );
    
    return rows.map(row => ({
      id: row.id,
      private_league_id: row.private_league_id,
      user_id: row.user_id,
      role: row.role as 'admin' | 'member',
      points: row.points,
      joined_at: row.joined_at,
      username: row.username,
      league_name: row.league_name
    }));
  },

  // Mettre à jour les points d'un membre dans une ligue
  async updateMemberPoints(leagueId: number, userId: number, points: number): Promise<boolean> {
    try {
      await db.execute(
        `UPDATE private_league_members 
         SET points = points + $1 
         WHERE private_league_id = $2 AND user_id = $3`,
        [points, leagueId, userId]
      );
      
      return db.changes > 0;
    } catch (error) {
      console.error("Erreur lors de la mise à jour des points:", error);
      return false;
    }
  },

  // Supprimer une ligue (hard delete)
  async deletePrivateLeague(leagueId: number): Promise<boolean> {
    try {
      // Transaction pour s'assurer que tout est supprimé ou rien ne l'est
      await db.begin();
      
      try {
        // 1. Supprimer tous les messages du chat de cette ligue
        await db.execute(
          "DELETE FROM league_messages WHERE private_league_id = $1", 
          [leagueId]
        );
        
        // 2. Supprimer tous les membres de cette ligue
        await db.execute(
          "DELETE FROM private_league_members WHERE private_league_id = $1", 
          [leagueId]
        );
        
        // 3. Enfin, supprimer la ligue elle-même
        await db.execute(
          "DELETE FROM private_leagues WHERE id = $1", 
          [leagueId]
        );
        
        // Valider la transaction
        await db.commit();
        
        return true;
      } catch (error) {
        // En cas d'erreur, annuler toutes les modifications
        await db.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la ligue:", error);
      return false;
    }
  },

  // Vérifier si un utilisateur est admin d'une ligue
  async isUserAdminOfLeague(leagueId: number, userId: number): Promise<boolean> {
    const rows = await db.queryObject<{role: string}>(
      `SELECT role FROM private_league_members 
       WHERE private_league_id = $1 AND user_id = $2`,
      [leagueId, userId]
    );
    
    return rows.length > 0 && rows[0].role === 'admin';
  }
};