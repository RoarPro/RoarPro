// lib/inventoryService.ts
import { supabase } from "./supabase";

export const InventoryService = {
  /**
   * Mueve alimento de una bodega (ej. Global) a otra (ej. Satélite)
   */
  async transferStock(
    fromInventoryId: string,
    toInventoryId: string,
    amount: number,
    userId: string
  ) {
    try {
      // 1. Obtener datos actuales de ambas bodegas para calcular nuevos saldos
      const { data: inventories, error: fetchError } = await supabase
        .from("inventory")
        .select("id, quantity")
        .in("id", [fromInventoryId, toInventoryId]);

      if (fetchError) throw fetchError;

      const source = inventories.find((i) => i.id === fromInventoryId);
      const dest = inventories.find((i) => i.id === toInventoryId);

      if (!source || source.quantity < amount) {
        throw new Error("Stock insuficiente en la bodega de origen");
      }

      // 2. Ejecutar la transferencia (Restar y Sumar)
      // Usamos un Promise.all para que se intenten hacer ambas al tiempo
      const { error: updateSourceError } = await supabase
        .from("inventory")
        .update({ quantity: source.quantity - amount })
        .eq("id", fromInventoryId);

      if (updateSourceError) throw updateSourceError;

      const { error: updateDestError } = await supabase
        .from("inventory")
        .update({ quantity: (dest?.quantity || 0) + amount })
        .eq("id", toInventoryId);

      if (updateDestError) throw updateDestError;

      // 3. Registrar el historial del movimiento
      const { error: historyError } = await supabase
        .from("inventory_transfers")
        .insert([
          {
            source_inventory_id: fromInventoryId,
            destination_inventory_id: toInventoryId,
            amount_kg: amount,
            user_id: userId,
            notes: "Traslado interno a bodega satélite",
          },
        ]);

      if (historyError) console.error("Error guardando historial:", historyError);

      return { success: true };
    } catch (error: any) {
      console.error("Error en transferStock:", error.message);
      return { success: false, error: error.message };
    }
  },
};