import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function GlobalCreateStaffScreen() {
  const router = useRouter();

  // Estados del formulario
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operario"); // Por defecto operario
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);

  // Estados de datos (Lista de fincas)
  const [farms, setFarms] = useState<any[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar las fincas disponibles para el desplegable visual
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const { data, error } = await supabase
          .from("farms")
          .select("id, name")
          .eq("active", true);

        if (error) throw error;
        setFarms(data || []);
      } catch (error) {
        console.error("Error cargando fincas:", error);
      } finally {
        setLoadingFarms(false);
      }
    };

    fetchFarms();
  }, []);

  // Función para guardar al empleado
  const handleSaveEmployee = async () => {
    if (!fullName.trim())
      return Alert.alert("Atención", "El nombre es obligatorio.");
    if (!selectedFarm)
      return Alert.alert("Atención", "Debes asignarlo a una finca.");

    try {
      setSaving(true);

      const { error } = await supabase.from("employees").insert({
        full_name: fullName.trim(),
        email: email.trim() || null,
        role: role,
        farm_id: selectedFarm,
        is_active: true,
        // auth_id: Queda nulo hasta que el empleado cree su cuenta en la app
      });

      if (error) throw error;

      Alert.alert("¡Éxito!", "Empleado registrado y asignado a la finca.");
      router.back(); // Regresamos al directorio global
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "No se pudo guardar el empleado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={28} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Personal</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Datos Personales</Text>

          <Text style={styles.label}>Nombre Completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Juan Pérez"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: operario@aquaviva.com"
            keyboardType="email-address" // <-- Muestra el teclado con la @
            autoCapitalize="none" // <-- Evita que la primera letra sea mayúscula
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.sectionTitle}>Asignación de Sede</Text>
          {loadingFarms ? (
            <ActivityIndicator size="small" color="#0066CC" />
          ) : farms.length === 0 ? (
            <Text style={styles.emptyText}>Debes crear una finca primero.</Text>
          ) : (
            <View style={styles.farmsGrid}>
              {farms.map((farm) => (
                <TouchableOpacity
                  key={farm.id}
                  style={[
                    styles.farmCard,
                    selectedFarm === farm.id && styles.farmCardActive,
                  ]}
                  onPress={() => setSelectedFarm(farm.id)}
                >
                  <Ionicons
                    name="business"
                    size={20}
                    color={selectedFarm === farm.id ? "#0066CC" : "#94A3B8"}
                  />
                  <Text
                    style={[
                      styles.farmName,
                      selectedFarm === farm.id && styles.farmNameActive,
                    ]}
                  >
                    {farm.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Rol en el Sistema</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                role === "operario" && styles.roleActive,
              ]}
              onPress={() => setRole("operario")}
            >
              <Ionicons
                name="water"
                size={24}
                color={role === "operario" ? "#0066CC" : "#64748B"}
              />
              <Text
                style={[
                  styles.roleTitle,
                  role === "operario" && styles.roleTitleActive,
                ]}
              >
                Operario
              </Text>
              <Text style={styles.roleSub}>
                Registra biometría, alimento y tareas de campo.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === "admin" && styles.roleActive]}
              onPress={() => setRole("admin")}
            >
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={role === "admin" ? "#0066CC" : "#64748B"}
              />
              <Text
                style={[
                  styles.roleTitle,
                  role === "admin" && styles.roleTitleActive,
                ]}
              >
                Administrador
              </Text>
              <Text style={styles.roleSub}>
                Gestiona inventarios y ve reportes financieros.
              </Text>
            </TouchableOpacity>
          </View>

          {/* BOTÓN DE GUARDAR */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!fullName || !selectedFarm || saving) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSaveEmployee}
            disabled={!fullName || !selectedFarm || saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Registrar y Asignar</Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  content: { padding: 20, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 15,
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 6 },
  input: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 16,
  },

  farmsGrid: { gap: 10, marginBottom: 20 },
  farmCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  farmCardActive: { borderColor: "#0066CC", backgroundColor: "#F0F9FF" },
  farmName: {
    fontSize: 15,
    color: "#475569",
    marginLeft: 10,
    fontWeight: "500",
  },
  farmNameActive: { color: "#0066CC", fontWeight: "bold" },
  emptyText: { color: "#94A3B8", fontStyle: "italic", marginBottom: 20 },

  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  roleCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  roleActive: { borderColor: "#0066CC", backgroundColor: "#F0F9FF" },
  roleTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  roleTitleActive: { color: "#0066CC" },
  roleSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },

  submitBtn: {
    backgroundColor: "#003366",
    padding: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    marginTop: 10,
  },
  submitBtnDisabled: { backgroundColor: "#94A3B8", elevation: 0 },
  submitBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
