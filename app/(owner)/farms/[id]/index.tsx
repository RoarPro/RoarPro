import { supabase } from "@/lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"; // Añadimos Material para iconos de campo
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

  // --- NUEVO: ESTADO DE ROL ---
  const [role, setRole] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalBiomass: 0,
    totalFood: 0,
    activeAlerts: 0,
    dailyConsumption: 0,
    autonomyDays: 0,
    bodegaAllocations: [] as {
      inventoryId: string;
      name: string;
      dailyAvg: number;
      weeklyNeed: number;
    }[],
  });

  const getTechnicalRate = (weightGr: number) => {
    if (weightGr <= 20) return 0.08;
    if (weightGr <= 150) return 0.05;
    if (weightGr <= 500) return 0.03;
    return 0.015;
  };

  const fetchDashboardData = useCallback(async () => {
    if (!id || id === "[id]" || id === "undefined") return;

    try {
      setLoading(true);

      // --- 1. DETECCIÓN DE ROL (El motor del camaleón) ---
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setRole(profile?.role || null);
      }

      // --- 2. DATOS DE LA FINCA ---
      const { data: farmData } = await supabase
        .from("farms")
        .select("*")
        .eq("id", id)
        .single();
      if (farmData) setFarm(farmData);

      // --- 3. CÁLCULOS (Tu lógica original intacta) ---
      const { data: batches } = await supabase
        .from("fish_batches")
        .select("pond_id, current_quantity, average_weight_g")
        .eq("farm_id", id)
        .eq("status", "active");

      let totalBiomassCalc = 0;
      let theoreticalConsumption = 0;
      const activePondIds: string[] = [];
      const pondInventoryMap: Record<string, string | null> = {};

      batches?.forEach((batch) => {
        if (batch.pond_id) activePondIds.push(batch.pond_id);
        const qty = batch.current_quantity || 0;
        const weight = batch.average_weight_g || 0;
        const biomass = (qty * weight) / 1000;
        totalBiomassCalc += biomass;
        theoreticalConsumption += biomass * getTechnicalRate(weight);
      });

      // Ponds -> inventory_id map
      if (activePondIds.length > 0) {
        const { data: pondInventory } = await supabase
          .from("ponds")
          .select("id, inventory_id")
          .in("id", activePondIds);
        pondInventory?.forEach((p) => {
          pondInventoryMap[p.id] = p.inventory_id;
        });
      }

      let realDailyConsumption = 0;
      const perBodegaTotals: Record<string, number> = {};
      let daysWithData = 0;

      if (activePondIds.length > 0) {
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const { data: recentFeedings } = await supabase
          .from("ponds_daily")
          .select("feed_kg, date, pond_id")
          .eq("farm_id", id)
          .gte("date", tenDaysAgo.toISOString().slice(0, 10));

        if (recentFeedings && recentFeedings.length > 0) {
          // Agrupar por fecha (suma de la finca por día)
          const byDate: Record<string, number> = {};
          recentFeedings.forEach((row) => {
            const day = row.date;
            const feed = Number(row.feed_kg) || 0;
            byDate[day] = (byDate[day] || 0) + feed;

            // Acumular por bodega según inventory_id del estanque
            const invId = pondInventoryMap[row.pond_id] || "sin_bodega";
            perBodegaTotals[invId] = (perBodegaTotals[invId] || 0) + feed;
          });

          const totals = Object.values(byDate);
          daysWithData = totals.length;
          if (daysWithData >= 3) {
            const farmTotal = totals.reduce((s, v) => s + v, 0);
            realDailyConsumption = farmTotal / daysWithData;
          }
        }
      }

      const consumptionToUse =
        realDailyConsumption > 0
          ? realDailyConsumption
          : theoreticalConsumption;

      const { data: invData } = await supabase
        .from("inventory")
        .select("stock_actual")
        .eq("farm_id", id);
      const totalFoodCalc =
        invData?.reduce((acc, curr) => acc + (curr.stock_actual || 0), 0) || 0;
      const autonomyDaysCalc =
        consumptionToUse > 0 ? Math.floor(totalFoodCalc / consumptionToUse) : 0;

      const { count: alertsCount } = await supabase
        .from("field_reports")
        .select("*", { count: "exact", head: true })
        .eq("farm_id", id)
        .eq("resolved", false);

      // Cargar nombres de bodegas para el desglose
      let bodegaAllocations: {
        inventoryId: string;
        name: string;
        dailyAvg: number;
        weeklyNeed: number;
      }[] = [];
      if (Object.keys(perBodegaTotals).length > 0) {
        const { data: invNames } = await supabase
          .from("inventory")
          .select("id, item_name")
          .eq("farm_id", id);
        const nameMap: Record<string, string> = {};
        invNames?.forEach((i) => (nameMap[i.id] = i.item_name));

        const divisor = daysWithData > 0 ? daysWithData : 1;
        bodegaAllocations = Object.entries(perBodegaTotals).map(
          ([invId, total]) => {
            const dailyAvg = total / divisor;
            return {
              inventoryId: invId,
              name: nameMap[invId] || "Bodega sin nombre",
              dailyAvg: Number(dailyAvg.toFixed(2)),
              weeklyNeed: Number((dailyAvg * 7).toFixed(1)),
            };
          },
        );
      }

      setStats({
        totalBiomass: Number(totalBiomassCalc.toFixed(1)),
        totalFood: Number(totalFoodCalc.toFixed(1)),
        activeAlerts: alertsCount || 0,
        dailyConsumption: Number(consumptionToUse.toFixed(1)),
        autonomyDays: autonomyDaysCalc,
        bodegaAllocations,
      });
    } catch (error) {
      console.log("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const autonomyStyle = (days: number, consumption: number) => {
    if (consumption === 0)
      return {
        bg: "#F1F5F9",
        text: "#64748B",
        icon: "information-outline",
        status: "Sin consumo",
      };
    if (days > 15)
      return {
        bg: "#F0FDF4",
        text: "#166534",
        icon: "check-decagram-outline",
        status: "Saludable",
      };
    if (days >= 7)
      return {
        bg: "#FFF7ED",
        text: "#9A3412",
        icon: "alert-outline",
        status: "Planificar",
      };
    return {
      bg: "#FEF2F2",
      text: "#991B1B",
      icon: "alert-octagon-outline",
      status: "Crítico",
    };
  };

  const style = autonomyStyle(stats.autonomyDays, stats.dailyConsumption);

  if (loading && !refreshing)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );

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
        />
      }
    >
      {/* HEADER DINÁMICO */}
      <View style={styles.header}>
        {/* Solo el Dueño ve el botón de atrás a la lista de fincas */}
        {role === "owner" ? (
          <TouchableOpacity onPress={() => router.replace("/(owner)/farms/")}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} /> // Espacio para mantener el título centrado
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>Panel de Control</Text>
          <Text style={styles.headerTitle}>{farm?.name || "Finca"}</Text>
        </View>
        <TouchableOpacity onPress={fetchDashboardData}>
          <Ionicons name="refresh-circle" size={32} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* KPIs GENERALES (Todos los ven, es info útil) */}
        <View style={styles.statsCard}>
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

        {/* 1. SECCIÓN DE ACCIONES DE CAMPO (Solo Operario y Administrador) */}
        {(role === "operario" || role === "administrador") && (
          <>
            <Text style={styles.sectionTitle}>Registros Diarios</Text>
            <View style={styles.actionGrid}>
              <QuickAction
                label="Alimento"
                icon="food-apple"
                color="#0066CC"
                onPress={() =>
                  router.push(`/(employee)/feeding?farmId=${id}` as any)
                }
              />
              <QuickAction
                label="Parámetros"
                icon="water-percent"
                color="#00CC99"
                onPress={() =>
                  router.push(`/(employee)/water?farmId=${id}` as any)
                }
              />
              <QuickAction
                label="Mortalidad"
                icon="skull-crossbones"
                color="#CC3333"
                onPress={() =>
                  router.push(`/(employee)/mortality?farmId=${id}` as any)
                }
              />
            </View>
          </>
        )}

        {/* 2. TARJETA DE AUTONOMÍA (Solo Dueño, Socio y Administrador) */}
        {(role === "owner" || role === "socio" || role === "administrador") && (
          <View style={[styles.autonomyCard, { backgroundColor: style.bg }]}>
            <View style={styles.autonomyHeader}>
              <MaterialCommunityIcons
                name={style.icon as any}
                size={22}
                color={style.text}
              />
              <Text style={[styles.autonomyStatus, { color: style.text }]}>
                {style.status}
              </Text>
            </View>
            <View style={styles.autonomyBody}>
              <Text style={[styles.autonomyDays, { color: style.text }]}>
                {stats.dailyConsumption > 0 ? stats.autonomyDays : "--"}{" "}
                <Text style={styles.autonomyLabel}>días</Text>
              </Text>
              <View style={styles.autonomyDetails}>
                <Text style={styles.autonomyDetailText}>
                  Consumo:{" "}
                  <Text style={{ fontWeight: "bold" }}>
                    {stats.dailyConsumption} Kg/día
                  </Text>
                </Text>
                <Text style={styles.autonomyDetailText}>
                  Bodega:{" "}
                  <Text style={{ fontWeight: "bold" }}>
                    {stats.totalFood} Kg
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {stats.bodegaAllocations.length > 0 && (
          <View style={styles.bodegaCard}>
            <View style={styles.bodegaHeader}>
              <Ionicons name="cube-outline" size={18} color="#0F172A" />
              <Text style={styles.bodegaTitle}>Sugerencia por bodega</Text>
            </View>
            {stats.bodegaAllocations.map((bodega) => (
              <View key={bodega.inventoryId} style={styles.bodegaRow}>
                <View>
                  <Text style={styles.bodegaName}>{bodega.name}</Text>
                  <Text style={styles.bodegaSub}>
                    Promedio diario: {bodega.dailyAvg} kg/día
                  </Text>
                </View>
                <Text style={styles.bodegaBadge}>
                  Sugerir 7 días: {bodega.weeklyNeed} kg
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 3. MENÚ DE CONTROL (Filtrado por Rol) */}
        <Text style={styles.sectionTitle}>Gestión</Text>
        <View style={styles.menuGrid}>
          <MenuButton
            icon="water"
            label="Estanques"
            color="#0066CC"
            onPress={() => router.push(`/(owner)/farms/${id}/ponds` as any)}
          />

          {/* Solo el dueño puede ver Personal */}
          {role === "owner" && (
            <MenuButton
              icon="people"
              label="Personal"
              color="#FFA000"
              onPress={() => router.push(`/(owner)/farms/${id}/staff` as any)}
            />
          )}

          {/* Dueño, Socio y Admin ven Inventario y Reportes */}
          {(role === "owner" ||
            role === "socio" ||
            role === "administrador") && (
            <>
              <MenuButton
                icon="clipboard"
                label="Inventario"
                color="#003366"
                onPress={() =>
                  router.push(`/(owner)/inventory?id=${id}` as any)
                }
              />
              <MenuButton
                icon="analytics"
                label="Reportes"
                color="#6B46C1"
                onPress={() => router.push("/(owner)/reports" as any)}
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// --- COMPONENTES AUXILIARES ---

const QuickAction = ({ label, icon, color, onPress }: any) => (
  <TouchableOpacity
    style={[styles.actionBox, { backgroundColor: color }]}
    onPress={onPress}
  >
    <MaterialCommunityIcons name={icon} size={26} color="white" />
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

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
  },
  headerInfo: { alignItems: "center" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    textTransform: "uppercase",
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "900" },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 25,
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statsCard: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 22,
    marginTop: -50,
    elevation: 8,
    marginBottom: 20,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 11, color: "#64748B", marginTop: 4 },

  // Acciones rápidas (NUEVO)
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionBox: {
    width: "31%",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
  },
  actionLabel: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 8,
  },

  autonomyCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
    elevation: 2,
  },
  autonomyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  autonomyStatus: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  autonomyBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  autonomyDays: { fontSize: 36, fontWeight: "900" },
  autonomyLabel: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  autonomyDetails: {
    backgroundColor: "rgba(255,255,255,0.4)",
    padding: 10,
    borderRadius: 12,
  },
  autonomyDetailText: { fontSize: 11, color: "#475569" },
  bodegaCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bodegaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  bodegaTitle: { fontWeight: "700", color: "#0F172A" },
  bodegaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  bodegaName: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  bodegaSub: { fontSize: 12, color: "#475569" },
  bodegaBadge: {
    backgroundColor: "#E0F2FE",
    color: "#0369A1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: "700",
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
    padding: 20,
    marginBottom: 18,
    alignItems: "center",
    elevation: 4,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  menuLabel: { fontSize: 14, fontWeight: "700", color: "#334155" },
});
