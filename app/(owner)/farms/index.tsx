import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// IMPORTACIÓN DE VISTAS POR ROL
import AdminView from "@/components/views/AdminView";
import EmployeeView from "@/components/views/EmployeeView";
import OwnerView from "@/components/views/OwnerView";

// Definimos tipos para mayor seguridad
type UserRole = "owner" | "admin" | "operario" | null;

export default function FarmsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState("");
  const [farms, setFarms] = useState<any[]>([]);
  const [totalBiomasa, setTotalBiomasa] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const userId = user.id;
      let detectedRole: UserRole = null;
      let currentFarmId: string | null = null;

      // 1. Buscamos en PROFILES
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        setUserName(profile.name || "Usuario");

        if (profile.role === "owner") {
          detectedRole = "owner";
        } else {
          // 2. Si no es owner, buscamos en la tabla employees
          const { data: empData } = await supabase
            .from("employees")
            .select("role, farm_id")
            .eq("auth_id", userId)
            .maybeSingle();

          if (empData) {
            detectedRole = empData.role as UserRole;
            currentFarmId = empData.farm_id;
          }
        }
      }

      // 🛑 VALIDACIÓN CRÍTICA: Si no hay rol, detenemos y mostramos error
      if (!detectedRole) {
        console.log("⚠️ No se encontró rol para el usuario:", userId);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUserRole(detectedRole);

      // --- B. CARGA DE FINCAS SEGÚN ROL ---
      let farmsQuery = supabase
        .from("farms")
        .select("*, ponds(*)")
        .eq("active", true);

      if (detectedRole === "owner") {
        farmsQuery = farmsQuery.eq("owner_id", userId);
      } else if (currentFarmId) {
        farmsQuery = farmsQuery.eq("id", currentFarmId);
      }

      const { data: farmsData } = await farmsQuery;
      const validFarms = farmsData || [];
      setFarms(validFarms);

      // --- C. CÁLCULOS OPERATIVOS ---
      if (validFarms.length > 0) {
        const farmIds = validFarms.map((f) => f.id);

        // 1. Biomasa
        const { data: batches } = await supabase
          .from("fish_batches")
          .select("current_quantity, average_weight")
          .in("farm_id", farmIds)
          .eq("status", "active");

        const totalB =
          batches?.reduce((acc, b) => {
            return (
              acc + ((b.current_quantity || 0) * (b.average_weight || 0)) / 1000
            );
          }, 0) || 0;

        setTotalBiomasa(Number(totalB.toFixed(1)));

        // 2. Alertas de Inventario
        const { count } = await supabase
          .from("inventory")
          .select("*", { count: "exact", head: true })
          .in("farm_id", farmIds)
          .lt("quantity", 20);
        setAlerts(count || 0);

        // 3. Tareas Pendientes
        let tasksQuery = supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("farm_id", farmIds)
          .eq("status", "pendiente");

        if (detectedRole === "operario") {
          tasksQuery = tasksQuery.eq("assigned_to", userId);
        }

        const { count: tCount } = await tasksQuery;
        setPendingTasksCount(tCount || 0);
      }
    } catch (error) {
      console.error("❌ Error en Dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData]),
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Sincronizando datos...</Text>
      </View>
    );
  }

  // --- RENDERIZADO POR ROL ---
  if (userRole === "operario") {
    return (
      <EmployeeView
        userName={userName}
        farm={farms[0]}
        totalBiomasa={totalBiomasa}
        alerts={alerts}
        pendingTasksCount={pendingTasksCount}
      />
    );
  }

  if (userRole === "admin") {
    return (
      <AdminView
        userName={userName}
        farm={farms[0]}
        totalBiomasa={totalBiomasa}
        alerts={alerts}
        pendingTasksCount={pendingTasksCount}
      />
    );
  }

  if (userRole === "owner") {
    return (
      <OwnerView
        userName={userName}
        farms={farms}
        totalBiomasa={totalBiomasa}
        alerts={alerts}
        pendingTasksCount={pendingTasksCount}
      />
    );
  }

  // --- VISTA DE ERROR / SIN PERMISOS (SALIDA DE EMERGENCIA) ---
  return (
    <View style={styles.center}>
      <Ionicons
        name="lock-closed"
        size={80}
        color="#E53E3E"
        style={{ marginBottom: 20 }}
      />
      <Text style={styles.errorText}>No se detectaron permisos válidos.</Text>
      <Text style={styles.subErrorText}>
        Tu cuenta ({userName || "Usuario"}) no tiene un rol asignado. Contacta
        al soporte.
      </Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Ionicons
          name="log-out-outline"
          size={20}
          color="white"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    color: "#0066CC",
    fontWeight: "600",
  },
  errorText: {
    color: "#2D3748",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  subErrorText: {
    color: "#718096",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#0066CC",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
