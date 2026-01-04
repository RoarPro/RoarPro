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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        Alert.alert("Sesión expirada", "Inicia sesión nuevamente.");
        router.replace("/(auth)/login");
        return;
      }

      const userId = session.user.id;

      // Enviamos AMBOS campos para evitar el error de "user_id is not null"
      // y cumplir con las políticas RLS de Supabase.
      const { error } = await supabase.from("farms").insert([
        {
          name: name.trim(),
          owner_id: userId, 
          user_id: userId,  
          active: true,
        },
      ]);

      if (error) throw error;

      router.replace("/(owner)/farms");

    } catch (error: any) {
      console.error("Error creando finca:", error.message);
      
      if (error.message.includes("violates row-level security")) {
        Alert.alert("Error de Permisos", "Verifica las políticas RLS en Supabase.");
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
        <Text style={styles.title}>Registrar Finca</Text>
        <Text style={styles.subtitle}>
          Escribe el nombre de tu explotación piscícola para comenzar a gestionar tus estanques.
        </Text>

        <TextInput
          placeholder="Ej: Finca La Esperanza"
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
            <Text style={styles.buttonText}>Confirmar y Crear</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7", padding: 20, justifyContent: "center" },
  card: { backgroundColor: "white", padding: 25, borderRadius: 20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  title: { fontSize: 26, fontWeight: "bold", color: "#003366", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 25, lineHeight: 20 },
  input: { backgroundColor: "#E8ECF1", padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 16, color: "#333", borderWidth: 1, borderColor: "#D1D9E0" },
  button: { backgroundColor: "#0066CC", padding: 18, borderRadius: 12, alignItems: "center" },
  buttonDisabled: { backgroundColor: "#A7C7E7" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});