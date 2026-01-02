import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function FarmStaffScreen() {
  const { id } = useLocalSearchParams(); // ID de la Finca
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    // 🛡️ BLOQUEO DE SEGURIDAD PARA RUTAS NO VÁLIDAS (UUID Check)
    const invalidIds = ["staff", "ponds", "inventory", "undefined", "[id]"];
    if (!id || typeof id !== 'string' || invalidIds.includes(id)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // PASO 1: Obtener los IDs de los empleados vinculados a esta finca
      const { data: farmUsers, error: linkError } = await supabase
        .from("farm_users")
        .select("user_id")
        .eq("farm_id", id);

      if (linkError) throw linkError;

      // Si no hay vinculaciones, limpiamos la lista y salimos
      if (!farmUsers || farmUsers.length === 0) {
        setStaff([]);
        return;
      }

      // PASO 2: Extraer los IDs y buscar sus datos en la tabla profiles
      const userIds = farmUsers.map(item => item.user_id);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", userIds);

      if (profileError) throw profileError;

      // PASO 3: Formatear los datos
      const formattedStaff = profiles?.map(profile => ({
        user_id: profile.id,
        profiles: profile
      })) || [];

      setStaff(formattedStaff);
    } catch (error: any) {
      console.error("Error cargando empleados:", error.message);
      // Solo mostramos alerta si no es un error de ID vacío o mal formado
      if (!error.message.includes("uuid")) {
        Alert.alert("Error", "No se pudieron cargar los empleados");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0066CC" /></View>;

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Equipo</Text>
        <TouchableOpacity onPress={fetchStaff}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Empleados asignados a esta finca</Text>

        {staff.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#CBD5E0" />
            <Text style={styles.emptyText}>No hay empleados registrados</Text>
            <Text style={styles.emptySubtext}>Agrega a tus trabajadores para que puedan registrar datos.</Text>
          </View>
        ) : (
          <FlatList
            data={staff}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item }) => (
              <View style={styles.staffCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.profiles?.full_name?.charAt(0).toUpperCase() || "E"}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.profiles?.full_name || "Sin nombre"}</Text>
                  <Text style={styles.staffRole}>Operario de Campo</Text>
                </View>
                <TouchableOpacity onPress={() => Alert.alert("Eliminar", "¿Deseas quitar el acceso a este empleado?")}>
                  <Ionicons name="trash-outline" size={22} color="#E53E3E" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Botón mejorado para pasar el ID correctamente */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push({
            pathname: "/(owner)/farm-dashboard/staff/add-employee",
            params: { farmId: id }
        } as any)}
      >
        <Ionicons name="person-add" size={24} color="white" />
        <Text style={styles.addButtonText}>Agregar Empleado</Text>
      </TouchableOpacity>
    </View>
  );
}

// ... Estilos (se mantienen igual)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#003366", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  content: { flex: 1, padding: 20 },
  subtitle: { fontSize: 16, color: "#4A5568", marginBottom: 20, fontWeight: "500" },
  staffCard: { backgroundColor: "white", borderRadius: 12, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 12, elevation: 2 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: "#E6F0FA", justifyContent: "center", alignItems: "center", marginRight: 15 },
  avatarText: { color: "#0066CC", fontWeight: "bold", fontSize: 18 },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
  staffRole: { fontSize: 13, color: "#718096" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: "bold", color: "#4A5568", marginTop: 15 },
  emptySubtext: { fontSize: 14, color: "#718096", textAlign: "center", marginTop: 5 },
  addButton: { position: "absolute", bottom: 30, left: 20, right: 20, backgroundColor: "#0066CC", height: 55, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", elevation: 4 },
  addButtonText: { color: "white", fontWeight: "bold", fontSize: 16, marginLeft: 10 }
});