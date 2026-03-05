import { db } from "@/lib/localDb";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function TransferScreen() {
  const router = useRouter();
  const { id: farmId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);

  const [sourceId, setSourceId] = useState("");
  // Ahora el destino es solo el nombre de la bodega, no un producto específico
  const [destBodegaName, setDestBodegaName] = useState("");

  const [kgAmount, setKgAmount] = useState("");
  const [bultosAmount, setBultosAmount] = useState("");

  const PESO_BULTO = 40;

  const handleKgChange = (val: string) => {
    const text = val.replace(",", ".");
    setKgAmount(text);
    if (text === "" || isNaN(parseFloat(text))) {
      setBultosAmount("");
    } else {
      const bultos = parseFloat(text) / PESO_BULTO;
      setBultosAmount(bultos % 1 === 0 ? bultos.toString() : bultos.toFixed(2));
    }
  };

  const handleBultosChange = (val: string) => {
    const text = val.replace(",", ".");
    setBultosAmount(text);
    if (text === "" || isNaN(parseFloat(text))) {
      setKgAmount("");
    } else {
      const kg = parseFloat(text) * PESO_BULTO;
      setKgAmount(kg.toString());
    }
  };

  const fetchData = useCallback(async () => {
    if (!farmId) return;
    try {
      setLoading(true);
      const localData = db.getAllSync(
        "SELECT * FROM local_inventory WHERE farm_id = ?",
        [String(farmId)],
      );

      const formatted = localData.map((i: any) => ({
        ...i,
        is_satellite: Boolean(i.is_satellite),
        stock_actual: i.stock_actual || 0,
      }));

      setInventory(formatted);
    } catch {
      Alert.alert("Error", "No se pudo cargar el inventario local.");
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extraemos las bodegas destino disponibles (solo nombres únicos)
  const destBodegas = useMemo(() => {
    const bodegas = new Set<string>();
    inventory.forEach((item) => {
      const parts = item.item_name.split(" - ");
      const bodega = parts[0]?.trim() || "Sin Bodega";
      bodegas.add(bodega);
    });
    return Array.from(bodegas).sort();
  }, [inventory]);

  const handleTransfer = async () => {
    const qty = parseFloat(kgAmount);
    const sourceItem = inventory.find((i) => i.id === sourceId);

    if (!sourceItem || !destBodegaName || isNaN(qty) || qty <= 0) {
      return Alert.alert(
        "Validación",
        "Completa todos los campos con valores válidos.",
      );
    }

    const sourceParts = sourceItem.item_name.split(" - ");
    const sourceBodegaName = sourceParts[0]?.trim();
    const insumoName = sourceParts[1]?.trim() || sourceItem.item_name;

    if (sourceBodegaName === destBodegaName) {
      return Alert.alert(
        "Error",
        "No puedes transferir a la misma bodega de origen.",
      );
    }

    if (qty > sourceItem.stock_actual) {
      return Alert.alert(
        "Stock insuficiente",
        `Solo hay ${sourceItem.stock_actual}kg disponibles en ${sourceItem.item_name}.`,
      );
    }

    try {
      setSending(true);

      // 1. Deducir la cantidad del origen (Nube)
      const newSourceStock = sourceItem.stock_actual - qty;
      const { error: sourceError } = await supabase
        .from("inventory")
        .update({ stock_actual: newSourceStock })
        .eq("id", sourceId);

      if (sourceError) throw sourceError;

      // 2. Buscar si el producto ya existe en la bodega destino
      const targetItemName = `${destBodegaName} - ${insumoName}`;
      const { data: existingDestItem, error: destSearchError } = await supabase
        .from("inventory")
        .select("id, stock_actual")
        .eq("farm_id", farmId)
        .eq("item_name", targetItemName)
        .maybeSingle();

      if (destSearchError) throw destSearchError;

      let finalDestId = "";
      let finalDestStock = qty;

      if (existingDestItem) {
        // Si existe, le sumamos el saldo (Nube)
        finalDestStock = existingDestItem.stock_actual + qty;
        finalDestId = existingDestItem.id;

        const { error: updateDestError } = await supabase
          .from("inventory")
          .update({ stock_actual: finalDestStock })
          .eq("id", finalDestId);

        if (updateDestError) throw updateDestError;
      } else {
        // Si NO existe, creamos el producto en la bodega destino (Nube)
        // Por defecto asumimos que el destino es satélite si no es la principal, pero para estar seguros
        // lo ideal sería que el usuario lo definiera. Por ahora lo dejamos como satélite = true si se llama diferente.
        const { data: newDestItem, error: insertDestError } = await supabase
          .from("inventory")
          .insert([
            {
              farm_id: farmId,
              item_name: targetItemName,
              stock_actual: qty,
              unit: "kg",
              is_satellite: true,
            },
          ])
          .select();

        if (insertDestError) throw insertDestError;
        finalDestId = newDestItem[0].id;
      }

      // 3. Actualizar base de datos Local
      db.withTransactionSync(() => {
        // Actualizamos Origen
        db.runSync("UPDATE local_inventory SET stock_actual = ? WHERE id = ?", [
          newSourceStock,
          sourceId,
        ]);

        // Actualizamos/Insertamos Destino
        db.runSync(
          `INSERT OR REPLACE INTO local_inventory (id, farm_id, item_name, stock_actual, unit, is_satellite) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            finalDestId,
            String(farmId),
            targetItemName,
            finalDestStock,
            "kg",
            1,
          ],
        );
      });

      Alert.alert(
        "¡Éxito!",
        `Traslado de ${qty}kg de ${insumoName} a ${destBodegaName} completado.`,
      );
      router.back();
    } catch (error: any) {
      console.error("Error en traslado:", error);
      Alert.alert(
        "Error de Red",
        "No se pudo sincronizar el traslado con la nube.",
      );
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Mover Alimento</Text>
          <Text style={styles.subtitle}>Bultos de 40kg</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Producto a Mover (Origen)</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={sourceId} onValueChange={setSourceId}>
              <Picker.Item
                label="Selecciona de dónde sacar..."
                value=""
                color="#94A3B8"
              />
              {inventory.map((item) => (
                <Picker.Item
                  key={item.id}
                  label={`${item.item_name} (Saldo: ${item.stock_actual}kg)`}
                  value={item.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Bodega Destino</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={destBodegaName}
              onValueChange={setDestBodegaName}
            >
              <Picker.Item
                label="Selecciona a qué bodega enviar..."
                value=""
                color="#94A3B8"
              />
              {destBodegas.map((bodegaName) => (
                <Picker.Item
                  key={bodegaName}
                  label={bodegaName}
                  value={bodegaName}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Kilos</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="decimal-pad"
                value={kgAmount}
                onChangeText={handleKgChange}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bultos (40kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="decimal-pad"
                value={bultosAmount}
                onChangeText={handleBultosChange}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              (sending || !sourceId || !destBodegaName || !kgAmount) &&
                styles.btnDisabled,
            ]}
            onPress={handleTransfer}
            disabled={sending || !sourceId || !destBodegaName || !kgAmount}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Confirmar Traslado</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 25,
    paddingTop: 60,
    backgroundColor: "#003366",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: { marginBottom: 15 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#93C5FD", fontSize: 14, marginTop: 4 },
  form: { padding: 25 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
    marginTop: 10,
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 10,
  },
  row: { flexDirection: "row", marginBottom: 20 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
  },
  btn: {
    backgroundColor: "#0066CC",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
  },
  btnDisabled: { backgroundColor: "#CBD5E0" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
