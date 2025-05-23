// scripts/update_season.ts
import { db } from "../database.ts";

console.log("Mise à jour de la saison des championnats...");

async function updateSeason() {
  try {
    const newSeason = "2024-2025";
    
    // Afficher les championnats actuels
    const current = await db.queryObject("SELECT id, name, season FROM leagues ORDER BY id");
    console.log("📋 Championnats actuels :");
    current.forEach(l => console.log(`- ID ${l.id}: ${l.name} (${l.season})`));
    
    // Mettre à jour la saison
    console.log(`\n🔄 Mise à jour vers la saison ${newSeason}...`);
    
    await db.execute(
      "UPDATE leagues SET season = $1",
      [newSeason]
    );
    
    // Vérifier le résultat
    const updated = await db.queryObject("SELECT id, name, season FROM leagues ORDER BY id");
    console.log("\n✅ Championnats mis à jour :");
    updated.forEach(l => console.log(`- ID ${l.id}: ${l.name} (${l.season})`));
    
    console.log(`\n🎉 Tous les championnats sont maintenant en saison ${newSeason}`);
    
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour :", error);
  } finally {
    await db.close();
  }
}

await updateSeason();