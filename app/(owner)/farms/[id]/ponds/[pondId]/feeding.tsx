import { db } from "@/lib/localDb";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

interface InventoryItem {
  id: string;
  farm_id: string;
  item_name: string;
  stock_actual: number;
  unit: string;
  is_satellite: boolean;
}

const MEAL_INTERVAL_HOURS = 2;
const MAX_MEALS_PER_DAY = 3;

export default function FeedingScreen() {
  const { id: farmId, pondId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pondName, setPondName] = useState("Estanque");
  const [bodegaName, setBodegaName] = useState("");
  const [availableProducts, setAvailableProducts] = useState<InventoryItem[]>(
    [],
  );
  const [selectedProductId, setSelectedProductId] = useState("");
  const [amount, setAmount] = useState("");
  const [mealsToday, setMealsToday] = useState(0);
  const [nextAvailableAt, setNextAvailableAt] = useState<Date | null>(null);

  const loadFeedingData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: pond, error: pError } = await supabase
        .from("ponds")
        .select("inventory_id, name")
        .eq("id", pondId)
        .single();

      if (pError) throw pError;
      setPondName(pond.name);

      const localInventory = db.getAllSync(
        "SELECT * FROM local_inventory WHERE farm_id = ?",
        [String(farmId)],
      ) as InventoryItem[];

      const baseItem = localInventory.find((i) => i.id === pond.inventory_id);

      let targetBodega = "Sin Bodega Asignada";
      let productsForPicker: InventoryItem[] = [];

      if (baseItem) {
        targetBodega = baseItem.item_name.split(" - ")[0]?.trim();
        productsForPicker = localInventory.filter((i) =>
          i.item_name.startsWith(`${targetBodega} - `),
        );
      } else {
        productsForPicker = localInventory.filter((i) => i.is_satellite);
        targetBodega = "Todas las Bodegas Satélite";
      }

      setBodegaName(targetBodega);
      setAvailableProducts(productsForPicker);

      if (productsForPicker.length > 0) {
        setSelectedProductId(productsForPicker[0].id);
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data: todayMeals } = await supabase
        .from("feeding_records")
        .select("created_at")
        .eq("pond_id", pondId)
        .gte("created_at", startOfDay.toISOString())
        .order("created_at", { ascending: false });

      const count = todayMeals?.length || 0;
      setMealsToday(count);

      if (todayMeals && todayMeals.length > 0) {
        const last = new Date(todayMeals[0].created_at);
        const next = new Date(
          last.getTime() + MEAL_INTERVAL_HOURS * 60 * 60 * 1000,
        );
        setNextAvailableAt(count >= MAX_MEALS_PER_DAY ? null : next);
      } else {
        setNextAvailableAt(null);
      }
    } catch (error: any) {
      console.error("Error cargando datos:", error.message);
      Alert.alert("Error", "No se pudo cargar la información del estanque.");
    } finally {
      setLoading(false);
    }
  }, [farmId, pondId]);

  useEffect(() => {
    loadFeedingData();
  }, [loadFeedingData]);

  const handleRecordFeeding = async () => {
    const amountKg = parseFloat(amount.replace(",", "."));

    if (!amountKg || isNaN(amountKg) || amountKg <= 0) {
      return Alert.alert("Error", "Ingresa una cantidad válida mayor a 0.");
    }

    if (!selectedProductId) {
      return Alert.alert(
        "Error",
        "Debes seleccionar un producto de la bodega.",
      );
    }

    if (mealsToday >= MAX_MEALS_PER_DAY) {
      return Alert.alert(
        "Límite diario alcanzado",
        "Este estanque ya tiene 3 comidas registradas hoy.",
      );
    }

    if (nextAvailableAt && new Date() < nextAvailableAt) {
      return Alert.alert(
        "Aún no disponible",
        `Debes esperar hasta ${nextAvailableAt.toLocaleTimeString()} para la siguiente comida.`,
      );
    }

    const selectedProduct = availableProducts.find(
      (p) => p.id === selectedProductId,
    );

    if (!selectedProduct) return;

    if (amountKg > selectedProduct.stock_actual) {
      return Alert.alert(
        "Stock Insuficiente",
        `Solo tienes ${selectedProduct.stock_actual}kg de este producto en la bodega.`,
      );
    }

    setSaving(true);
    try {
      const newStock = selectedProduct.stock_actual - amountKg;

      const { error: feedError } = await supabase
        .from("feeding_records")
        .insert({
          pond_id: pondId,
          farm_id: farmId,
          inventory_id: selectedProductId,
          amount_kg: amountKg,
          created_at: new Date().toISOString(),
        });

      if (feedError) throw feedError;

      const { error: invError } = await supabase
        .from("inventory")
        .update({ stock_actual: newStock })
        .eq("id", selectedProductId);

      if (invError) throw invError;

      db.runSync("UPDATE local_inventory SET stock_actual = ? WHERE id = ?", [
        newStock,
        selectedProductId,
      ]);

      const updatedMeals = mealsToday + 1;
      setMealsToday(updatedMeals);
      if (updatedMeals >= MAX_MEALS_PER_DAY) {
        setNextAvailableAt(null);
      } else {
        const next = new Date(Date.now() + MEAL_INTERVAL_HOURS * 60 * 60 * 1000);
        setNextAvailableAt(next);
      }

      Alert.alert("¡Éxito!", `Se suministraron ${amountKg}kg a ${pondName}`);
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Error de Red",
        "No se pudo guardar el registro: " + error.message,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 10, color: "#64748B" }}>
          Cargando bodega...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#F2F5F7" }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Alimentar {pondName}</Text>

        <View style={styles.card}>
          <Ionicons
            name="restaurant"
            size={40}
            color="#0066CC"
            style={{ alignSelf: "center", marginBottom: 15 }}
          />

          <View style={styles.mealStatus}>
            <Text style={styles.mealStatusTitle}>
              Comidas hoy: {mealsToday}/{MAX_MEALS_PER_DAY}
            </Text>
            <Text style={styles.mealStatusSubtitle}>
              {mealsToday >= MAX_MEALS_PER_DAY
                ? "Alimentación completa por hoy"
                : nextAvailableAt
                  ? `Disponible desde ${nextAvailableAt.toLocaleTimeString()}`
                  : "Disponible ahora"}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Bodega Asignada:</Text>
            <Text style={styles.infoValue}>{bodegaName}</Text>
          </View>

          <Text style={styles.label}>Producto a suministrar:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedProductId}
              onValueChange={(itemValue) => setSelectedProductId(itemValue)}
              style={styles.picker}
            >
              {availableProducts.map((item) => (
                <Picker.Item
                  key={item.id}
                  label={`${item.item_name} (${item.stock_actual} ${item.unit})`}
                  value={item.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Cantidad (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 25"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <TouchableOpacity
            style={[
              styles.button,
              (saving || mealsToday >= MAX_MEALS_PER_DAY) && styles.buttonDisabled,
            ]}
            onPress={handleRecordFeeding}
            disabled={saving || mealsToday >= MAX_MEALS_PER_DAY}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>Registrar alimentación</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { padding: 20, paddingBottom: 40 },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  infoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoLabel: { fontSize: 12, color: "#475569", marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: "bold", color: "#0F172A" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginTop: 10,
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 12,
  },
  picker: { height: 50 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0066CC",
    padding: 14,
    borderRadius: 14,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  mealStatus: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  mealStatusTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  mealStatusSubtitle: { fontSize: 12, color: "#475569", marginTop: 4 },
});
