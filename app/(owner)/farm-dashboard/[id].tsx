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

  // Estados para estadísticas
  const [stats, setStats] = useState({
    totalFish: 0,
    totalFood: 0,
    todaySales: 0
  });

  const fetchDashboardData = useCallback(async () => {
    // 🛡️ BLOQUEO DE SEGURIDAD PARA RUTAS NO VÁLIDAS
    const invalidIds = ["staff", "ponds", "inventory", "undefined", "[id]"];
    if (!id || typeof id !== 'string' || invalidIds.includes(id)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 1. Obtener detalles de la finca
      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .select("*")
        .eq("id", id)
        .single();
      
      if (farmError) throw farmError;
      setFarm(farmData);

      // 2. Calcular total de peces
      const { data: pondsData } = await supabase
        .from("ponds")
        .select("current_stock")
        .eq("farm_id", id);
      
      const totalFish = pondsData?.reduce((acc, curr) => acc + (curr.current_stock || 0), 0) || 0;

      // 3. Obtener inventario total
      const { data: invData } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("farm_id", id);
      
      const totalFood = invData?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;

      // 4. Ventas de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: salesData } = await supabase
        .from("sales")
        .select("total_price")
        .eq("farm_id", id)
        .eq("sale_date", today);
      
      const todaySales = salesData?.reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;

      setStats({
        totalFish,
        totalFood,
        todaySales
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{farm?.name || "Panel de Finca"}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Panel de Control</Text>
        
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
          
          <MenuButton icon="cart" label="Ventas" color="#00C853" onPress={() => {/* Próxima pantalla */}} />
          
          <MenuButton 
            icon="people" 
            label="Empleados" 
            color="#FFA000" 
            onPress={() => router.push({
                pathname: "/(owner)/farm-dashboard/staff/[id]",
                params: { id: id as string }
            } as any)} 
          />
          
          <MenuButton icon="analytics" label="Reportes" color="#6B46C1" onPress={() => {/* Próxima pantalla */}} />
          <MenuButton icon="settings" label="Configuración" color="#4A5568" onPress={() => {/* Próxima pantalla */}} />
        </View>

        {/* RESUMEN DE ESTADÍSTICAS */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Resumen de Hoy</Text>
          <View style={styles.statsRow}>
            <StatItem label="Peces Totales" value={stats.totalFish.toLocaleString()} />
            <StatItem label="Alimento (kg)" value={stats.totalFood.toLocaleString()} />
            <StatItem label="Ventas Hoy" value={`$${stats.todaySales.toLocaleString()}`} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// --- SUB-COMPONENTES ---

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

// --- ESTILOS ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { 
    backgroundColor: "#0066CC", 
    paddingTop: 60, 
    paddingBottom: 30, 
    paddingHorizontal: 20, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
  content: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#003366", marginBottom: 20 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  menuBox: { 
    width: "47%", 
    backgroundColor: "white", 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 15, 
    alignItems: "center", 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOpacity: 0.05, 
    shadowRadius: 5 
  },
  iconBox: { 
    width: 60, 
    height: 60, 
    borderRadius: 15, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 10 
  },
  menuLabel: { fontSize: 14, fontWeight: "bold", color: "#4A5568" },
  statsCard: { backgroundColor: "white", borderRadius: 16, padding: 20, marginTop: 10, elevation: 2 },
  statsTitle: { fontSize: 16, fontWeight: "bold", color: "#003366", marginBottom: 15 },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#0066CC" },
  statLabel: { fontSize: 12, color: "#718096" }
});