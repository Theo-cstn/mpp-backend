// models/user.ts - Adapté pour PostgreSQL avec correction BigInt
import { db } from "../database.ts";

export interface User {
  id?: number;
  username: string;
  password_hash?: string; // Optionnel car on ne veut pas toujours renvoyer le hash
  role: string;
  created_at?: string;
  points: number;
}

export const userRepository = {
  // Créer un nouvel utilisateur
  async createUser(username: string, passwordHash: string): Promise<number> {
    const result = await db.queryObject<{id: number}>(
      "INSERT INTO users (username, password_hash, role, points) VALUES ($1, $2, 'user', 0) RETURNING id",
      [username, passwordHash]
    );
    
    // Retourner l'ID comme Number (conversion automatique depuis BigInt si nécessaire)
    return Number(result[0].id);
  },
  
  // Récupérer un utilisateur par son nom d'utilisateur
  async getUserByUsername(username: string): Promise<User | null> {
    const rows = await db.queryObject<{
      id: number;
      username: string;
      password_hash: string;
      role: string;
      created_at: string;
      points: number;
    }>(
      "SELECT id, username, password_hash, role, created_at, points FROM users WHERE username = $1",
      [username]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    return {
      id: Number(row.id), // Conversion BigInt -> Number si nécessaire
      username: row.username,
      password_hash: row.password_hash,
      role: row.role,
      created_at: row.created_at,
      points: row.points,
    };
  },
  
  // Récupérer un utilisateur par son ID
  async getUserById(id: number): Promise<User | null> {
    const rows = await db.queryObject<{
      id: number;
      username: string;
      password_hash: string;
      role: string;
      created_at: string;
      points: number;
    }>(
      "SELECT id, username, password_hash, role, created_at, points FROM users WHERE id = $1",
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    return {
      id: Number(row.id), // Conversion BigInt -> Number si nécessaire
      username: row.username,
      password_hash: row.password_hash,
      role: row.role,
      created_at: row.created_at,
      points: row.points,
    };
  },
  
  // Lister tous les utilisateurs (avec pagination)
  async getAllUsers(limit = 10, offset = 0): Promise<User[]> {
    const rows = await db.queryObject<{
      id: number;
      username: string;
      role: string;
      created_at: string;
      points: number;
    }>(
      "SELECT id, username, role, created_at, points FROM users ORDER BY points DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    
    return rows.map(row => ({
      id: Number(row.id), // Conversion BigInt -> Number si nécessaire
      username: row.username,
      role: row.role,
      created_at: row.created_at,
      points: row.points
    }));
  },
  
  // Mettre à jour les points d'un utilisateur
  async updateUserPoints(userId: number, points: number): Promise<boolean> {
    try {
      await db.execute(
        "UPDATE users SET points = points + $1 WHERE id = $2",
        [points, userId]
      );
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour des points:", error);
      return false;
    }
  }
};