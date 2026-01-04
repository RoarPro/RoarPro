import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

export default function StockingScreen() {
  const router = useRouter();
  const { farmId, pondId, pondName } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [species, setSpecies] = useState("Tilapia Roja");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");

  const handleStocking = async () => {
    // Validaciones básicas
    if (!quantity || !weight || !species) {
      return Alert.alert("Campos incompletos", "Por favor llena todos los datos.");
    }

    const qtyNum = parseInt(quantity);
    const weightNum = parseFloat(weight);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      return Alert.alert("Error", "La cantidad de peces debe ser un número válido.");
    }

    setLoading(true);

    try {
      // 1. Insertar el lote en fish_batches
      const { error: batchError } = await supabase.from("fish_batches").insert({
        farm_id: farmId,
        pond_id: pondId,
        species: species.trim(),
        initial_quantity: qtyNum,
        current_quantity: qtyNum, // Al inicio es igual a la inicial
        average_weight: weightNum,
        status: "active",
      });

      if (batchError) throw batchError;

      // 2. Opcional: Actualizar el estado del estanque a activo
      const { error: pondError } = await supabase
        .from("ponds")
        .update({ active: true })
        .eq("id", pondId);

      if (pondError) throw pondError;

      Alert.alert("¡Éxito!", `Se han sembrado los peces en ${pondName}`);
      router.replace("/(owner)/ponds"); // Regresamos a la lista
      
    } catch (error: any) {
      console.error("Error en siembra:", error.message);
      Alert.alert("Error", "No se pudo registrar la siembra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sembrar Peces</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.pondInfo}>
          <Ionicons name="water" size={24} color="#0066CC" />
          <Text style={styles.pondText}>Estanque: {pondName || "Seleccionado"}</Text>
        </View>

        <Text style={styles.label}>Especie</Text>
        <TextInput
          style={styles.input}
          value={species}
          onChangeText={setSpecies}
          placeholder="Ej: Tilapia Roja"
        />

        <Text style={styles.label}>Cantidad de Peces (unidades)</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Ej: 1000"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Peso Promedio Inicial (gramos)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          placeholder="Ej: 0.5"
          keyboardType="decimal-pad"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleStocking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Confirmar Siembra</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F2F5F7", padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#003366" },
  card: { backgroundColor: "white", borderRadius: 20, padding: 25, elevation: 4 },
  pondInfo: { flexDirection: "row", alignItems: "center", marginBottom: 20, backgroundColor: "#E6F0FA", padding: 12, borderRadius: 12 },
  pondText: { marginLeft: 10, fontSize: 16, fontWeight: "bold", color: "#0066CC" },
  label: { fontSize: 14, fontWeight: "bold", color: "#4A5568", marginBottom: 8 },
  input: { backgroundColor: "#F7FAFC", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: "#00C853", padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});