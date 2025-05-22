// scripts/pg_initTeams.ts
import { db } from "../database.ts";

console.log("Initialisation des équipes pour PostgreSQL...");

const teams = [
  // Ligue 1 (France)
  { name: "PSG", league_id: 1, logo_url: null },
  { name: "Marseille", league_id: 1, logo_url: null },
  { name: "Lyon", league_id: 1, logo_url: null },
  { name: "Monaco", league_id: 1, logo_url: null },
  
  // Premier League (England)
  { name: "Manchester United", league_id: 2, logo_url: null },
  { name: "Liverpool", league_id: 2, logo_url: null },
  { name: "Arsenal", league_id: 2, logo_url: null },
  { name: "Chelsea", league_id: 2, logo_url: null },
  
  // La Liga (Spain)
  { name: "Real Madrid", league_id: 3, logo_url: null },
  { name: "Barcelona", league_id: 3, logo_url: null },
  { name: "Atletico Madrid", league_id: 3, logo_url: null },
  
  // Serie A (Italy)
  { name: "Juventus", league_id: 4, logo_url: null },
  { name: "AC Milan", league_id: 4, logo_url: null },
  { name: "Inter Milan", league_id: 4, logo_url: null },
  
  // Bundesliga (Germany)
  { name: "Bayern Munich", league_id: 5, logo_url: null },
  { name: "Borussia Dortmund", league_id: 5, logo_url: null },
];

async function initTeams() {
  try {
    // Vérifier s'il y a déjà des équipes
    const existingTeamsResult = await db.queryObject<{ count: number }>("SELECT COUNT(*) as count FROM teams");
    const existingCount = existingTeamsResult[0]?.count || 0;
    
    if (existingCount > 0) {
      console.log(`Il y a déjà ${existingCount} équipes dans la base de données.`);
      const response = prompt("Voulez-vous les supprimer et réinsérer ? (y/n): ");
      
      if (response?.toLowerCase() === 'y') {
        await db.execute("DELETE FROM teams");
        console.log("Équipes existantes supprimées.");
      } else {
        console.log("Opération annulée.");
        return;
      }
    }
    
    // Utiliser une transaction pour garantir l'intégrité
    await db.begin();
    
    for (const team of teams) {
      try {
        await db.query(
          "INSERT INTO teams (name, league_id, logo_url) VALUES ($1, $2, $3)",
          [team.name, team.league_id, team.logo_url]
        );
        console.log(`✓ ${team.name} ajoutée`);
      } catch (error) {
        console.error(`✗ Erreur pour ${team.name}: ${error.message}`);
        throw error; // Pour déclencher le rollback
      }
    }
    
    // Valider la transaction
    await db.commit();
    
    // Vérification après insertion
    const teamsAfter = await db.queryObject("SELECT * FROM teams ORDER BY id");
    console.log(`${teamsAfter.length} équipes ajoutées avec succès.`);
    
  } catch (error) {
    await db.rollback();
    console.error("Erreur lors de l'initialisation des équipes:", error);
  } finally {
    await db.close();
  }
}

// Exécuter la fonction principale
await initTeams();