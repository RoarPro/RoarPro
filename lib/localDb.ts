import * as SQLite from "expo-sqlite";

// Abrimos (o creamos) la base de datos local
export const db = SQLite.openDatabaseSync("piscicola_local.db");

export const initLocalDb = () => {
  try {
    // Tabla de Fincas
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_farms (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        user_id TEXT
      );
    `);

    // Tabla de Estanques
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_ponds (
        id TEXT PRIMARY KEY NOT NULL,
        farm_id TEXT NOT NULL,
        name TEXT NOT NULL,
        area DECIMAL,
        capacity INTEGER
      );
    `);

    // Tabla de Inventario
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_inventory (
        id TEXT PRIMARY KEY NOT NULL,
        farm_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        stock_actual DECIMAL DEFAULT 0,
        unit TEXT DEFAULT 'kg',
        is_satellite BOOLEAN DEFAULT 0
      );
    `);

    console.log("✅ Base de datos local inicializada");
  } catch (error) {
    console.error("❌ Error al inicializar DB local:", error);
  }
};
