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

export default function FarmSettingsScreen() {
  const { id } = useLocalSearchParams(); // ID de la finca
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Formulario
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  // Cargar datos actuales
  useEffect(() => {
    const fetchFarm = async () => {
      try {
        const { data, error } = await supabase
          .from("farms")
          .select("name, location") // Asegúrate de tener 'location' en tu tabla o quítalo
          .eq("id", id)
          .single();

        if (error) throw error;
        if (data) {
          setName(data.name);
          setLocation(data.location || "");
        }
      } catch (err: any) {
        Alert.alert("Error", "No se pudo cargar la información de la finca.");
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchFarm();
  }, [id]);

  // Actualizar Finca
  const handleUpdate = async () => {
    if (!name.trim())
      return Alert.alert("Validación", "El nombre es obligatorio.");

    setLoading(true);
    try {
      const { error } = await supabase
        .from("farms")
        .update({ name, location })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("¡Éxito!", "Finca actualizada correctamente.");
      router.back(); // Volver al detalle
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar Finca
  const handleDelete = () => {
    Alert.alert(
      "¿Estás seguro?",
      "Esta acción eliminará la finca y TODOS sus estanques, peces y registros. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, eliminar",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from("farms")
                .delete()
                .eq("id", id);
              if (error) throw error;

              // Redirigir al inicio y limpiar historial para que no pueda volver atrás
              router.replace("/(owner)/farms" as any);
            } catch (err: any) {
              Alert.alert(
                "Error",
                "No se pudo eliminar la finca. Verifica tus permisos.",
              );
              console.error(err);
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.title}>Configurar Finca</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos Generales</Text>

          <Text style={styles.label}>Nombre de la Finca</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Hacienda La Trucha"
          />

          <Text style={styles.label}>Ubicación / Descripción (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Ej: Vereda El Salado"
          />

          <TouchableOpacity
            style={[styles.btnSave, loading && styles.btnDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Zona de Peligro */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <Ionicons name="warning-outline" size={24} color="#DC2626" />
            <Text style={styles.dangerTitle}>Zona de Peligro</Text>
          </View>
          <Text style={styles.dangerText}>
            Si eliminas esta finca, perderás todo el historial de producción
            asociado.
          </Text>
          <TouchableOpacity
            style={[styles.btnDelete, loading && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={loading}
          >
            <Text style={styles.btnDeleteText}>Eliminar Finca</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { padding: 5 },
  title: { fontSize: 20, fontWeight: "bold", color: "#003366" },
  content: { paddingHorizontal: 20 },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F1F5F9",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  btnSave: {
    backgroundColor: "#0066CC",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  btnDisabled: { opacity: 0.7 },

  dangerZone: {
    backgroundColor: "#FEF2F2",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 40,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dangerTitle: {
    color: "#DC2626",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  dangerText: {
    color: "#7F1D1D",
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
  },
  btnDelete: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DC2626",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDeleteText: { color: "#DC2626", fontWeight: "bold", fontSize: 15 },
});
