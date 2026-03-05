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

// 1. DEFINIMOS LA FORMA DEL PRODUCTO PARA QUE TYPESCRIPT NO SE QUEJE
interface InventoryItem {
  id: string;
  farm_id: string;
  item_name: string;
  stock_actual: number;
  unit: string;
  is_satellite: boolean;
}

export default function FeedingScreen() {
  const { id: farmId, pondId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pondName, setPondName] = useState("Estanque");
  const [bodegaName, setBodegaName] = useState("");
  // 2. APLICAMOS LA INTERFACE AQUÍ
  const [availableProducts, setAvailableProducts] = useState<InventoryItem[]>(
    [],
  );

  const [selectedProductId, setSelectedProductId] = useState("");
  const [amount, setAmount] = useState("");

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

      // Cargamos el inventario local
      const localInventory = db.getAllSync(
        "SELECT * FROM local_inventory WHERE farm_id = ?",
        [String(farmId)],
      ) as InventoryItem[]; // <-- Forzamos el tipo aquí también

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

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Bodega Asignada:</Text>
            <Text style={styles.infoValue}>{bodegaName}</Text>
          </View>

          <Text style={styles.label}>Producto a suministrar:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedProductId}
              onValueChange={setSelectedProductId}
            >
              {availableProducts.length === 0 ? (
                <Picker.Item label="No hay productos en esta bodega" value="" />
              ) : (
                availableProducts.map((item) => {
                  const insumoName =
                    item.item_name.split(" - ")[1] || item.item_name;
                  return (
                    <Picker.Item
                      key={item.id}
                      label={`${insumoName} (Saldo: ${item.stock_actual}kg)`}
                      value={item.id}
                    />
                  );
                })
              )}
            </Picker>
          </View>

          <Text style={styles.label}>Cantidad Suministrada (Kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ej: 15.5"
            value={amount}
            onChangeText={setAmount}
          />

          <TouchableOpacity
            style={[styles.button, saving && { backgroundColor: "#94A3B8" }]}
            onPress={handleRecordFeeding}
            disabled={saving || availableProducts.length === 0}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Guardar y Descontar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F5F7",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 25,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  infoBox: {
    backgroundColor: "#E0F2FE",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#0284C7",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 16,
    color: "#0369A1",
    fontWeight: "bold",
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    color: "#4A5568",
    marginBottom: 10,
    fontWeight: "600",
  },
  pickerWrapper: {
    backgroundColor: "#F7FAFC",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F7FAFC",
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
    color: "#0F172A",
  },
  button: {
    backgroundColor: "#0066CC",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
