import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
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

export default function CreateFarmScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateFarm = async () => {
    if (!name.trim()) {
      Alert.alert("Campo obligatorio", "Por favor, escribe el nombre de tu finca.");
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener la sesión actual para sacar el ID del usuario
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        Alert.alert("Sesión expirada", "Inicia sesión nuevamente.");
        router.replace("/(auth)/login");
        return;
      }

      const userId = session.user.id;

      // 2. INSERT CORREGIDO:
      // Activamos 'user_id' ya que tu base de datos lo marca como obligatorio (NOT NULL)
      const { error } = await supabase.from("farms").insert([
        {
          name: name.trim(),
          owner_id: userId, 
          user_id: userId, // <--- ESTA LÍNEA ES LA QUE SOLUCIONA EL ERROR
          active: true,
        },
      ]);

      if (error) throw error;

      // Éxito: Volvemos al Panel Principal
      router.replace("/(owner)/farms");

    } catch (error: any) {
      console.error("Error creando finca:", error.message);
      
      if (error.message.includes("violates row-level security")) {
        Alert.alert(
          "Error de Permisos", 
          "No tienes permiso para crear esta finca. Verifica el RLS en Supabase."
        );
      } else {
        Alert.alert("Error", "No pudimos crear la finca: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Nueva Finca</Text>
        <Text style={styles.subtitle}>
          Registra tu explotación para separar tus inventarios y estanques de forma organizada.
        </Text>

        <TextInput
          placeholder="Ej: Hacienda El Recreo"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#999"
          autoFocus={true}
        />

        <TouchableOpacity 
          style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]} 
          onPress={handleCreateFarm}
          disabled={loading || !name.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Crear Finca</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7", padding: 20, justifyContent: "center" },
  card: { backgroundColor: "white", padding: 25, borderRadius: 24, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  title: { fontSize: 26, fontWeight: "bold", color: "#003366", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#718096", textAlign: "center", marginBottom: 25, lineHeight: 20 },
  input: { backgroundColor: "#F8FAFC", padding: 18, borderRadius: 15, marginBottom: 20, fontSize: 16, color: "#333", borderWidth: 1, borderColor: "#E2E8F0" },
  button: { backgroundColor: "#0066CC", padding: 18, borderRadius: 15, alignItems: "center", elevation: 2 },
  buttonDisabled: { backgroundColor: "#CBD5E0" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  backButton: { marginTop: 15, padding: 10, alignItems: "center" },
  backButtonText: { color: "#718096", fontSize: 14, fontWeight: "500" }
});