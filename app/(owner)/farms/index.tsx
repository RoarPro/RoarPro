import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AdminView from "@/components/views/AdminView";
import EmployeeView from "@/components/views/EmployeeView";
import OwnerView from "@/components/views/OwnerView";

type UserRole = "owner" | "admin" | "operario" | "socio" | null;

export default function FarmsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState("");
  const [farms, setFarms] = useState<any[]>([]);
  const [totalBiomasa, setTotalBiomasa] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  // Estado para el Menú del Avatar
  const [menuVisible, setMenuVisible] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const userId = user.id;
      let detectedRole: UserRole = null;
      let currentFarmId: string | null = null;

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
          const { data: member } = await supabase
            .from("farm_members")
            .select("role, farm_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (member) {
            const normalized =
              member.role === "administrador" ? "admin" : member.role;
            detectedRole = normalized as UserRole;
            currentFarmId = member.farm_id;
          }
        }
      }

      if (!detectedRole) {
        setUserRole(null);
        return;
      }

      setUserRole(detectedRole);

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

      if (validFarms.length > 0) {
        const farmIds = validFarms.map((f) => f.id);
        const { data: batches } = await supabase
          .from("fish_batches")
          .select("current_quantity, average_weight")
          .in("farm_id", farmIds)
          .eq("status", "active");
        const totalB =
          batches?.reduce(
            (acc, b) =>
              acc +
              ((b.current_quantity || 0) * (b.average_weight || 0)) / 1000,
            0,
          ) || 0;
        setTotalBiomasa(Number(totalB.toFixed(1)));

        const { count } = await supabase
          .from("inventory")
          .select("*", { count: "exact", head: true })
          .in("farm_id", farmIds)
          .lt("stock_actual", 20);
        setAlerts(count || 0);

        let tasksQuery = supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("farm_id", farmIds)
          .eq("status", "pendiente");
        if (detectedRole === "operario")
          tasksQuery = tasksQuery.eq("assigned_to", userId);
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
    setMenuVisible(false);
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  // --- COMPONENTE DEL AVATAR ---
  const AvatarMenu = () => (
    <View style={styles.avatarContainer}>
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        style={styles.avatarCircle}
      >
        <Ionicons name="person" size={22} color="#003366" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuCard}>
              <Text style={styles.menuName}>{userName}</Text>
              <Text style={styles.menuRole}>{userRole?.toUpperCase()}</Text>
              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push("/(owner)/profile");
                }}
              >
                <Ionicons name="settings-outline" size={20} color="#4A5568" />
                <Text style={styles.menuItemText}>Perfil y Seguridad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { marginTop: 10 }]}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
                <Text style={[styles.menuItemText, { color: "#E53E3E" }]}>
                  Cerrar Sesión
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Sincronizando datos...</Text>
      </View>
    );

  // --- RENDERIZADO CON AVATAR INCLUIDO ---
  return (
    <View style={{ flex: 1 }}>
      <AvatarMenu />
      {userRole === "operario" && (
        <EmployeeView
          userName={userName}
          farm={farms[0]}
          totalBiomasa={totalBiomasa}
          alerts={alerts}
          pendingTasksCount={pendingTasksCount}
        />
      )}
      {userRole === "admin" && (
        <AdminView
          userName={userName}
          farm={farms[0]}
          totalBiomasa={totalBiomasa}
          alerts={alerts}
          pendingTasksCount={pendingTasksCount}
        />
      )}
      {userRole === "owner" && (
        <OwnerView
          userName={userName}
          farms={farms}
          pendingTasksCount={pendingTasksCount}
        />
      )}

      {!userRole && (
        <View style={styles.center}>
          <Ionicons
            name="lock-closed"
            size={80}
            color="#E53E3E"
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.errorText}>Sin acceso</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}
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
  avatarContainer: { position: "absolute", top: 50, right: 20, zIndex: 999 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 20,
  },
  menuCard: {
    backgroundColor: "white",
    width: 220,
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  menuName: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  menuRole: { fontSize: 11, color: "#64748B", marginBottom: 10 },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginBottom: 15 },
  menuItem: { flexDirection: "row", alignItems: "center" },
  menuItemText: { marginLeft: 10, fontWeight: "600", color: "#4A5568" },
  loadingText: { marginTop: 15, color: "#0066CC", fontWeight: "600" },
  logoutButton: {
    backgroundColor: "#0066CC",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  logoutButtonText: { color: "white", fontWeight: "bold" },
  errorText: { fontSize: 18, fontWeight: "bold", color: "#2D3748" },
});
