import * as SQLite from "expo-sqlite";

// Abrimos la base de datos
export const db = SQLite.openDatabaseSync("piscicola_local.db");

// 1. Variable de control interna
let isDbInitialized = false;

export const initLocalDb = () => {
  // 2. Si ya se inicializó en esta sesión, salimos de la función inmediatamente
  if (isDbInitialized) return;

  try {
    // Usamos una sola transacción para ser más rápidos
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_farms (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        user_id TEXT
      );

      CREATE TABLE IF NOT EXISTS local_ponds (
        id TEXT PRIMARY KEY NOT NULL,
        farm_id TEXT NOT NULL,
        name TEXT NOT NULL,
        area DECIMAL,
        capacity INTEGER
      );

      CREATE TABLE IF NOT EXISTS local_inventory (
        id TEXT PRIMARY KEY NOT NULL,
        farm_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        stock_actual DECIMAL DEFAULT 0,
        unit TEXT DEFAULT 'kg',
        is_satellite BOOLEAN DEFAULT 0
      );
    `);

    isDbInitialized = true; // 3. Marcamos como completado
    console.log("✅ Base de datos local inicializada (Única vez)");
  } catch (error) {
    console.error("❌ Error al inicializar DB local:", error);
  }
};
