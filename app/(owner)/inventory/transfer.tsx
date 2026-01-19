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

export default function TransferScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);

  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");

  const fetchData = useCallback(async () => {
    if (!farmId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("farm_id", farmId);

      if (error) throw error;
      setInventory(data || []);
    } catch (err: any) {
      // Usamos el error para loguearlo, eliminando el warning de ESLint
      console.error("Error al cargar inventario:", err.message);
      Alert.alert("Error", "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTransfer = async () => {
    const qty = parseFloat(amount.replace(",", "."));
    const source = inventory.find((i) => i.id === sourceId);
    const dest = inventory.find((i) => i.id === destId);

    if (!source || !dest || isNaN(qty) || qty <= 0) {
      return Alert.alert("Validación", "Por favor completa todos los campos.");
    }

    if (sourceId === destId) {
      return Alert.alert(
        "Error",
        "La bodega de origen y destino deben ser distintas.",
      );
    }

    if (qty > (source.stock_actual || 0)) {
      return Alert.alert(
        "Stock insuficiente",
        `La bodega de origen solo tiene ${source.stock_actual} ${source.unit}.`,
      );
    }

    try {
      setSending(true);

      // 1. Restar de origen
      const { error: errorResta } = await supabase
        .from("inventory")
        .update({ stock_actual: (source.stock_actual || 0) - qty })
        .eq("id", sourceId);

      if (errorResta) throw errorResta;

      // 2. Sumar a destino
      const { error: errorSuma } = await supabase
        .from("inventory")
        .update({ stock_actual: (dest.stock_actual || 0) + qty })
        .eq("id", destId);

      if (errorSuma) throw errorSuma;

      Alert.alert("¡Éxito!", "Traslado de alimento completado correctamente.");
      router.back();
    } catch (err: any) {
      // Logueamos el error para depuración
      console.error("Error en transferencia:", err.message);
      Alert.alert("Error", "Hubo un fallo al procesar el traslado.");
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

  const globalItems = inventory.filter((i) => !i.is_satellite);
  const satelliteItems = inventory.filter((i) => i.is_satellite);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Mover Alimento</Text>
          <Text style={styles.subtitle}>Traslada stock entre tus bodegas</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>1. Bodega de Origen</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={sourceId}
                onValueChange={(val) => setSourceId(val)}
              >
                <Picker.Item
                  label="Seleccionar origen..."
                  value=""
                  color="#94A3B8"
                />
                {globalItems.map((item) => (
                  <Picker.Item
                    key={item.id}
                    label={`${item.item_name} (${item.stock_actual} ${item.unit})`}
                    value={item.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>2. Bodega de Destino</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={destId}
                onValueChange={(val) => setDestId(val)}
              >
                <Picker.Item
                  label="Seleccionar destino..."
                  value=""
                  color="#94A3B8"
                />
                {satelliteItems.map((item) => (
                  <Picker.Item
                    key={item.id}
                    label={`${item.item_name} (📍 Satélite)`}
                    value={item.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>3. Cantidad a Trasladar</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              (sending || !sourceId || !destId || !amount) &&
                styles.btnDisabled,
            ]}
            onPress={handleTransfer}
            disabled={sending || !sourceId || !destId || !amount}
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
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
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
  },
  btn: {
    backgroundColor: "#0066CC",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  btnDisabled: { backgroundColor: "#CBD5E0" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
