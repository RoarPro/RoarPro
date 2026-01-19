import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Interfaz para mayor claridad
interface Employee {
  id: string;
  full_name: string;
  role: "operario" | "admin" | "socio";
  farm_id: string;
}

export default function FarmStaffScreen() {
  const { id: farmId } = useLocalSearchParams();
  const router = useRouter();
  const [staff, setStaff] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!farmId) return;

    try {
      setLoading(true);
      const { data: employees, error: staffError } = await supabase
        .from("employees")
        .select("*")
        .eq("farm_id", farmId) // Filtramos por la finca actual
        .order("full_name", { ascending: true });

      if (staffError) throw staffError;
      setStaff(employees || []);
    } catch (error: any) {
      console.error("Error cargando empleados:", error.message);
      Alert.alert(
        "Error",
        "No se pudieron cargar los colaboradores de esta finca.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const handleUpdateRole = async (employeeId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update({ role: newRole })
        .eq("id", employeeId);

      if (error) throw error;

      Alert.alert("Éxito", "El permiso ha sido actualizado.");
      fetchStaff();
    } catch {
      Alert.alert("Error", "No se pudo cambiar el rango.");
    }
  };

  const handleEditRole = (employee: Employee) => {
    Alert.alert(
      "Modificar Permisos",
      `Define el nivel de acceso para ${employee.full_name}`,
      [
        {
          text: "Operario",
          onPress: () => handleUpdateRole(employee.id, "operario"),
        },
        {
          text: "Administrador",
          onPress: () => handleUpdateRole(employee.id, "admin"),
        },
        {
          text: "Socio",
          onPress: () => handleUpdateRole(employee.id, "socio"),
        },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  };

  const handleDeleteStaff = (employee: Employee) => {
    Alert.alert(
      "Revocar Acceso",
      `¿Estás seguro de quitar a ${employee.full_name}? Ya no podrá registrar datos en esta finca.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("employees")
              .delete()
              .eq("id", employee.id);
            if (!error) fetchStaff();
            else Alert.alert("Error", "No se pudo eliminar al integrante.");
          },
        },
      ],
    );
  };

  const getRoleStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return { bg: "#EBF8FF", text: "#2B6CB0", label: "Administrador" };
      case "socio":
        return { bg: "#F0FFF4", text: "#2F855A", label: "Socio" };
      default:
        return { bg: "#F7FAFC", text: "#718096", label: "Operario" };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Equipo de Trabajo</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            staff.length > 0 ? (
              <Text style={styles.subtitle}>
                Toca para cambiar el nivel de acceso
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const roleInfo = getRoleStyle(item.role);
            return (
              <TouchableOpacity
                style={styles.staffCard}
                onPress={() => handleEditRole(item)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.charAt(0)}
                  </Text>
                </View>

                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.full_name}</Text>
                  <View
                    style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}
                  >
                    <Text style={[styles.roleText, { color: roleInfo.text }]}>
                      {roleInfo.label}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteStaff(item)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#E53E3E" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={80} color="#CBD5E0" />
              <Text style={styles.emptyText}>Sin colaboradores</Text>
              <Text style={styles.emptySubtext}>
                Agrega operarios para que registren alimentación y muestreos.
              </Text>
            </View>
          }
        />
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          router.push({
            pathname: "/(owner)/farms/[id]/staff/add",
            params: { id: farmId },
          } as any)
        }
      >
        <Ionicons name="person-add" size={24} color="white" />
        <Text style={styles.addButtonText}>Vincular Integrante</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#003366",
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
  content: { flex: 1, paddingHorizontal: 20 },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 20,
    marginBottom: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  staffCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: { color: "#0066CC", fontWeight: "bold", fontSize: 18 },
  staffInfo: { flex: 1 },
  staffName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deleteBtn: { padding: 10, backgroundColor: "#FFF5F5", borderRadius: 12 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    left: 25,
    right: 25,
    backgroundColor: "#0066CC",
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#0066CC",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 17,
    marginLeft: 10,
  },
});
