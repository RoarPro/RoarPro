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

export default function CreateTaskScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, full_name")
          .eq("is_active", true);

        if (error) throw error;
        setEmployees(data || []);
      } catch (error) {
        console.error("Error cargando empleados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleSaveTask = async () => {
    if (!title.trim())
      return Alert.alert("Atención", "El título de la tarea es obligatorio.");
    if (!selectedEmployee)
      return Alert.alert("Atención", "Debes asignar la tarea a un empleado.");

    try {
      setSaving(true);

      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        status: "pendiente",
        assigned_to: selectedEmployee,
      });

      if (error) throw error;

      Alert.alert("¡Éxito!", "La tarea ha sido asignada correctamente.");
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "Hubo un problema al guardar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flexOne}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={28} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva Tarea</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Detalles de la Tarea</Text>

          <Text style={styles.label}>Título (Acción a realizar)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Revisar niveles de oxígeno en estanque 2"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />

          <Text style={styles.label}>
            Instrucciones / Descripción (Opcional)
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Añade detalles específicos para el operario..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.sectionTitle}>Prioridad</Text>
          <View style={styles.chipsRow}>
            {["baja", "media", "alta"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.chip,
                  priority === p && styles.chipActive,
                  priority === p && p === "alta" && styles.chipAlta,
                  priority === p && p === "media" && styles.chipMedia,
                  priority === p && p === "baja" && styles.chipBaja,
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.chipText,
                    priority === p && {
                      color:
                        p === "alta"
                          ? "#EF4444"
                          : p === "media"
                            ? "#D97706"
                            : "#059669",
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Asignar a:</Text>
          {employees.length === 0 ? (
            <Text style={styles.emptyText}>
              No hay operarios registrados en el sistema.
            </Text>
          ) : (
            <View style={styles.employeeGrid}>
              {employees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={[
                    styles.employeeCard,
                    selectedEmployee === emp.id && styles.employeeCardActive,
                  ]}
                  onPress={() => setSelectedEmployee(emp.id)}
                >
                  <View
                    style={[
                      styles.avatar,
                      selectedEmployee === emp.id && styles.avatarActive,
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={selectedEmployee === emp.id ? "white" : "#64748B"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.employeeName,
                      selectedEmployee === emp.id && styles.employeeNameActive,
                    ]}
                  >
                    {emp.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!title || !selectedEmployee || saving) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSaveTask}
            disabled={!title || !selectedEmployee || saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons
                  name="send"
                  size={18}
                  color="white"
                  style={styles.btnIcon}
                />
                <Text style={styles.submitBtnText}>Asignar Tarea</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  spacer: { width: 28 },
  btnContent: { flexDirection: "row", alignItems: "center" },
  btnIcon: { marginRight: 8 },
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
  textArea: { height: 100, paddingTop: 14 },

  chipsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "white",
  },
  chipActive: { borderWidth: 2 },
  chipAlta: { backgroundColor: "#FEF2F2", borderColor: "#EF4444" },
  chipMedia: { backgroundColor: "#FFFBEB", borderColor: "#F59E0B" },
  chipBaja: { backgroundColor: "#F0FDF4", borderColor: "#10B981" },
  chipText: { fontSize: 14, color: "#64748B", fontWeight: "500" },

  employeeGrid: { gap: 10, marginBottom: 30 },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  employeeCardActive: { borderColor: "#0066CC", backgroundColor: "#F0F9FF" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarActive: { backgroundColor: "#0066CC" },
  employeeName: { fontSize: 15, color: "#334155" },
  employeeNameActive: { color: "#0066CC", fontWeight: "bold" },
  emptyText: { color: "#94A3B8", fontStyle: "italic", marginBottom: 20 },

  submitBtn: {
    backgroundColor: "#003366",
    flexDirection: "row",
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
