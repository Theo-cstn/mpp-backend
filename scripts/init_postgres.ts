// scripts/init_postgres.ts - Script pour initialiser la structure PostgreSQL

import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { dbConfig } from "../db_config.ts";

// Scripts SQL pour PostgreSQL (adaptés de SQLite)
const createUsersTableSQL = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    points INTEGER DEFAULT 0
);
`;

const createLeaguesTableSQL = `
CREATE TABLE IF NOT EXISTS leagues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50),
    season VARCHAR(30) NOT NULL,
    is_cup BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true
);
`;

const createTeamsTableSQL = `
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    league_id INTEGER NOT NULL,
    logo_url TEXT,
    FOREIGN KEY (league_id) REFERENCES leagues(id)
);
`;

const createMatchesTableSQL = `
CREATE TABLE IF NOT EXISTS matches (
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
);
`;

const createPredictionsTableSQL = `
CREATE TABLE IF NOT EXISTS predictions (
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
);
`;

const createPrivateLeaguesTableSQL = `
CREATE TABLE IF NOT EXISTS private_leagues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    max_members INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);
`;

const createPrivateLeagueMembersTableSQL = `
CREATE TABLE IF NOT EXISTS private_league_members (
    id SERIAL PRIMARY KEY,
    private_league_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) DEFAULT 'member' NOT NULL,
    points INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (private_league_id) REFERENCES private_leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(private_league_id, user_id)
);
`;

const createLeagueMessagesTableSQL = `
CREATE TABLE IF NOT EXISTS league_messages (
    id SERIAL PRIMARY KEY,
    private_league_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (private_league_id) REFERENCES private_leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const createIndexesSQL = `
CREATE INDEX IF NOT EXISTS idx_private_league_members_league ON private_league_members(private_league_id);
CREATE INDEX IF NOT EXISTS idx_private_league_members_user ON private_league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_private_leagues_invite_code ON private_leagues(invite_code);
CREATE INDEX IF NOT EXISTS idx_league_messages_league ON league_messages(private_league_id);
CREATE INDEX IF NOT EXISTS idx_league_messages_user ON league_messages(user_id);
`;

// Trigger pour synchroniser les points des utilisateurs avec leurs points dans les ligues
const createTriggerSQL = `
CREATE OR REPLACE FUNCTION sync_private_league_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour tous les membres de ligues privées associés à cet utilisateur
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

// Vérifier et créer la structure de la base de données
async function initDatabaseStructure() {
  console.log("🚀 Initialisation de la structure PostgreSQL...");
  
  // Connexion à PostgreSQL
  const pgPool = new Pool(dbConfig, 3);
  const pgClient = await pgPool.connect();
  
  try {
    // Créer les tables dans l'ordre (dépendances)
    console.log("Création des tables...");
    await pgClient.queryArray(createUsersTableSQL);
    await pgClient.queryArray(createLeaguesTableSQL);
    await pgClient.queryArray(createTeamsTableSQL);
    await pgClient.queryArray(createMatchesTableSQL);
    await pgClient.queryArray(createPredictionsTableSQL);
    await pgClient.queryArray(createPrivateLeaguesTableSQL);
    await pgClient.queryArray(createPrivateLeagueMembersTableSQL);
    await pgClient.queryArray(createLeagueMessagesTableSQL);
    
    // Créer les index
    console.log("Création des index...");
    await pgClient.queryArray(createIndexesSQL);
    
    // Créer le trigger
    console.log("Création du trigger...");
    await pgClient.queryArray(createTriggerSQL);
    
    console.log("✅ Structure de base de données PostgreSQL créée avec succès");
    
    // Vérifier si on doit insérer des données par défaut
    const leaguesCount = await pgClient.queryObject<{ count: number }>(`
      SELECT COUNT(*) as count FROM leagues
    `);
    
    if (leaguesCount.rows[0].count === 0) {
      console.log("Insertion des championnats par défaut...");
      
      await pgClient.queryArray(`
        INSERT INTO leagues (name, country, season, is_cup, active) VALUES
        ('Ligue 1', 'France', '2023-2024', false, true),
        ('Premier League', 'Angleterre', '2023-2024', false, true),
        ('La Liga', 'Espagne', '2023-2024', false, true),
        ('Serie A', 'Italie', '2023-2024', false, true),
        ('Bundesliga', 'Allemagne', '2023-2024', false, true),
        ('UEFA Champions League', NULL, '2023-2024', true, true);
      `);
      
      console.log("✅ Championnats par défaut ajoutés");
    }
    
  } catch (error) {
    console.error("❌ Erreur d'initialisation:", error);
  } finally {
    // Fermer la connexion
    pgClient.release();
    await pgPool.end();
    console.log("Connexion fermée");
  }
}

// Exécuter l'initialisation
await initDatabaseStructure();