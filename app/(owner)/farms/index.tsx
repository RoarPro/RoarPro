import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// IMPORTACIÓN DE VISTAS POR ROL
import AdminView from "@/components/views/AdminView";
import EmployeeView from "@/components/views/EmployeeView";
import OwnerView from "@/components/views/OwnerView";

// Definimos tipos para mayor seguridad
type UserRole = "owner" | "admin" | "operario" | null;

export default function FarmsScreen() {
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
      // Resetear estados para limpieza de sesión
      setUserRole(null);
      setFarms([]);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const userId = user.id;

      // --- A. IDENTIFICACIÓN DE ROL ---
      let detectedRole: UserRole = null;
      let currentFarmId: string | null = null;

      // 1. Buscamos en PROFILES (Unificamos búsqueda según tu nueva estructura)
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
          // Si el perfil dice que no es owner, buscamos su asignación en employees
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

      if (!detectedRole) {
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

        // 1. Biomasa (Cálculo optimizado)
        const { data: batches } = await supabase
          .from("fish_batches")
          .select("current_quantity, average_weight")
          .in("farm_id", farmIds)
          .eq("status", "active");

        const totalB =
          batches?.reduce((acc, b) => {
            const qty = b.current_quantity || 0;
            const weight = b.average_weight || 0; // asumiendo gramos
            return acc + (qty * weight) / 1000; // resultado en kg
          }, 0) || 0;

        setTotalBiomasa(Number(totalB.toFixed(1)));

        // 2. Alertas de Inventario (Stock bajo)
        const { count: inventoryCount } = await supabase
          .from("inventory")
          .select("*", { count: "exact", head: true })
          .in("farm_id", farmIds)
          .lt("quantity", 20); // Umbral de alerta
        setAlerts(inventoryCount || 0);

        // 3. Tareas Pendientes
        let tasksQuery = supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("farm_id", farmIds)
          .eq("status", "pendiente");

        if (detectedRole === "operario") {
          tasksQuery = tasksQuery.eq("assigned_to", userId);
        }

        const { count: tasksCount } = await tasksQuery;
        setPendingTasksCount(tasksCount || 0);
      }
    } catch (error) {
      console.error("Error en Dashboard Principal:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData]),
  );

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

  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>No se detectaron permisos válidos.</Text>
      <Text style={styles.subErrorText}>
        Contacta al administrador del sistema.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  loadingText: { marginTop: 15, color: "#0066CC", fontWeight: "600" },
  errorText: {
    color: "#2D3748",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  subErrorText: {
    color: "#718096",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
