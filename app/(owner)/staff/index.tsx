import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function GlobalDirectoryScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. OBTENER TODO EL PERSONAL Y SU FINCA
  const fetchDirectory = useCallback(async () => {
    try {
      setLoading(true);
      // Hacemos un Join con la tabla 'farms' para traer el nombre de la sede
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          id, 
          full_name, 
          role, 
          phone, 
          farms (name)
        `,
        )
        .order("full_name", { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error cargando directorio:", error);
      Alert.alert("Error", "No se pudo cargar el personal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // 2. ACCIONES RÁPIDAS (Llamada y WhatsApp)
  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert("Sin número", "Este empleado no tiene un número registrado.");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) {
      Alert.alert("Sin número", "Este empleado no tiene un número registrado.");
      return;
    }
    // Formateamos el número para WhatsApp (quitamos espacios o símbolos)
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    // Si los números son de Colombia, asegúrate de tener el +57 o agregarlo
    Linking.openURL(`whatsapp://send?phone=57${cleanPhone}`);
  };

  // 3. DISEÑO DE CADA TARJETA DE EMPLEADO
  const renderEmployee = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {/* Icono de Perfil */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.full_name ? item.full_name.charAt(0).toUpperCase() : "U"}
        </Text>
      </View>

      {/* Información */}
      <View style={styles.info}>
        <Text style={styles.name}>
          {item.full_name || "Usuario Sin Nombre"}
        </Text>
        <Text style={styles.role}>{item.role || "Operario"}</Text>
        <View style={styles.farmBadge}>
          <Ionicons name="location-outline" size={12} color="#0066CC" />
          <Text style={styles.farmText}>
            {item.farms?.name || "Sin sede asignada"}
          </Text>
        </View>
      </View>

      {/* Botones de Acción */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#EBF8FF" }]}
          onPress={() => handleCall(item.phone)}
        >
          <Ionicons name="call" size={20} color="#0066CC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#DCFCE7" }]}
          onPress={() => handleWhatsApp(item.phone)}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Directorio Global</Text>
          <Text style={styles.subtitle}>Contacto rápido con tu equipo</Text>
        </View>
      </View>

      {/* LISTA DE EMPLEADOS */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={{ marginTop: 10, color: "#64748B" }}>
            Cargando contactos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={renderEmployee}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                No hay personal registrado aún.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { marginRight: 15, padding: 5 },
  title: { fontSize: 22, fontWeight: "bold", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },

  listContainer: { padding: 20 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#003366",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: { color: "white", fontSize: 20, fontWeight: "bold" },

  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 2 },
  role: { fontSize: 13, color: "#64748B", marginBottom: 6 },
  farmBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  farmText: {
    fontSize: 11,
    color: "#0066CC",
    fontWeight: "600",
    marginLeft: 4,
  },

  actions: { flexDirection: "row", gap: 10, marginLeft: 10 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#64748B", marginTop: 15, fontSize: 14 },
});
