import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PondDetailScreen() {
  const router = useRouter();
  const { id: farmId, pondId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [pond, setPond] = useState<any>(null);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // --- LÓGICA DE CÁLCULO TÉCNICO ---
  const getTechnicalRate = (weightGr: number) => {
    if (weightGr <= 20) return 0.08; // 8%
    if (weightGr <= 150) return 0.05; // 5%
    if (weightGr <= 500) return 0.03; // 3%
    return 0.015; // 1.5%
  };

  const loadPondData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Obtener datos del estanque e inventario
      const { data: pondData, error: pondError } = await supabase
        .from("ponds")
        .select("*, inventory(item_name)")
        .eq("id", pondId)
        .single();

      if (pondError) throw pondError;
      setPond(pondData);

      // 2. Obtener el lote activo
      const { data: batchData } = await supabase
        .from("fish_batches")
        .select("*")
        .eq("pond_id", pondId)
        .eq("status", "active")
        .maybeSingle();

      setActiveBatch(batchData || null);

      // 3. Obtener Historial Combinado (Promesa triple)
      const [mortalidad, alimentacion, pesajes] = await Promise.all([
        supabase
          .from("mortality_logs")
          .select("*")
          .eq("pond_id", pondId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("feeding_logs")
          .select("*")
          .eq("pond_id", pondId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("biomass_logs")
          .select("*")
          .eq("pond_id", pondId)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const combined = [
        ...(mortalidad.data || []).map((item) => ({
          ...item,
          type: "mortality",
          title: "Baja",
          color: "#E53E3E",
          icon: "trending-down",
          bg: "#FFF5F5",
        })),
        ...(alimentacion.data || []).map((item) => ({
          ...item,
          type: "feeding",
          title: "Alimento",
          color: "#3182CE",
          icon: "restaurant",
          bg: "#EBF8FF",
        })),
        ...(pesajes.data || []).map((item) => ({
          ...item,
          type: "biomass",
          title: "Pesaje",
          color: "#38A169",
          icon: "scale",
          bg: "#F0FFF4",
        })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setHistoryLogs(combined.slice(0, 6));
    } catch (error: any) {
      console.error("Error:", error.message);
      Alert.alert("Error", "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }, [pondId]);

  useFocusEffect(
    useCallback(() => {
      loadPondData();
    }, [loadPondData]),
  );

  // Cálculos dinámicos
  const daysInCulture = activeBatch?.start_date
    ? Math.floor(
        (new Date().getTime() - new Date(activeBatch.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const estimatedBiomass = activeBatch
    ? ((activeBatch.current_quantity || 0) *
        (activeBatch.average_weight_g || 0)) /
      1000
    : 0;

  const tasaTecnica = activeBatch
    ? getTechnicalRate(activeBatch.average_weight_g)
    : 0;
  const racionSugerida = estimatedBiomass * tasaTecnica;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{pond?.name || "Estanque"}</Text>
          <Text style={styles.headerSubtitle}>
            {activeBatch ? activeBatch.species : "Sin siembra"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() =>
            router.push(`/(owner)/farms/${farmId}/ponds/${pondId}/settings` as any,
            )
          }
        >
          <Ionicons name="options-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* KPI CARDS */}
        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-outline"
            value={daysInCulture}
            label="Días"
            color="#0369A1"
            bg="#E0F2FE"
          />
          <StatCard
            icon="scale-outline"
            value={`${activeBatch?.average_weight_g || 0}g`}
            label="Peso Prom."
            color="#166534"
            bg="#F0FDF4"
          />
          <StatCard
            icon="fish-outline"
            value={`${estimatedBiomass.toFixed(1)}kg`}
            label="Biomasa"
            color="#9A3412"
            bg="#FFF7ED"
          />
        </View>

        {/* RECOMENDACIÓN TÉCNICA (Lo nuevo importante) */}
        {activeBatch && (
          <View style={styles.recommendationCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="analytics" size={20} color="#2B6CB0" />
              <Text style={styles.recommendationTitle}>
                {" "}
                RACIÓN DIARIA SUGERIDA
              </Text>
            </View>
            <Text style={styles.recommendationText}>
              Suministrar:{" "}
              <Text style={{ fontWeight: "bold" }}>
                {racionSugerida.toFixed(1)} Kg
              </Text>
            </Text>
            <Text style={styles.recommendationSub}>
              Tasa metabólica: {(tasaTecnica * 100).toFixed(1)}% de la biomasa.
            </Text>
          </View>
        )}

        {/* REGISTRO DIARIO */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <ActionBtn
            title="Alimentar"
            icon="restaurant-outline"
            color="#0066CC"
            onPress={() =>
              router.push({
                pathname: `/(owner)/farms/${farmId}/ponds/${pondId}/feeding`,
                params: { pondId },
              } as any)
            }
          />
          <ActionBtn
            title="Pesaje"
            icon="git-commit-outline"
            color="#00C853"
            onPress={() =>
              router.push({
                pathname: `/(owner)/farms/${farmId}/ponds/${pondId}/sampling`,
                params: { pondId },
              } as any)
            }
          />
          <ActionBtn
            title="Bajas"
            icon="skull-outline"
            color="#E53E3E"
            onPress={() =>
              router.push({
                pathname: `/(owner)/farms/${farmId}/ponds/${pondId}/mortality`,
                params: { pondId },
              } as any)
            }
          />
          <ActionBtn
            title="Agua"
            icon="water-outline"
            color="#7C3AED"
            onPress={() =>
              router.push({
                pathname: `/(owner)/farms/${farmId}/ponds/${pondId}/water_quality`,
                params: { pondId },
              } as any)
            }
          />
        </View>

        {/* HISTORIAL RECIENTE (Lo nuevo importante) */}
        <Text style={styles.sectionTitle}>Historial del Estanque</Text>
        <View style={styles.historyCard}>
          {historyLogs.length === 0 ? (
            <Text style={styles.emptyText}>Sin registros recientes</Text>
          ) : (
            historyLogs.map((log, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={[styles.historyIcon, { backgroundColor: log.bg }]}>
                  <Ionicons name={log.icon} size={18} color={log.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.historyTitle}>
                    {log.type === "mortality"
                      ? `${log.quantity} peces`
                      : log.type === "feeding"
                        ? `${log.amount_kg} Kg`
                        : `${log.avg_weight_gr} gr`}
                    <Text style={{ fontWeight: "400", color: "#718096" }}>
                      {" "}
                      • {log.title}
                    </Text>
                  </Text>
                </View>
                <Text style={styles.historyDate}>
                  {new Date(log.created_at).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                  })}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// COMPONENTES AUXILIARES
function StatCard({ icon, value, label, color, bg }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionBtn({ title, icon, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#003366",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backBtn: { padding: 8 },
  settingsBtn: { padding: 8 },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSubtitle: { color: "#93C5FD", fontSize: 14 },
  content: { padding: 20 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: -50,
  },
  statCard: {
    width: "31%",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    elevation: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 9,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 15,
    marginTop: 15,
  },
  recommendationCard: {
    backgroundColor: "#EBF8FF",
    padding: 18,
    borderRadius: 20,
    borderLeftWidth: 5,
    borderLeftColor: "#3182CE",
    marginBottom: 10,
  },
  recommendationTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2B6CB0",
    letterSpacing: 0.5,
  },
  recommendationText: { fontSize: 18, color: "#2D3748", marginTop: 5 },
  recommendationSub: { fontSize: 12, color: "#4A5568", marginTop: 2 },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 22,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  actionIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionText: { fontWeight: "600", color: "#475569", fontSize: 13 },
  historyCard: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 10,
    elevation: 2,
    marginBottom: 40,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingHorizontal: 5,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  historyTitle: { fontSize: 14, fontWeight: "bold", color: "#2D3748" },
  historyDate: { fontSize: 11, color: "#A0AEC0" },
  emptyText: { padding: 20, textAlign: "center", color: "#A0AEC0" },
});
