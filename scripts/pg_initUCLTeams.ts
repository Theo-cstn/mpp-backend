// scripts/pg_initUCLTeams.ts
import { db } from "../database.ts";

console.log("Initialisation des équipes de Champions League pour PostgreSQL...");

// Équipes européennes pour la Champions League
const uclTeams = [
  // Équipes déjà existantes qui participent aussi à la UCL
  { name: "Real Madrid", league_id: 6 },
  { name: "Barcelona", league_id: 6 },
  { name: "Bayern Munich", league_id: 6 },
  { name: "PSG", league_id: 6 },
  { name: "Manchester City", league_id: 6 },
  { name: "Arsenal", league_id: 6 },
  { name: "Inter Milan", league_id: 6 },
  { name: "AC Milan", league_id: 6 },
  
  // Nouvelles équipes
  { name: "Porto", league_id: 6 },
  { name: "Benfica", league_id: 6 },
  { name: "Ajax", league_id: 6 },
  { name: "RB Leipzig", league_id: 6 },
  { name: "Napoli", league_id: 6 },
  { name: "Atletico Madrid", league_id: 6 },
  { name: "Borussia Dortmund", league_id: 6 },
  { name: "Celtic", league_id: 6 },
];

async function initUCLTeams() {
  try {
    console.log("Ajout des équipes pour la Champions League (league_id: 6)");
    
    // Vérifier que le championnat UCL existe (league_id: 6)
    const uclLeague = await db.queryObject(
      "SELECT id FROM leagues WHERE id = $1",
      [6]
    );
    
    if (uclLeague.length === 0) {
      console.log("Attention: Le championnat UCL (id: 6) n'existe pas. Création automatique...");
      await db.query(
        "INSERT INTO leagues (id, name, country, season, is_cup, active) VALUES ($1, $2, $3, $4, $5, $6)",
        [6, "UEFA Champions League", null, "2023-2024", true, true]
      );
      console.log("✓ Championnat UCL créé");
    }
    
    // Démarrer une transaction
    await db.begin();
    
    for (const team of uclTeams) {
      try {
        // Vérifier si l'équipe existe déjà dans la Champions League
        const existing = await db.queryObject(
          "SELECT id FROM teams WHERE name = $1 AND league_id = $2",
          [team.name, team.league_id]
        );
        
        if (existing.length > 0) {
          console.log(`✓ ${team.name} existe déjà en Champions League`);
        } else {
          await db.query(
            "INSERT INTO teams (name, league_id, logo_url) VALUES ($1, $2, $3)",
            [team.name, team.league_id, null]
          );
          console.log(`✓ ${team.name} ajoutée à la Champions League`);
        }
      } catch (error) {
        console.error(`✗ Erreur pour ${team.name}: ${error.message}`);
        throw error;  // Pour déclencher le rollback
      }
    }
    
    // Valider la transaction
    await db.commit();
    
    // Afficher un résumé
    const totalUCLTeamsResult = await db.queryObject<{ count: number }>(
      "SELECT COUNT(*) as count FROM teams WHERE league_id = $1",
      [6]
    );
    const totalUCLTeams = totalUCLTeamsResult[0]?.count || 0;
    
    console.log(`\nTotal des équipes en Champions League : ${totalUCLTeams}`);
    console.log("\nScript terminé avec succès.");
    
  } catch (error) {
    await db.rollback();
    console.error("Erreur:", error);
  } finally {
    await db.close();
  }
}

await initUCLTeams();