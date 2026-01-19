import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { LineChart } from "react-native-chart-kit"; // Importar LineChart

const screenWidth = Dimensions.get("window").width;

export default function BiometryScreen() {
  const router = useRouter();
  const { id: farmId, pondId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [fetchingHistoricalData, setFetchingHistoricalData] = useState(true);
  const [pondData, setPondData] = useState<any>(null);
  const [historicalBiometries, setHistoricalBiometries] = useState<any[]>([]);

  // Formulario
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [observations, setObservations] = useState("");

  const loadInitialData = useCallback(async () => {
    setFetchingHistoricalData(true);
    try {
      // Cargar datos del estanque para saber la población actual
      const { data: pond, error: pondError } = await supabase
        .from("ponds")
        .select("name, current_quantity")
        .eq("id", pondId)
        .single();
      if (pondError) throw pondError;
      setPondData(pond);

      // Cargar muestreos históricos
      const { data: biometries, error: biometryError } = await supabase
        .from("biometries")
        .select("created_at, avg_weight_g")
        .eq("pond_id", pondId)
        .order("created_at", { ascending: true }); // Ordenar por fecha para el gráfico

      if (biometryError) throw biometryError;
      setHistoricalBiometries(biometries || []);
    } catch (err: any) {
      console.error("Error cargando datos:", err.message);
      Alert.alert(
        "Error de carga",
        "No se pudieron obtener los datos históricos o del estanque.",
      );
    } finally {
      setFetchingHistoricalData(false);
    }
  }, [pondId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSave = async () => {
    const w = parseFloat(weight.replace(",", "."));
    const s = parseInt(sampleSize);

    if (!w || !s) {
      return Alert.alert(
        "Campos requeridos",
        "Peso promedio y tamaño de muestra son obligatorios.",
      );
    }
    if (s <= 0) {
      return Alert.alert(
        "Error de Muestra",
        "La cantidad de peces muestreados debe ser mayor a cero.",
      );
    }

    setLoading(true);
    try {
      const currentQuantity = pondData?.current_quantity || 0;
      const totalBiomass = (currentQuantity * w) / 1000; // kg

      const { error } = await supabase.from("biometries").insert([
        {
          pond_id: pondId,
          farm_id: farmId,
          avg_weight_g: w,
          avg_length_cm: parseFloat(length.replace(",", ".")) || null,
          sample_size: s,
          total_biomass_kg: totalBiomass,
          observations,
        },
      ]);

      if (error) throw error;

      Alert.alert("Éxito", "Muestreo registrado correctamente.");
      // Recargar datos para actualizar la gráfica
      await loadInitialData();
      // Limpiar formulario
      setWeight("");
      setLength("");
      setSampleSize("");
      setObservations("");
      // router.back(); // Puedes elegir si volver o quedarse para otro muestreo
    } catch (err: any) {
      console.error("Error al guardar muestreo:", err.message);
      Alert.alert("Error al guardar", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para la gráfica
  const chartLabels = historicalBiometries.map((b) =>
    new Date(b.created_at).toLocaleDateString("es-CO", {
      month: "short",
      day: "numeric",
    }),
  );
  const chartData = historicalBiometries.map((b) => b.avg_weight_g);

  const dataForChart = {
    labels: chartLabels.length > 0 ? chartLabels : ["No data"],
    datasets: [
      {
        data: chartData.length > 0 ? chartData : [0],
        color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`, // color de la línea
        strokeWidth: 2, // grosor de la línea
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#FFFFFF",
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, // color del texto
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, // color de las etiquetas
    strokeWidth: 2, // optional, default 3
    barPercentage: 0.5,
    useShadowColorFromDataset: false, // optional
    fillShadowGradientFrom: "#0066CC",
    fillShadowGradientTo: "#FFFFFF",
    fillShadowGradientFromOpacity: 0.2,
    decimalPlaces: 1, // Reducir decimales en el eje Y
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Muestreo Biométrico</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>
          Estanque: {pondData?.name || "Cargando..."}
        </Text>
        <Text style={styles.infoSub}>
          Población actual: {pondData?.current_quantity || 0} peces
        </Text>
      </View>

      {/* Sección del Gráfico */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolución del Peso Promedio (g)</Text>
        {fetchingHistoricalData ? (
          <ActivityIndicator
            size="large"
            color="#0066CC"
            style={{ height: 200, justifyContent: "center" }}
          />
        ) : historicalBiometries.length > 0 ? (
          <LineChart
            data={dataForChart}
            width={screenWidth - 40} // Restamos padding de ambos lados
            height={220}
            chartConfig={chartConfig}
            bezier // Curvas suaves
            style={styles.chartStyle}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="stats-chart-outline" size={50} color="#CBD5E0" />
            <Text style={styles.noDataText}>
              No hay datos de muestreos para graficar aún.
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Registrar Nuevo Muestreo</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Peso Promedio (gramos)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 150.5"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Talla Promedio (centímetros) (Opcional)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 18.2"
            keyboardType="decimal-pad"
            value={length}
            onChangeText={setLength}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cantidad de Peces Muestreados</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 30"
            keyboardType="number-pad"
            value={sampleSize}
            onChangeText={setSampleSize}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Observaciones (Opcional)</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            placeholder="Salud, coloración, actividad..."
            multiline
            value={observations}
            onChangeText={setObservations}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Cálculo en tiempo real visual */}
        {weight && pondData && parseFloat(weight.replace(",", ".")) > 0 && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Biomasa Estimada Total</Text>
            <Text style={styles.resultValue}>
              {(
                (pondData.current_quantity *
                  parseFloat(weight.replace(",", "."))) /
                1000
              ).toFixed(2)}{" "}
              kg
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, loading && { backgroundColor: "#CBD5E0" }]}
          onPress={handleSave}
          disabled={loading || !weight || !sampleSize}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar Muestreo</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#003366" },
  infoCard: {
    marginHorizontal: 20,
    backgroundColor: "#EBF8FF",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  infoLabel: { fontWeight: "bold", color: "#2C5282", fontSize: 16 },
  infoSub: { color: "#4299E1", fontSize: 13 },

  chartContainer: {
    marginHorizontal: 20,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 15,
    textAlign: "center",
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 10,
  },
  noDataContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    width: "100%",
  },
  noDataText: {
    marginTop: 10,
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  form: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "700", color: "#4A5568", marginBottom: 8 },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: "#1E293B",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  resultBox: {
    backgroundColor: "#F0FFF4",
    padding: 20,
    borderRadius: 15,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#48BB78",
    marginVertical: 15,
    alignItems: "center",
  },
  resultLabel: {
    color: "#2F855A",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  resultValue: { fontSize: 32, fontWeight: "900", color: "#276749" },
  saveBtn: {
    backgroundColor: "#0066CC",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
    shadowColor: "#0066CC",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
