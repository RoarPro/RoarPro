import { db } from "@/lib/localDb"; // <--- 1. Importamos la Base de Datos Local
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
  const { id: farmId } = useLocalSearchParams(); // Asegúrate de recibir 'id'

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);

  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");

  // ---------------------------------------------------------
  // 1. CARGA DE DATOS (Desde SQLite - Instantáneo)
  // ---------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (!farmId) return;
    try {
      setLoading(true);

      // Leemos directo del teléfono
      const localData = db.getAllSync(
        "SELECT * FROM local_inventory WHERE farm_id = ?",
        [String(farmId)],
      );

      // Formateamos booleanos (SQLite guarda 0 o 1)
      const formatted = localData.map((i: any) => ({
        ...i,
        is_satellite: Boolean(i.is_satellite),
      }));

      setInventory(formatted);
    } catch (err: any) {
      console.error("Error local:", err);
      Alert.alert("Error", "No se pudo cargar el inventario local.");
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------
  // 2. LÓGICA DE TRANSFERENCIA (Local First)
  // ---------------------------------------------------------
  const handleTransfer = async () => {
    const qty = parseFloat(amount.replace(",", "."));
    const source = inventory.find((i) => i.id === sourceId);
    const dest = inventory.find((i) => i.id === destId);

    // Validaciones
    if (!source || !dest || isNaN(qty) || qty <= 0) {
      return Alert.alert("Validación", "Revisa los campos seleccionados.");
    }
    if (sourceId === destId) {
      return Alert.alert("Error", "Origen y destino deben ser diferentes.");
    }
    if (qty > (source.stock_actual || 0)) {
      return Alert.alert(
        "Stock insuficiente",
        `Solo hay ${source.stock_actual} ${source.unit} disponibles.`,
      );
    }

    try {
      setSending(true);

      // A. TRANSACCIÓN LOCAL (Atómica: O todo o nada)
      db.withTransactionSync(() => {
        // Restar de Origen
        db.runSync(
          "UPDATE local_inventory SET stock_actual = stock_actual - ? WHERE id = ?",
          [qty, sourceId],
        );
        // Sumar a Destino
        db.runSync(
          "UPDATE local_inventory SET stock_actual = stock_actual + ? WHERE id = ?",
          [qty, destId],
        );
      });

      // Feedback inmediato al usuario
      Alert.alert("¡Éxito!", "Traslado registrado en el dispositivo.");
      router.back();

      // B. INTENTO DE SINCRONIZACIÓN (Nube)
      // Esto corre en segundo plano y no bloquea la navegación
      const updateCloud = async () => {
        const { error: err1 } = await supabase
          .from("inventory")
          .update({ stock_actual: source.stock_actual - qty })
          .eq("id", sourceId);

        const { error: err2 } = await supabase
          .from("inventory")
          .update({ stock_actual: dest.stock_actual + qty })
          .eq("id", destId);

        if (err1 || err2)
          console.log("Pendiente de sincronizar:", err1 || err2);
      };

      updateCloud(); // Disparamos la promesa sin await
    } catch (err: any) {
      console.error("Error transferencia:", err);
      Alert.alert("Error", "Falló el traslado local.");
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
          <Text style={styles.subtitle}>Distribución Local (Offline)</Text>
        </View>

        <View style={styles.form}>
          {/* ORIGEN */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Desde (Bodega Principal)</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={sourceId} onValueChange={setSourceId}>
                <Picker.Item
                  label="Seleccionar Origen..."
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

          {/* DESTINO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hacia (Bodega Satélite / Estanque)</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={destId} onValueChange={setDestId}>
                <Picker.Item
                  label="Seleccionar Destino..."
                  value=""
                  color="#94A3B8"
                />
                {satelliteItems.map((item) => (
                  <Picker.Item
                    key={item.id}
                    label={`${item.item_name} (Stock: ${item.stock_actual})`}
                    value={item.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* CANTIDAD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cantidad a Mover</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 50.5"
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 25,
    paddingTop: 60,
    backgroundColor: "#003366",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: { marginBottom: 15, alignSelf: "flex-start" },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#93C5FD", fontSize: 14, marginTop: 4 },
  form: { padding: 25 },
  inputGroup: { marginBottom: 25 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
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
    color: "#0F172A",
  },
  btn: {
    backgroundColor: "#0066CC",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
  },
  btnDisabled: { backgroundColor: "#CBD5E0", elevation: 0 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
