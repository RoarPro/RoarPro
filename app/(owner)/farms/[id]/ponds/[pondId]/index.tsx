import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

  const loadPondData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Obtener datos del estanque
      const { data: pondData, error: pondError } = await supabase
        .from("ponds")
        .select("*, inventory(item_name)")
        .eq("id", pondId)
        .single();

      if (pondError) throw pondError;
      setPond(pondData);

      // 2. Obtener el lote de peces activo (el más reciente que no esté finalizado)
      const { data: batchData, error: batchError } = await supabase
        .from("fish_batches")
        .select("*")
        .eq("pond_id", pondId)
        .eq("status", "active")
        .single();

      if (!batchError) {
        setActiveBatch(batchData);
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      Alert.alert("Error", "No se pudo cargar la información del estanque.");
    } finally {
      setLoading(false);
    }
  }, [pondId]);

  useEffect(() => {
    loadPondData();
  }, [loadPondData]);

  // Cálculos rápidos
  const daysInCulture = activeBatch
    ? Math.floor(
        (new Date().getTime() - new Date(activeBatch.started_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const estimatedBiomass = activeBatch
    ? (activeBatch.current_quantity * activeBatch.average_weight) / 1000 // Resultado en Kg
    : 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{pond?.name || "Estanque"}</Text>
          <Text style={styles.headerSubtitle}>
            {activeBatch ? activeBatch.species : "Sin siembra activa"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => {}} style={styles.settingsBtn}>
          <Ionicons name="options-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* KPI CARDS */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons name="calendar-outline" size={20} color="#0369A1" />
            <Text style={styles.statValue}>{daysInCulture}</Text>
            <Text style={styles.statLabel}>Días</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="scale-outline" size={20} color="#166534" />
            <Text style={styles.statValue}>
              {activeBatch?.average_weight || 0}g
            </Text>
            <Text style={styles.statLabel}>Peso Prom.</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF7ED" }]}>
            <Ionicons name="fish-outline" size={20} color="#9A3412" />
            <Text style={styles.statValue}>
              {estimatedBiomass.toFixed(1)}kg
            </Text>
            <Text style={styles.statLabel}>Biomasa Est.</Text>
          </View>
        </View>

        {/* INFO BATCH */}
        {activeBatch ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Resumen de Población</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cantidad Actual:</Text>
                <Text style={styles.infoValue}>
                  {activeBatch.current_quantity} peces
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bodega Aliada:</Text>
                <Text style={styles.infoValue}>
                  {pond?.inventory?.item_name || "No asignada"}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyWarning}
            onPress={() =>
              router.push({
                pathname: `/(owner)/farms/${farmId}/ponds/${pondId}/stocking`,
                params: { pondName: pond.name, pondArea: pond.area_m2 },
              } as any)
            }
          >
            <Ionicons name="add-circle-outline" size={40} color="#0066CC" />
            <Text style={styles.emptyWarningText}>
              No hay una siembra activa
            </Text>
            <Text style={styles.emptyWarningSub}>
              Toca aquí para registrar la siembra de peces.
            </Text>
          </TouchableOpacity>
        )}

        {/* ACCIONES RÁPIDAS */}
        <Text style={styles.sectionTitle}>Registro Diario</Text>
        <View style={styles.actionsGrid}>
          <ActionBtn
            title="Alimentar"
            icon="restaurant-outline"
            color="#0066CC"
            onPress={() => {}} // Navegar a feeding
          />
          <ActionBtn
            title="Muestreo"
            icon="git-commit-outline"
            color="#00C853"
            onPress={() => {}} // Navegar a sampling
          />
          <ActionBtn
            title="Mortalidad"
            icon="skull-outline"
            color="#E53E3E"
            onPress={() => {}} // Navegar a mortality
          />
          <ActionBtn
            title="Calidad Agua"
            icon="water-outline"
            color="#7C3AED"
            onPress={() => {}}
          />
        </View>
      </View>
    </ScrollView>
  );
}

// Componente pequeño para los botones de acción
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
    marginBottom: 25,
    marginTop: -50,
  },
  statCard: {
    width: "31%",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 15,
    marginTop: 10,
  },
  infoSection: { marginBottom: 25 },
  infoCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: { color: "#64748B", fontSize: 14 },
  infoValue: { color: "#1E293B", fontWeight: "bold", fontSize: 14 },
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
  emptyWarning: {
    backgroundColor: "#F0F7FF",
    padding: 30,
    borderRadius: 25,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#0066CC",
    alignItems: "center",
  },
  emptyWarningText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
  },
  emptyWarningSub: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 12,
    marginTop: 5,
  },
});
