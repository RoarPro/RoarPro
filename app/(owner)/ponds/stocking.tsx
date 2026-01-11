import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  // Recibimos los parámetros, incluyendo pondArea (m2) enviado desde la lista
  const { farmId, pondId, pondName, pondArea } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [species, setSpecies] = useState("Tilapia Roja");
  const [density, setDensity] = useState(""); // Peces por m2
  const [quantity, setQuantity] = useState(""); // Cantidad total (calculada o manual)
  const [weight, setWeight] = useState("");

  const areaNum = parseFloat(pondArea as string) || 0;

  // EFECTO DE CÁLCULO: Cuando el usuario cambia la densidad, calculamos el total
  useEffect(() => {
    if (density && areaNum > 0) {
      const calculated = Math.round(parseFloat(density) * areaNum);
      setQuantity(calculated.toString());
    }
  }, [density, areaNum]);

  const handleStocking = async () => {
    // Validamos que tengamos los IDs necesarios para evitar el error previo
    if (!farmId || !pondId) {
      return Alert.alert("Error de navegación", "No se detectó la finca o el estanque.");
    }

    if (!quantity || !weight || !species) {
      return Alert.alert("Campos incompletos", "Por favor llena todos los datos.");
    }

    const qtyNum = parseInt(quantity);
    const weightNum = parseFloat(weight);

    setLoading(true);

    try {
      // 1. Insertar el lote en fish_batches
      const { error: batchError } = await supabase.from("fish_batches").insert({
        farm_id: farmId,
        pond_id: pondId,
        species: species.trim(),
        initial_quantity: qtyNum,
        current_quantity: qtyNum,
        average_weight: weightNum,
        status: "active",
      });

      if (batchError) throw batchError;

      // 2. Actualizamos el estanque: lo activamos y guardamos la cantidad actual
      const { error: pondError } = await supabase
        .from("ponds")
        .update({ 
          active: true,
          current_quantity: qtyNum 
        })
        .eq("id", pondId);

      if (pondError) throw pondError;

      Alert.alert("¡Éxito!", `Se han sembrado ${qtyNum} peces en ${pondName}`);
        router.replace({
         pathname: "/(owner)/ponds",
          params: { farmId: farmId }
      });

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
        <Text style={styles.headerTitle}>Planificar Siembra</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.pondInfo}>
          <Ionicons name="resize" size={20} color="#0066CC" />
          <Text style={styles.pondText}>
            {pondName} • {areaNum} m²
          </Text>
        </View>

        <Text style={styles.label}>Especie</Text>
        <TextInput
          style={styles.input}
          value={species}
          onChangeText={setSpecies}
          placeholder="Ej: Tilapia Roja"
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Densidad (Peces/m²)</Text>
            <TextInput
              style={[styles.input, styles.highlightInput]}
              value={density}
              onChangeText={setDensity}
              placeholder="Ej: 5"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Total Calculado</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Total"
              keyboardType="numeric"
              editable={areaNum === 0} // Solo manual si el estanque no tiene área
            />
          </View>
        </View>

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
            <Text style={styles.buttonText}>Confirmar y Sembrar</Text>
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
  highlightInput: { borderColor: "#0066CC", borderWidth: 1.5 },
  disabledInput: { backgroundColor: "#EDF2F7", color: "#4A5568" },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { backgroundColor: "#00C853", padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});