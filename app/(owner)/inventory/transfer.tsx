import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router"; // Importamos useLocalSearchParams
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function TransferScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams(); // Recibimos el ID de la finca actual

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
      // Filtramos estrictamente por farm_id para no ver inventario de otras fincas
      const { data, error: fetchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("farm_id", farmId);

      if (fetchError) throw fetchError;
      setInventory(data || []);
    } catch  {
      Alert.alert("Error", "No se pudo cargar el inventario de esta finca.");
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTransfer = async () => {
    const qty = parseFloat(amount.replace(',', '.'));
    const source = inventory.find((i) => i.id === sourceId);
    const dest = inventory.find((i) => i.id === destId);

    // VALIDACIONES
    if (!source || !dest || isNaN(qty) || qty <= 0) {
      return Alert.alert("Validación", "Completa todos los campos correctamente.");
    }

    if (sourceId === destId) {
      return Alert.alert("Error", "La bodega de origen y destino no pueden ser la misma.");
    }

    if (qty > source.quantity) {
      return Alert.alert("Stock insuficiente", `Solo hay ${source.quantity} ${source.unit} disponibles.`);
    }

    try {
      setSending(true);

      // 1. Restar de origen
      const { error: errorResta } = await supabase
        .from("inventory")
        .update({ quantity: source.quantity - qty })
        .eq("id", sourceId)
        .eq("farm_id", farmId); // Refuerzo de seguridad

      if (errorResta) throw errorResta;

      // 2. Sumar a destino
      const { error: errorSuma } = await supabase
        .from("inventory")
        .update({ quantity: (dest.quantity || 0) + qty })
        .eq("id", destId)
        .eq("farm_id", farmId); // Refuerzo de seguridad

      if (errorSuma) throw errorSuma;

      Alert.alert("¡Éxito!", "Traslado de alimento registrado.");
      router.back();
    } catch  {
      Alert.alert("Error", "No se pudo completar el traslado. Intente de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#003366" />
    </View>
  );

  // Clasificación para el UI
  const globalItems = inventory.filter((i) => !i.is_satellite);
  const satelliteItems = inventory.filter((i) => i.is_satellite);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Repartir Alimento</Text>
        <Text style={styles.subtitle}>Distribuye stock entre bodegas de la finca</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>1. Origen (Stock Global)</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={sourceId} onValueChange={setSourceId}>
            <Picker.Item label="-- Seleccione origen --" value="" color="#999" />
            {globalItems.map((item) => (
              <Picker.Item 
                key={item.id} 
                label={`${item.item_name} (${item.quantity} ${item.unit})`} 
                value={item.id} 
              />
            ))}
          </Picker>
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons name="swap-vertical" size={30} color="#0066CC" />
        </View>

        <Text style={styles.label}>2. Destino (Bodega Satélite)</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={destId} onValueChange={setDestId}>
            <Picker.Item label="-- Seleccione destino --" value="" color="#999" />
            {satelliteItems.map((item) => (
              <Picker.Item key={item.id} label={`${item.item_name} (📍 Satélite)`} value={item.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>3. Cantidad a mover</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <TouchableOpacity 
          style={[styles.btn, (sending || !sourceId || !destId || !amount) && styles.btnDisabled]} 
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7FAFC" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 30, paddingTop: 60, backgroundColor: "#003366", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backButton: { marginBottom: 10 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#CBD5E0", fontSize: 14, marginTop: 5 },
  form: { padding: 25 },
  label: { fontSize: 13, fontWeight: "bold", color: "#4A5568", marginBottom: 10 },
  pickerWrapper: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20, overflow: 'hidden' },
  arrowContainer: { alignItems: "center", marginBottom: 20 },
  input: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 15, fontSize: 18, marginBottom: 30, color: '#1A202C' },
  btn: { backgroundColor: "#0066CC", padding: 20, borderRadius: 15, alignItems: "center", elevation: 4 },
  btnDisabled: { backgroundColor: "#A0AEC0" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 }
});