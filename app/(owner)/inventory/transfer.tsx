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

export default function TransferScreen() {
  const router = useRouter();
  const { id: farmId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);

  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");

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

  const handleTransfer = async () => {
    const qty = parseFloat(kgAmount);
    const source = inventory.find((i) => i.id === sourceId);
    const dest = inventory.find((i) => i.id === destId);

    if (!source || !dest || isNaN(qty) || qty <= 0) {
      return Alert.alert("Validación", "Ingresa una cantidad válida.");
    }
    if (sourceId === destId) {
      return Alert.alert("Error", "Origen y destino deben ser diferentes.");
    }
    if (qty > source.stock_actual) {
      return Alert.alert(
        "Stock insuficiente",
        `Solo hay ${source.stock_actual}kg disponibles.`,
      );
    }

    try {
      setSending(true);

      db.withTransactionSync(() => {
        db.runSync(
          "UPDATE local_inventory SET stock_actual = stock_actual - ? WHERE id = ?",
          [qty, sourceId],
        );
        db.runSync(
          "UPDATE local_inventory SET stock_actual = stock_actual + ? WHERE id = ?",
          [qty, destId],
        );
      });

      Alert.alert("¡Éxito!", "Traslado registrado correctamente.");
      router.back();

      const updateCloud = async () => {
        try {
          await supabase
            .from("inventory")
            .update({ stock_actual: source.stock_actual - qty })
            .eq("id", sourceId);
          await supabase
            .from("inventory")
            .update({ stock_actual: dest.stock_actual + qty })
            .eq("id", destId);
        } catch {
          console.log("Sincronización de nube pendiente...");
        }
      };
      updateCloud();
    } catch {
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
          <Text style={styles.subtitle}>Bultos de 40kg</Text>
        </View>

        <View style={styles.form}>
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
                  label={`${item.item_name} (Saldo: ${item.stock_actual}kg)`}
                  value={item.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Hacia (Bodega Satélite)</Text>
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
                  label={`${item.item_name} (Stock: ${item.stock_actual}kg)`}
                  value={item.id}
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
              (sending || !sourceId || !destId || !kgAmount) &&
                styles.btnDisabled,
            ]}
            onPress={handleTransfer}
            disabled={sending || !sourceId || !destId || !kgAmount}
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
