// scripts/create_leagues.ts
import { db } from "../database.ts";

console.log("Création des championnats avec IDs fixes...");

async function createLeagues() {
  try {
    // Championnats avec IDs fixes pour correspondre aux scripts d'équipes
    const leagues = [
      { id: 1, name: "Ligue 1", country: "France", season: "2024-2025", is_cup: false, active: true },
      { id: 2, name: "Premier League", country: "Angleterre", season: "2024-2025", is_cup: false, active: true },
      { id: 3, name: "La Liga", country: "Espagne", season: "2024-2025", is_cup: false, active: true },
      { id: 4, name: "Serie A", country: "Italie", season: "2024-2025", is_cup: false, active: true },
      { id: 5, name: "Bundesliga", country: "Allemagne", season: "2024-2025", is_cup: false, active: true },
      { id: 6, name: "UEFA Champions League", country: null, season: "2024-2025", is_cup: true, active: true }
    ];
    
    console.log("📋 Création de", leagues.length, "championnats...");
    
    await db.begin();
    
    for (const league of leagues) {
      try {
        await db.execute(
          "INSERT INTO leagues (id, name, country, season, is_cup, active) VALUES ($1, $2, $3, $4, $5, $6)",
          [league.id, league.name, league.country, league.season, league.is_cup, league.active]
        );
        console.log(`✅ ${league.name} créé (ID: ${league.id})`);
      } catch (error) {
        console.error(`❌ Erreur pour ${league.name}: ${error.message}`);
        throw error;
      }
    }
    
    await db.commit();
    
    // Vérification
    const created = await db.queryObject("SELECT id, name, country FROM leagues ORDER BY id");
    console.log(`\n🎉 ${created.length} championnats créés avec succès :`);
    created.forEach(l => console.log(`- ID ${l.id}: ${l.name} (${l.country || 'International'})`));
    
  } catch (error) {
    await db.rollback();
    console.error("❌ Erreur lors de la création des championnats:", error);
  } finally {
    await db.close();
  }
}

await createLeagues();