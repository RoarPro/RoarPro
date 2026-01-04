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

  const [stats, setStats] = useState({
    totalFish: 0,
    totalFood: 0,
    todaySales: 0
  });

  const fetchDashboardData = useCallback(async () => {
    // 🛡️ BLOQUEO DE SEGURIDAD MEJORADO
    const invalidIds = ["staff", "ponds", "inventory", "undefined", "[id]", "create"];
    if (!id || typeof id !== 'string' || invalidIds.includes(id)) {
      setLoading(false);
      return;
    }

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

      // 2. Total de peces de esta finca específica
      const { data: pondsData } = await supabase
        .from("ponds")
        .select("current_stock")
        .eq("farm_id", id);
      
      const totalFish = pondsData?.reduce((acc, curr) => acc + (curr.current_stock || 0), 0) || 0;

      // 3. Inventario
      const { data: invData } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("farm_id", id);
      
      const totalFood = invData?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;

      setStats({
        totalFish,
        totalFood,
        todaySales: 0 // Aquí puedes añadir la lógica de ventas si ya tienes la tabla
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
        <TouchableOpacity onPress={() => router.push("/(owner)/farms/")}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{farm?.name || "Panel de Finca"}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Gestión de Finca</Text>
        
        <View style={styles.menuGrid}>
          {/* NAVEGACIÓN CORREGIDA A LAS NUEVAS RUTAS */}
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
            label="Empleados" 
            color="#FFA000" 
            onPress={() => router.push(`/(owner)/farms/${id}/staff` as any)} 
          />
          
          <MenuButton icon="analytics" label="Reportes" color="#6B46C1" onPress={() => {}} />
          <MenuButton icon="settings" label="Configuración" color="#4A5568" onPress={() => {}} />
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Resumen de Finca</Text>
          <View style={styles.statsRow}>
            <StatItem label="Peces" value={stats.totalFish.toLocaleString()} />
            <StatItem label="Alimento (kg)" value={stats.totalFood.toLocaleString()} />
            <StatItem label="Alertas" value="0" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Sub-componentes
const MenuButton = ({ icon, label, color, onPress }: any) => (
  <TouchableOpacity style={styles.menuBox} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: color }]}>
      <Ionicons name={icon} size={30} color="white" />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

const StatItem = ({ label, value }: any) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { 
    backgroundColor: "#0066CC", 
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, 
    flexDirection: "row", justifyContent: "space-between", alignItems: "center" 
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#003366", marginBottom: 20 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  menuBox: { 
    width: "47%", backgroundColor: "white", borderRadius: 16, 
    padding: 20, marginBottom: 15, alignItems: "center", elevation: 2 
  },
  iconBox: { 
    width: 55, height: 55, borderRadius: 15, 
    justifyContent: "center", alignItems: "center", marginBottom: 10 
  },
  menuLabel: { fontSize: 13, fontWeight: "bold", color: "#4A5568" },
  statsCard: { backgroundColor: "white", borderRadius: 16, padding: 20, marginTop: 10, elevation: 2 },
  statsTitle: { fontSize: 15, fontWeight: "bold", color: "#003366", marginBottom: 15 },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#0066CC" },
  statLabel: { fontSize: 11, color: "#718096" }
});