import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function FeedingScreen() {
  const { id: farmId, pondId } = useLocalSearchParams();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecordFeeding = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      return Alert.alert(
        "Error",
        "Ingresa una cantidad válida de alimento (kg).",
      );
    }

    setLoading(true);
    try {
      // 1. Obtener el lote activo y la bodega del estanque
      const { data: pond, error: pError } = await supabase
        .from("ponds")
        .select("inventory_id, name")
        .eq("id", pondId)
        .single();

      if (pError) throw pError;

      // 2. Insertar registro de alimentación
      const { error: feedError } = await supabase
        .from("feeding_records")
        .insert({
          pond_id: pondId,
          farm_id: farmId,
          inventory_id: pond.inventory_id,
          amount_kg: parseFloat(amount),
          created_at: new Date().toISOString(),
        });

      if (feedError) throw feedError;

      // 3. (Opcional) Restar del inventario automáticamente
      // Aquí podrías llamar a una función RPC de Supabase para mantener la integridad

      Alert.alert("¡Éxito!", `Registro guardado para ${pond.name}`);
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar Alimentación</Text>
      <View style={styles.card}>
        <Ionicons
          name="restaurant"
          size={40}
          color="#0066CC"
          style={{ alignSelf: "center", marginBottom: 20 }}
        />
        <Text style={styles.label}>Cantidad Suministrada (Kg)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ej: 15.5"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleRecordFeeding}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Guardar Registro</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F5F7",
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 25,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#4A5568",
    marginBottom: 10,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#F7FAFC",
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#0066CC",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
