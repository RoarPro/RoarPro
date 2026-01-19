import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

export default function SamplingScreen() {
  const { id: farmId, pondId } = useLocalSearchParams();
  const router = useRouter();

  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecordSampling = async () => {
    const weightNum = parseFloat(weight.replace(",", "."));

    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      return Alert.alert(
        "Dato inválido",
        "Por favor ingresa el peso promedio en gramos.",
      );
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("sampling_records").insert({
        farm_id: farmId,
        pond_id: pondId,
        average_weight_g: weightNum,
        notes: notes.trim(),
      });

      if (error) throw error;

      Alert.alert(
        "Muestreo Registrado",
        `El peso promedio del estanque se ha actualizado a ${weightNum}g.`,
      );
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "No se pudo guardar el muestreo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={28} color="#003366" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo Muestreo</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="git-commit-outline" size={40} color="#00C853" />
          </View>

          <Text style={styles.label}>Peso Promedio Actual (Gramos)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.weightInput}
              keyboardType="decimal-pad"
              placeholder="0.0"
              value={weight}
              onChangeText={setWeight}
              autoFocus
            />
            <Text style={styles.unitText}>g</Text>
          </View>

          <Text style={styles.label}>Notas u Observaciones (Opcional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Ej: Peces sanos, buena respuesta al alimento..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#059669"
            />
            <Text style={styles.infoText}>
              Este dato actualizará automáticamente el cálculo de biomasa y
              crecimiento.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRecordSampling}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>Guardar Muestreo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#003366" },
  card: {
    backgroundColor: "white",
    margin: 20,
    padding: 25,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconContainer: {
    alignSelf: "center",
    backgroundColor: "#F0FDF4",
    padding: 20,
    borderRadius: 25,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 10,
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  weightInput: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#00C853",
    textAlign: "center",
    width: "60%",
  },
  unitText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#94A3B8",
    marginLeft: 10,
  },
  notesInput: {
    backgroundColor: "#F1F5F9",
    padding: 15,
    borderRadius: 15,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 20,
    height: 100,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
  },
  infoText: { fontSize: 12, color: "#059669", marginLeft: 10, flex: 1 },
  button: {
    backgroundColor: "#00C853",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
