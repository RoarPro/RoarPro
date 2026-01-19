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
  // Recibimos los parámetros desde la lista de estanques
  const { id: farmId, pondId, pondName, pondArea } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [species, setSpecies] = useState("Tilapia Roja");
  const [density, setDensity] = useState(""); // Peces por m2
  const [quantity, setQuantity] = useState(""); // Cantidad total calculada
  const [weight, setWeight] = useState("");

  const areaNum = parseFloat(pondArea as string) || 0;

  // CÁLCULO AUTOMÁTICO: Densidad x Área = Cantidad Total
  useEffect(() => {
    const dens = parseFloat(density);
    if (!isNaN(dens) && areaNum > 0) {
      const calculated = Math.round(dens * areaNum);
      setQuantity(calculated.toString());
    } else if (density === "") {
      setQuantity("");
    }
  }, [density, areaNum]);

  const handleStocking = async () => {
    if (!farmId || !pondId) {
      return Alert.alert(
        "Error",
        "Información de finca o estanque no encontrada.",
      );
    }

    if (!quantity || !weight || !species) {
      return Alert.alert(
        "Campos incompletos",
        "Por favor indica la cantidad y el peso inicial.",
      );
    }

    const qtyNum = parseInt(quantity);
    const weightNum = parseFloat(weight.replace(",", "."));

    setLoading(true);

    try {
      // 1. Crear el lote en la tabla fish_batches
      const { error: batchError } = await supabase.from("fish_batches").insert({
        farm_id: farmId,
        pond_id: pondId,
        species: species.trim(),
        initial_quantity: qtyNum,
        current_quantity: qtyNum,
        average_weight: weightNum,
        status: "active",
        started_at: new Date().toISOString(),
      });

      if (batchError) throw batchError;

      // 2. Actualizar el estanque para marcarlo como activo y con peces
      const { error: pondError } = await supabase
        .from("ponds")
        .update({
          active: true,
          current_quantity: qtyNum,
        })
        .eq("id", pondId);

      if (pondError) throw pondError;

      Alert.alert(
        "¡Éxito!",
        `Siembra registrada: ${qtyNum} ${species} en ${pondName}`,
      );

      // Regresamos a la lista de estanques de la finca actual
      router.back();
    } catch (error: any) {
      console.error("Error en siembra:", error.message);
      Alert.alert(
        "Error",
        "No se pudo registrar la siembra en la base de datos.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={26} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planificar Siembra</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.pondInfo}>
          <Ionicons name="water" size={20} color="#0066CC" />
          <Text style={styles.pondText}>
            {pondName} • {areaNum} m²
          </Text>
        </View>

        <Text style={styles.label}>Especie a Sembrar</Text>
        <TextInput
          style={styles.input}
          value={species}
          onChangeText={setSpecies}
          placeholder="Ej: Tilapia Roja, Cachama..."
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Densidad ($P/m^2$)</Text>
            <TextInput
              style={[styles.input, styles.highlightInput]}
              value={density}
              onChangeText={setDensity}
              placeholder="Ej: 8"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Total Peces</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Total"
              keyboardType="numeric"
              editable={areaNum === 0} // Si no hay área registrada, permitir ingreso manual
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

        <View style={styles.helperBox}>
          <Ionicons name="bulb-outline" size={16} color="#718096" />
          <Text style={styles.helperText}>
            La densidad recomendada depende de tu sistema de aireación.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (loading || !quantity) && styles.buttonDisabled,
          ]}
          onPress={handleStocking}
          disabled={loading || !quantity}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.buttonText}>Confirmar y Sembrar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F8FAFC", padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 25,
  },
  backButton: {
    padding: 8,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#003366" },
  card: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  pondInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    backgroundColor: "#F0F7FF",
    padding: 15,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#0066CC",
  },
  pondText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#0066CC",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    fontSize: 16,
    color: "#1E293B",
  },
  highlightInput: { borderColor: "#0066CC", backgroundColor: "#F0F7FF" },
  disabledInput: {
    backgroundColor: "#F8FAFC",
    color: "#64748B",
    fontStyle: "italic",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  helperBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  helperText: { fontSize: 12, color: "#718096", marginLeft: 8 },
  button: {
    backgroundColor: "#00C853",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonDisabled: { backgroundColor: "#CBD5E0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
