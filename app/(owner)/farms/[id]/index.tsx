import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function FarmDashboard() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados con datos REALES
  const [stats, setStats] = useState({
    totalBiomass: 0,
    totalFood: 0,
    activeAlerts: 0
  });

  const fetchDashboardData = useCallback(async () => {
    // Bloqueo de seguridad para rutas dinámicas
    const invalidIds = ["staff", "ponds", "inventory", "undefined", "[id]", "create"];
    if (!id || typeof id !== 'string' || invalidIds.includes(id)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 1. Detalles de la finca específica
      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .select("*")
        .eq("id", id)
        .single();
      
      if (farmError) throw farmError;
      setFarm(farmData);

      // 2. BIOMASA REAL: Consultamos los lotes de peces (fish_batches) de ESTA finca
      const { data: batches } = await supabase
        .from("fish_batches")
        .select("current_quantity, average_weight")
        .eq("farm_id", id)
        .eq("status", "active");
      
      const totalBiomass = batches?.reduce((acc, batch) => {
        const weightKg = (batch.average_weight || 0) / 1000;
        return acc + ((batch.current_quantity || 0) * weightKg);
      }, 0) || 0;

      // 3. INVENTARIO REAL: Solo de esta finca
      const { data: invData } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("farm_id", id);
      
      const totalFood = invData?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;

      // 4. ALERTAS REALES: Consultamos tu tabla 'alerts' para esta finca
      const { count: alertsCount } = await supabase
        .from("alerts")
        .select('*', { count: 'exact', head: true })
        .eq("farm_id", id)
        .eq("is_resolved", false);

      setStats({
        totalBiomass: Number(totalBiomass.toFixed(1)),
        totalFood: Number(totalFood.toFixed(1)),
        activeAlerts: alertsCount || 0
      });

    } catch (error: any) {
      console.error("Error cargando Dashboard:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(owner)/farms/" as any)}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>Gestión de</Text>
          <Text style={styles.headerTitle}>{farm?.name || "Finca"}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-circle" size={32} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Tarjeta de Resumen Rápido */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Estado Actual</Text>
          <View style={styles.statsRow}>
            <StatItem label="Biomasa (kg)" value={stats.totalBiomass} color="#1E8E3E" />
            <StatItem label="Alimento (kg)" value={stats.totalFood} color="#1A73E8" />
            <StatItem label="Alertas" value={stats.activeAlerts} color={stats.activeAlerts > 0 ? "#D93025" : "#718096"} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Operaciones</Text>
        
        <View style={styles.menuGrid}>
          <MenuButton 
            icon="water" 
            label="Estanques" 
            color="#0066CC" 
            onPress={() => router.push({ 
                pathname: "/(owner)/ponds", 
                params: { farmId: id } 
            } as any)} 
          />
          
          <MenuButton 
            icon="clipboard" 
            label="Inventario" 
            color="#003366" 
            onPress={() => router.push({ 
                pathname: "/(owner)/inventory", 
                params: { farmId: id } 
            } as any)} 
          />
          
          <MenuButton icon="cart" label="Ventas" color="#00C853" onPress={() => {}} />
          
          <MenuButton 
            icon="people" 
            label="Personal" 
            color="#FFA000" 
            onPress={() => router.push(`/(owner)/farms/${id}/staff` as any)} 
          />
          
          <MenuButton icon="analytics" label="Reportes" color="#6B46C1" onPress={() => {}} />
          <MenuButton icon="settings" label="Configuración" color="#4A5568" onPress={() => {}} />
        </View>
      </View>
    </ScrollView>
  );
}

// Sub-componentes
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
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, 
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30
  },
  headerInfo: { alignItems: "center" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, textTransform: "uppercase" },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#003366", marginTop: 25, marginBottom: 15 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  menuBox: { 
    width: "47%", backgroundColor: "white", borderRadius: 20, 
    padding: 20, marginBottom: 15, alignItems: "center", 
    elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  iconBox: { 
    width: 50, height: 50, borderRadius: 15, 
    justifyContent: "center", alignItems: "center", marginBottom: 10 
  },
  menuLabel: { fontSize: 14, fontWeight: "bold", color: "#4A5568" },
  statsCard: { 
    backgroundColor: "white", borderRadius: 20, padding: 20, 
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
  },
  statsTitle: { fontSize: 14, fontWeight: "bold", color: "#718096", marginBottom: 15, textAlign: "center" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 10, color: "#A0AEC0", marginTop: 4, textAlign: "center" }
});