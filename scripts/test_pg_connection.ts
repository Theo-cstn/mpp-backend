// scripts/test_pg_connection.ts
import { db, initDatabase } from "../database.ts";

console.log("Test de connexion à PostgreSQL...");

async function testConnection() {
  try {
    // Initialiser la connexion
    console.log("Initialisation de la base de données...");
    await initDatabase();
    
    // Tester une requête simple
    console.log("Exécution d'une requête de test...");
    const timeResult = await db.queryObject<{
      now: Date,
      db_name: string
    }>(`
      SELECT 
        CURRENT_TIMESTAMP as now, 
        current_database() as db_name
    `);
    
    if (timeResult.length > 0) {
      console.log("✅ Connexion établie avec succès!");
      console.log(`Base de données: ${timeResult[0].db_name}`);
      console.log(`Timestamp serveur: ${timeResult[0].now}`);
    } else {
      console.log("⚠️ La requête n'a retourné aucun résultat");
    }
    
    // Vérifier les tables existantes
    console.log("\nListe des tables dans la base de données:");
    const tablesResult = await db.queryObject<{
      table_name: string
    }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.length === 0) {
      console.log("❌ Aucune table trouvée. La migration est-elle complète?");
    } else {
      console.log(`Nombre de tables: ${tablesResult.length}`);
      tablesResult.forEach((row, i) => {
        console.log(`${i + 1}. ${row.table_name}`);
      });
    }
    
    // Vérifier s'il y a des données dans les tables principales
    console.log("\nVérification des données:");
    
    // Utilisateurs
    const usersCount = await db.queryObject<{count: number}>(`SELECT COUNT(*) as count FROM users`);
    console.log(`- Utilisateurs: ${usersCount[0].count}`);
    
    // Équipes
    const teamsCount = await db.queryObject<{count: number}>(`SELECT COUNT(*) as count FROM teams`);
    console.log(`- Équipes: ${teamsCount[0].count}`);
    
    // Championnats
    const leaguesCount = await db.queryObject<{count: number}>(`SELECT COUNT(*) as count FROM leagues`);
    console.log(`- Championnats: ${leaguesCount[0].count}`);
    
    // Ligues privées
    const privateLeaguesCount = await db.queryObject<{count: number}>(`SELECT COUNT(*) as count FROM private_leagues`);
    console.log(`- Ligues privées: ${privateLeaguesCount[0].count}`);
    
    console.log("\n✅ Test de connexion terminé avec succès!");
    
  } catch (error) {
    console.error("❌ Erreur lors du test de connexion:", error);
  }
}

testConnection();