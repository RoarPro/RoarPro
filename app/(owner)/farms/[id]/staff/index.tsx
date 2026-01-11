import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function FarmStaffScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    const invalidIds = ["staff", "ponds", "inventory", "undefined", "[id]"];
    if (!id || typeof id !== 'string' || invalidIds.includes(id)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: employees, error: staffError } = await supabase
        .from("employees")
        .select("*")
        .eq("owner_id", session?.user.id)
        .order('full_name', { ascending: true });

      if (staffError) throw staffError;
      setStaff(employees || []);

    } catch (error: any) {
      console.error("Error cargando empleados:", error.message);
      Alert.alert("Error", "No se pudieron cargar los empleados");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // --- FUNCIÓN PARA EDITAR EL RANGO ---
  const handleEditRole = (employee: any) => {
    Alert.alert(
      "Cambiar Rango",
      `Selecciona el nuevo nivel para ${employee.full_name}`,
      [
        { text: "Operario", onPress: () => handleUpdateRole(employee.id, 'operario') },
        { text: "Administrador", onPress: () => handleUpdateRole(employee.id, 'admin') },
        { text: "Socio", onPress: () => handleUpdateRole(employee.id, 'socio') },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  const handleUpdateRole = async (employeeId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update({ role: newRole })
        .eq("id", employeeId);

      if (error) throw error;
      
      Alert.alert("Éxito", "Rango actualizado correctamente");
      fetchStaff(); // Recargar lista
    } catch {
      Alert.alert("Error", "No se pudo actualizar el rango");
    }
  };

  const handleDeleteStaff = (employee: any) => {
    Alert.alert(
      "Eliminar Acceso",
      `¿Estás seguro de quitar el acceso a ${employee.full_name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            await supabase.from("employees").delete().eq("id", employee.id);
            fetchStaff();
          }
        }
      ]
    );
  };

  const getRoleStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return { bg: '#EBF8FF', text: '#2B6CB0', label: 'Administrador' };
      case 'socio': return { bg: '#F0FFF4', text: '#2F855A', label: 'Socio' };
      default: return { bg: '#EDF2F7', text: '#4A5568', label: 'Operario' };
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0066CC" /></View>;

  return (
    <View style={styles.container}>
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
        <Text style={styles.subtitle}>Toca a un empleado para cambiar su rango</Text>

        {staff.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#CBD5E0" />
            <Text style={styles.emptyText}>No hay empleados</Text>
            <Text style={styles.emptySubtext}>Agrega personal para empezar a delegar.</Text>
          </View>
        ) : (
          <FlatList
            data={staff}
            keyExtractor={(item) => item.id}
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
                      {item.full_name?.charAt(0).toUpperCase() || "E"}
                    </Text>
                  </View>
                  
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{item.full_name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
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
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push({
          pathname: "/(owner)/farms/[id]/staff/add",
          params: { id: id }
        } as any)}
      >
        <Ionicons name="person-add" size={24} color="white" />
        <Text style={styles.addButtonText}>Nuevo Integrante</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#003366", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  content: { flex: 1, padding: 20 },
  subtitle: { fontSize: 14, color: "#718096", marginBottom: 20, fontWeight: "500" },
  staffCard: { backgroundColor: "white", borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 12, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: "#E6F0FA", justifyContent: "center", alignItems: "center", marginRight: 15 },
  avatarText: { color: "#0066CC", fontWeight: "bold", fontSize: 20 },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: "bold", color: "#2D3748", marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: "bold", textTransform: 'uppercase' },
  deleteBtn: { padding: 10 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: "bold", color: "#4A5568", marginTop: 15 },
  emptySubtext: { fontSize: 14, color: "#718096", textAlign: "center", marginTop: 5, paddingHorizontal: 30 },
  addButton: { position: "absolute", bottom: 30, left: 20, right: 20, backgroundColor: "#0066CC", height: 55, borderRadius: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", elevation: 4 },
  addButtonText: { color: "white", fontWeight: "bold", fontSize: 16, marginLeft: 10 }
});