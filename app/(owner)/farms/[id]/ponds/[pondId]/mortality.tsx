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

export default function MortalityScreen() {
  const { id: farmId, pondId } = useLocalSearchParams();
  const router = useRouter();

  const [quantity, setQuantity] = useState("");
  const [cause, setCause] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecordMortality = async () => {
    const qtyNum = parseInt(quantity);

    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      return Alert.alert(
        "Cantidad inválida",
        "Por favor ingresa el número de peces.",
      );
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("mortality_records").insert({
        farm_id: farmId,
        pond_id: pondId,
        quantity: qtyNum,
        cause: cause.trim() || "No especificada",
      });

      if (error) throw error;

      Alert.alert(
        "Baja Registrada",
        `Se han restado ${qtyNum} peces del inventario actual.`,
      );
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "No se pudo registrar la mortalidad.");
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
          <Text style={styles.headerTitle}>Reportar Mortalidad</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="skull-outline" size={40} color="#E53E3E" />
          </View>

          <Text style={styles.label}>Cantidad de Peces Muertos</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.qtyInput}
              keyboardType="number-pad"
              placeholder="0"
              value={quantity}
              onChangeText={setQuantity}
              autoFocus
            />
          </View>

          <Text style={styles.label}>Causa Probable (Opcional)</Text>
          <TextInput
            style={styles.causeInput}
            placeholder="Ej: Oxígeno bajo, estrés, depredación..."
            value={cause}
            onChangeText={setCause}
            multiline
            numberOfLines={3}
          />

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#9B2C2C" />
            <Text style={styles.warningText}>
              Esta acción es irreversible y actualizará la población actual del
              estanque.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRecordMortality}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name="remove-circle-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>Confirmar Baja</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF2F2" }, // Fondo rojizo tenue para alerta
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
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#742A2A" },
  card: {
    backgroundColor: "white",
    margin: 20,
    padding: 25,
    borderRadius: 30,
    elevation: 4,
  },
  iconContainer: {
    alignSelf: "center",
    backgroundColor: "#FFF5F5",
    padding: 20,
    borderRadius: 25,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#718096",
    marginBottom: 10,
    marginLeft: 5,
  },
  inputContainer: {
    borderBottomWidth: 2,
    borderBottomColor: "#FED7D7",
    marginBottom: 30,
  },
  qtyInput: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#E53E3E",
    textAlign: "center",
  },
  causeInput: {
    backgroundColor: "#F7FAFC",
    padding: 15,
    borderRadius: 15,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 20,
    height: 100,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
  },
  warningText: {
    fontSize: 12,
    color: "#9B2C2C",
    marginLeft: 10,
    flex: 1,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#E53E3E",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonDisabled: { backgroundColor: "#FEB2B2" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
