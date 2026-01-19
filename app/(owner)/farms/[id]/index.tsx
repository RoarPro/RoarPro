import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function FarmDashboard() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalBiomass: 0,
    totalFood: 0,
    activeAlerts: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    // Bloqueo de seguridad para IDs inválidos
    if (!id || id === "[id]" || id === "undefined") return;

    try {
      setLoading(true);

      // 1. Detalles de la finca
      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .select("*")
        .eq("id", id)
        .single();

      if (farmError) throw farmError;
      setFarm(farmData);

      // 2. BIOMASA REAL (Peces activos en la finca)
      const { data: batches } = await supabase
        .from("fish_batches")
        .select("current_quantity, average_weight")
        .eq("farm_id", id)
        .eq("status", "active");

      const totalBiomass =
        batches?.reduce((acc, batch) => {
          return (
            acc +
            ((batch.current_quantity || 0) * (batch.average_weight || 0)) / 1000
          );
        }, 0) || 0;

      // 3. INVENTARIO REAL (Alimento disponible)
      const { data: invData } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("farm_id", id);

      const totalFood =
        invData?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;

      // 4. ALERTAS (Reportes de campo no resueltos)
      const { count: alertsCount } = await supabase
        .from("field_reports")
        .select("*", { count: "exact", head: true })
        .eq("farm_id", id)
        .eq("resolved", false);

      setStats({
        totalBiomass: Number(totalBiomass.toFixed(1)),
        totalFood: Number(totalFood.toFixed(1)),
        activeAlerts: alertsCount || 0,
      });
    } catch (error: any) {
      console.error("Error Dashboard:", error.message);
      Alert.alert("Error", "No se pudo actualizar la información.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchDashboardData();
          }}
          tintColor="#0066CC"
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(owner)/farms/")}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>Gestión de</Text>
          <Text style={styles.headerTitle}>{farm?.name || "Finca"}</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            fetchDashboardData();
          }}
        >
          <Ionicons name="refresh-circle" size={32} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Tarjeta de KPIs */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Estado Operativo</Text>
          <View style={styles.statsRow}>
            <StatItem
              label="Biomasa (kg)"
              value={stats.totalBiomass}
              color="#1E8E3E"
            />
            <StatItem
              label="Alimento (kg)"
              value={stats.totalFood}
              color="#1A73E8"
            />
            <StatItem
              label="Alertas"
              value={stats.activeAlerts}
              color={stats.activeAlerts > 0 ? "#D93025" : "#718096"}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Menú de Control</Text>

        <View style={styles.menuGrid}>
          <MenuButton
            icon="water"
            label="Estanques"
            color="#0066CC"
            onPress={() => router.push(`/(owner)/farms/${id}/ponds` as any)}
          />

          <MenuButton
            icon="clipboard"
            label="Inventario"
            color="#003366"
            onPress={() => router.push(`/(owner)/farms/${id}/inventory` as any)}
          />

          <MenuButton
            icon="cart"
            label="Ventas"
            color="#00C853"
            onPress={() =>
              Alert.alert("Próximamente", "Módulo de ventas en desarrollo.")
            }
          />

          <MenuButton
            icon="people"
            label="Personal"
            color="#FFA000"
            onPress={() => router.push(`/(owner)/farms/${id}/staff` as any)}
          />

          <MenuButton
            icon="analytics"
            label="Reportes"
            color="#6B46C1"
            onPress={() => router.push("/(owner)/reports" as any)}
          />

          <MenuButton
            icon="settings"
            label="Ajustes"
            color="#4A5568"
            onPress={() => Alert.alert("Configuración", "Ajustes de finca.")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

// Sub-componentes internos para limpieza de código
const MenuButton = ({ icon, label, color, onPress }: any) => (
  <TouchableOpacity style={styles.menuBox} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: color }]}>
      <Ionicons name={icon} size={28} color="white" />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

const StatItem = ({ label, value, color }: any) => (
  <View style={styles.statItem}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#0066CC",
    paddingTop: 60,
    paddingBottom: 35,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  headerInfo: { alignItems: "center" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "900" },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 25,
    marginBottom: 15,
    marginLeft: 5,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuBox: {
    width: "47%",
    backgroundColor: "white",
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  menuLabel: { fontSize: 15, fontWeight: "700", color: "#334155" },
  statsCard: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 22,
    marginTop: -40,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94A3B8",
    marginBottom: 15,
    textAlign: "center",
    textTransform: "uppercase",
  },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "bold" },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
  },
});
