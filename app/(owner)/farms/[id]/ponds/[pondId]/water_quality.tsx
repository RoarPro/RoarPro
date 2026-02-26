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

export default function WaterQualityScreen() {
  const router = useRouter();
  const { id: farmId, pondId, name: pondName } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);

  // Estados para los parámetros según tu tabla SQL
  const [temp, setTemp] = useState("");
  const [ph, setPh] = useState("");
  const [oxygen, setOxygen] = useState("");
  const [nitrites, setNitrites] = useState("");
  const [ammonia, setAmmonia] = useState("");
  const [clarity, setClarity] = useState("");

  const handleSave = async () => {
    if (!oxygen || !temp || !ph) {
      return Alert.alert(
        "Campos obligatorios",
        "Por favor ingresa al menos Oxígeno, Temperatura y pH.",
      );
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("water_parameters").insert({
        pond_id: pondId,
        temperature: parseFloat(temp.replace(",", ".")),
        ph: parseFloat(ph.replace(",", ".")),
        oxygen: parseFloat(oxygen.replace(",", ".")),
        nitrites: nitrites ? parseFloat(nitrites.replace(",", ".")) : null,
        ammonia: ammonia ? parseFloat(ammonia.replace(",", ".")) : null,
        clarity_cm: clarity ? parseFloat(clarity.replace(",", ".")) : null,
      });

      if (error) throw error;

      Alert.alert("¡Éxito!", "Parámetros registrados correctamente.");
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "No se pudieron guardar los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.title}>Calidad del Agua</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitle}>Estanque: {pondName}</Text>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Oxígeno (mg/L)</Text>
            <TextInput
              style={styles.input}
              value={oxygen}
              onChangeText={setOxygen}
              keyboardType="numeric"
              placeholder="Ej: 5.5"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Temperatura (°C)</Text>
            <TextInput
              style={styles.input}
              value={temp}
              onChangeText={setTemp}
              keyboardType="numeric"
              placeholder="Ej: 28"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>pH</Text>
            <TextInput
              style={styles.input}
              value={ph}
              onChangeText={setPh}
              keyboardType="numeric"
              placeholder="6.5 - 8.5"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Claridad (cm)</Text>
            <TextInput
              style={styles.input}
              value={clarity}
              onChangeText={setClarity}
              keyboardType="numeric"
              placeholder="Disco Secchi"
            />
          </View>
        </View>

        <Text style={styles.sectionDivider}>
          Compuestos Químicos (Opcional)
        </Text>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nitritos (ppm)</Text>
            <TextInput
              style={styles.input}
              value={nitrites}
              onChangeText={setNitrites}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amonio (ppm)</Text>
            <TextInput
              style={styles.input}
              value={ammonia}
              onChangeText={setAmmonia}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Guardar Parámetros</Text>
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
    marginTop: 40,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#003366" },
  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    elevation: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 20,
    fontWeight: "600",
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  inputGroup: { flex: 1, marginBottom: 15 },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F1F5F9",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
  },
  sectionDivider: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0066CC",
    marginTop: 10,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 5,
  },
  button: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
