import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateFarmScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateFarm = async () => {
    if (!name.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "Por favor, escribe el nombre de tu finca.",
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener el usuario actual de forma segura
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert("Sesión expirada", "Por favor, inicia sesión nuevamente.");
        router.replace("/(auth)/login");
        return;
      }

      // 2. INSERT en la tabla 'farms'
      // owner_id: Relación lógica del negocio
      // user_id: El ID que exige tu esquema SQL o tus políticas RLS
      const { error } = await supabase.from("farms").insert([
        {
          name: name.trim(),
          owner_id: user.id,
          user_id: user.id,
          active: true,
        },
      ]);

      if (error) throw error;

      // Éxito: Limpiamos y volvemos a la lista de fincas
      Alert.alert("¡Éxito!", "Finca registrada correctamente.");
      router.replace("/(owner)/farms");
    } catch (error: any) {
      console.error("Error creando finca:", error.message);

      if (error.message.includes("row-level security")) {
        Alert.alert(
          "Permiso Denegado",
          "Asegúrate de tener una política RLS que permita INSERT en la tabla 'farms'.",
        );
      } else {
        Alert.alert("Error", "No pudimos crear la finca: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Nueva Finca</Text>
        <Text style={styles.subtitle}>
          Registra tu centro de producción para gestionar estanques, inventarios
          y operarios.
        </Text>

        <TextInput
          placeholder="Ej: Acuícola San José"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#A0AEC0"
          autoFocus={true}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!name.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleCreateFarm}
          disabled={loading || !name.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Registrar Finca</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    borderRadius: 28,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#718096",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
    fontSize: 17,
    color: "#2D3748",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  button: {
    backgroundColor: "#0066CC",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
  },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  backButton: { marginTop: 20, padding: 10, alignItems: "center" },
  backButtonText: { color: "#718096", fontSize: 15, fontWeight: "600" },
});
