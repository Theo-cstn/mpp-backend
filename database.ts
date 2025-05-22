// database.ts - Version PostgreSQL optimisée
import { Pool, PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { dbConfig } from "./db_config.ts";

// Pool de connexions PostgreSQL
const pool = new Pool(dbConfig, dbConfig.poolSize);

// Interface pour unifier l'API entre SQLite et PostgreSQL
class PostgresAdapter {
  private client: PoolClient | null = null;
  private inTransaction = false;
  private _lastInsertRowId = 0;
  private _changes = 0;
  
  // Obtenir une connexion client du pool
  async connect(): Promise<void> {
    if (!this.client) {
      this.client = await pool.connect();
    }
  }
  
  // Exécuter une requête sans résultat attendu (comme db.execute dans SQLite)
  async execute(sql: string, params: any[] = []): Promise<void> {
    await this.connect();
    try {
      const result = await this.client!.queryArray(sql, params);
      this._changes = result.rowCount || 0;
    } catch (error) {
      console.error("Erreur SQL:", error);
      throw error;
    }
  }
  
  // Exécuter une requête avec retour de résultats (comme db.query dans SQLite)
  async query<T extends unknown[]>(sql: string, params: any[] = []): Promise<T[]> {
    await this.connect();
    try {
      const result = await this.client!.queryArray<T>(sql, params);
      this._changes = result.rowCount || 0;
      
      // Pour les requêtes INSERT qui retournent un ID
      if (sql.trim().toUpperCase().startsWith("INSERT") && result.rowCount > 0) {
        const tableMatch = sql.match(/INSERT\s+INTO\s+([^\s(]+)/i);
        if (tableMatch && tableMatch[1]) {
          const table = tableMatch[1].trim().replace(/[^a-zA-Z0-9_]/g, ''); // Nettoyer le nom de table
          try {
            const idResult = await this.client!.queryObject<{ id: number }>(
              `SELECT currval(pg_get_serial_sequence($1, 'id')) as id`,
              [table]
            );
            if (idResult.rows.length > 0) {
              this._lastInsertRowId = idResult.rows[0].id;
            }
          } catch (e) {
            // Ignorer les erreurs (ex: si la table n'a pas de sequence)
            console.log(`Note: Impossible de récupérer l'ID inséré pour ${table}`);
          }
        }
      }
      
      return result.rows;
    } catch (error) {
      console.error("Erreur SQL:", error);
      throw error;
    }
  }
  
  // Exécuter une requête et récupérer des objets
  async queryObject<T extends Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
    await this.connect();
    try {
      const result = await this.client!.queryObject<T>(sql, params);
      this._changes = result.rowCount || 0;
      return result.rows;
    } catch (error) {
      console.error("Erreur SQL:", error);
      throw error;
    }
  }
  
  // Fermer la connexion si elle n'est pas utilisée dans une transaction
  async close(): Promise<void> {
    if (this.client && !this.inTransaction) {
      this.client.release();
      this.client = null;
    }
  }
  
  // Méthodes de gestion des transactions
  async begin(): Promise<void> {
    await this.connect();
    await this.client!.queryArray("BEGIN");
    this.inTransaction = true;
  }
  
  async commit(): Promise<void> {
    if (this.client && this.inTransaction) {
      await this.client.queryArray("COMMIT");
      this.inTransaction = false;
      await this.close();
    }
  }
  
  async rollback(): Promise<void> {
    if (this.client && this.inTransaction) {
      await this.client.queryArray("ROLLBACK");
      this.inTransaction = false;
      await this.close();
    }
  }
  
  // Propriétés pour la compatibilité avec SQLite
  get lastInsertRowId(): number {
    return this._lastInsertRowId;
  }
  
  get changes(): number {
    return this._changes;
  }
}

// Créer l'instance principale de la base de données
export const db = new PostgresAdapter();

// Initialiser la base de données (créer les tables, etc.)
export async function initDatabase() {
  try {
    console.log("Initialisation de la base de données PostgreSQL");
    
    // Exécuter le script init_postgres.ts pour créer toute la structure
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-net",
        "--allow-read",
        "--allow-env",
        "scripts/init_postgres.ts"
      ],
    });
    
    const { code, stdout, stderr } = await command.output();
    
    if (code === 0) {
      console.log(new TextDecoder().decode(stdout));
      console.log("Base de données PostgreSQL initialisée avec succès");
    } else {
      console.error("Erreur lors de l'initialisation:", new TextDecoder().decode(stderr));
    }
    
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la base de données:", error);
  }
}

// Fermer la connexion
export async function closeDatabase() {
  await db.close();
  await pool.end();
  console.log("Connexion à la base de données fermée");
}