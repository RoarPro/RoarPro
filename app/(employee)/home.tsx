import { supabase } from "@/lib/supabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Interfaz para la respuesta de la finca
interface EmployeeDataResponse {
  farm_id: string;
  farms: { name: string } | { name: string }[];
}

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  color?: string;
  onPress: () => void;
}

export default function EmployeeHomeScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState({ name: "", role: "" });
  const [farmData, setFarmData] = useState({ name: "Cargando...", id: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

      // Consultamos a qué finca pertenece este empleado
      const { data: employeeRecord } = await supabase
        .from("employees")
        .select("farm_id, farms(name)")
        .eq("id", user.id) // Usamos el ID del usuario
        .single();

      if (profile) {
        setUserData({ name: profile.name, role: profile.role });
      }

      if (employeeRecord) {
        const record = employeeRecord as unknown as EmployeeDataResponse;
        let farmName = "Finca no encontrada";

        if (record.farms) {
          farmName = Array.isArray(record.farms)
            ? record.farms[0]?.name
            : record.farms.name;
        }

        setFarmData({ name: farmName, id: record.farm_id });
      } else {
        setFarmData({ name: "Sin finca asignada", id: "" });
      }
    } catch (err) {
      console.error("Error cargando datos del empleado:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER OPERATIVO */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <Text style={styles.welcome}>Hola, {userData.name} 👋</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.farmBadge}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#0066CC" />
          <Text style={styles.farmText}>{farmData.name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Registros de hoy</Text>

        <ActionButton
          label="Registrar Alimentación"
          icon={<MaterialCommunityIcons name="fish" size={24} color="white" />}
          color="#0066CC"
          onPress={() => router.push("/(employee)/feeding" as any)}
        />

        <ActionButton
          label="Parámetros de Agua"
          icon={<MaterialCommunityIcons name="waves" size={24} color="white" />}
          color="#00CC99"
          onPress={() => router.push("/(employee)/water" as any)}
        />

        <ActionButton
          label="Reportar Mortalidad"
          icon={
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={24}
              color="white"
            />
          }
          color="#CC3333"
          onPress={() => router.push("/(employee)/mortality" as any)}
        />

        {/* ESPACIO PARA TAREAS ASIGNADAS */}
        <View style={styles.taskNotice}>
          <MaterialCommunityIcons
            name="clipboard-text-clock-outline"
            size={20}
            color="#475569"
          />
          <Text style={styles.taskNoticeText}>
            Recuerda sincronizar tus datos antes de salir de la finca.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ActionButton({ label, icon, color, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.button, { backgroundColor: color }]}
    >
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.buttonText}>{label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color="rgba(255,255,255,0.6)"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 25,
    backgroundColor: "white",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: { fontSize: 26, fontWeight: "900", color: "#0F172A" },
  logoutBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  farmBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  farmText: {
    marginLeft: 6,
    color: "#0369A1",
    fontWeight: "700",
    fontSize: 13,
  },
  content: { padding: 20, marginTop: 10 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 20,
    marginLeft: 5,
  },
  button: {
    padding: 20,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 15,
    flex: 1,
  },
  taskNotice: {
    marginTop: 20,
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  taskNoticeText: {
    marginLeft: 10,
    fontSize: 12,
    color: "#475569",
    flex: 1,
    lineHeight: 18,
  },
});
