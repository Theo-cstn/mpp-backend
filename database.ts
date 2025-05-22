// database.ts - Version PostgreSQL pour production Dokku
import { Pool, PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

// Configuration adaptée pour Dokku
function getDbConfig() {
  // En production, Dokku fournit DATABASE_URL
  const databaseUrl = Deno.env.get("DATABASE_URL");
  
  if (databaseUrl) {
    console.log("✅ Utilisation de DATABASE_URL fournie par Dokku");
    return databaseUrl;
  }

  // Fallback pour le développement local (garder votre db_config.ts)
  const dbConfig = {
    hostname: Deno.env.get("DB_HOST") || "localhost",
    port: parseInt(Deno.env.get("DB_PORT") || "5432"),
    user: Deno.env.get("DB_USER") || "postgres",
    password: Deno.env.get("DB_PASSWORD") || "postgres",
    database: Deno.env.get("DB_NAME") || "mpp",
    tls: { enabled: false },
    poolSize: parseInt(Deno.env.get("DB_POOL_SIZE") || "10"),
  };
  
  return dbConfig;
}

// Pool de connexions PostgreSQL
const pool = new Pool(getDbConfig(), 10);

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
  
  // Exécuter une requête sans résultat attendu
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
  
  // Exécuter une requête avec retour de résultats
  async query<T extends unknown[]>(sql: string, params: any[] = []): Promise<T[]> {
    await this.connect();
    try {
      const result = await this.client!.queryArray<T>(sql, params);
      this._changes = result.rowCount || 0;
      
      // Pour les requêtes INSERT qui retournent un ID
      if (sql.trim().toUpperCase().startsWith("INSERT") && result.rowCount > 0) {
        const tableMatch = sql.match(/INSERT\s+INTO\s+([^\s(]+)/i);
        if (tableMatch && tableMatch[1]) {
          const table = tableMatch[1].trim().replace(/[^a-zA-Z0-9_]/g, '');
          try {
            const idResult = await this.client!.queryObject<{ id: number }>(
              `SELECT currval(pg_get_serial_sequence($1, 'id')) as id`,
              [table]
            );
            if (idResult.rows.length > 0) {
              this._lastInsertRowId = idResult.rows[0].id;
            }
          } catch (e) {
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

// Scripts SQL intégrés (PLUS BESOIN de script externe)
const createTablesSQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    points INTEGER DEFAULT 0
  )`,
  
  `CREATE TABLE IF NOT EXISTS leagues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50),
    season VARCHAR(30) NOT NULL,
    is_cup BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true
  )`,
  
  `CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    league_id INTEGER NOT NULL,
    logo_url TEXT,
    FOREIGN KEY (league_id) REFERENCES leagues(id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    match_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    round VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES leagues(id),
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    home_score_prediction INTEGER NOT NULL,
    away_score_prediction INTEGER NOT NULL,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (match_id) REFERENCES matches(id),
    UNIQUE(user_id, match_id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS private_leagues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    max_members INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS private_league_members (
    id SERIAL PRIMARY KEY,
    private_league_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) DEFAULT 'member' NOT NULL,
    points INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (private_league_id) REFERENCES private_leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(private_league_id, user_id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS league_messages (
    id SERIAL PRIMARY KEY,
    private_league_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (private_league_id) REFERENCES private_leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`
];

// Index pour améliorer les performances
const createIndexesSQL = [
  `CREATE INDEX IF NOT EXISTS idx_private_league_members_league ON private_league_members(private_league_id)`,
  `CREATE INDEX IF NOT EXISTS idx_private_league_members_user ON private_league_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_private_leagues_invite_code ON private_leagues(invite_code)`,
  `CREATE INDEX IF NOT EXISTS idx_league_messages_league ON league_messages(private_league_id)`,
  `CREATE INDEX IF NOT EXISTS idx_league_messages_user ON league_messages(user_id)`
];

// Trigger pour synchroniser les points
const createTriggerSQL = `
CREATE OR REPLACE FUNCTION sync_private_league_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE private_league_members
    SET points = NEW.points
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_private_league_points ON users;
CREATE TRIGGER sync_private_league_points
AFTER UPDATE OF points ON users
FOR EACH ROW
WHEN (NEW.points != OLD.points)
EXECUTE FUNCTION sync_private_league_points();
`;

// Initialiser la base de données SANS script externe
export async function initDatabase() {
  try {
    console.log("Initialisation de la base de données PostgreSQL");
    
    // Créer les tables directement
    for (const sql of createTablesSQL) {
      await db.execute(sql);
    }
    console.log("✅ Tables créées");
    
    // Créer les index
    for (const sql of createIndexesSQL) {
      await db.execute(sql);
    }
    console.log("✅ Index créés");
    
    // Créer le trigger
    await db.execute(createTriggerSQL);
    console.log("✅ Trigger créé");
    
    // Vérifier si on doit insérer des données par défaut
    const leaguesCount = await db.queryObject<{ count: number }>(`
      SELECT COUNT(*) as count FROM leagues
    `);
    
    if (leaguesCount.length > 0 && leaguesCount[0].count === 0) {
      console.log("Insertion des championnats par défaut...");
      
      await db.execute(`
        INSERT INTO leagues (name, country, season, is_cup, active) VALUES
        ('Ligue 1', 'France', '2023-2024', false, true),
        ('Premier League', 'Angleterre', '2023-2024', false, true),
        ('La Liga', 'Espagne', '2023-2024', false, true),
        ('Serie A', 'Italie', '2023-2024', false, true),
        ('Bundesliga', 'Allemagne', '2023-2024', false, true),
        ('UEFA Champions League', NULL, '2023-2024', true, true)
      `);
      
      console.log("✅ Championnats par défaut ajoutés");
    }
    
    console.log("✅ Base de données initialisée");
    
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la base de données:", error);
    // Ne pas faire planter l'app si la DB existe déjà
  }
}

// Fermer la connexion
export async function closeDatabase() {
  try {
    await db.close();
    await pool.end();
    console.log("Connexion à la base de données fermée");
  } catch (error) {
    console.error("❌ Erreur lors de la fermeture de la DB:", error);
  }
}