import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Pond = {
  id: string;
  name: string;
  active: boolean;
  farm_id: string;
  inventory_id: string | null;
  current_stock: number;
  area_m2: number;
};

export default function PondsScreen() {
  const router = useRouter();
  const { id: farmId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ponds, setPonds] = useState<Pond[]>([]);

  const loadPonds = useCallback(async () => {
    if (!farmId) return;

    try {
      setLoading(true);
      const { data: pondsData, error: pondsError } = await supabase
        .from("ponds")
        .select(
          "id, name, active, farm_id, inventory_id, current_stock, area_m2",
        )
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false });

      if (pondsError) throw pondsError;
      setPonds(pondsData || []);
    } catch (error: any) {
      console.error("Error en loadPonds:", error.message);
      Alert.alert(
        "Error de Carga",
        "No pudimos obtener la lista de estanques.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId]);

  useEffect(() => {
    loadPonds();
  }, [loadPonds]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPonds();
  };

  const renderItem = ({ item }: { item: Pond }) => {
    const hasFish = (item.current_stock || 0) > 0;

    // ✅ Solución al Error 2322: Usar 'as any' para calmar a TypeScript en rutas dinámicas
    const goToDetail = () => {
      router.push(`/(owner)/farms/${farmId}/ponds/${item.id}` as any);
    };

    const goToAction = (subPath: string) => {
      router.push(
        `/(owner)/farms/${farmId}/ponds/${item.id}/${subPath}` as any,
      );
    };

    const goToStocking = () => {
      router.push({
        pathname: `/(owner)/farms/${farmId}/ponds/${item.id}/stocking` as any,
        params: {
          pondName: item.name,
          pondArea: item.area_m2 || 0,
        },
      });
    };

    const goToEdit = () => {
      router.push({
        pathname: `/(owner)/farms/${farmId}/ponds/create` as any,
        params: { pondId: item.id, isEditing: "true" },
      });
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={goToDetail}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pondName}>{item.name}</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: hasFish ? "#00C853" : "#718096" },
                ]}
              />
              <Text style={styles.statusLabel}>
                {hasFish ? "En Producción" : "Disponible para Siembra"}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={goToEdit} style={styles.editButton}>
              <Ionicons name="settings-outline" size={20} color="#718096" />
            </TouchableOpacity>
            <View
              style={[
                styles.fishCountBadge,
                { backgroundColor: hasFish ? "#EBF8FF" : "#EDF2F7" },
              ]}
            >
              <Text
                style={[
                  styles.fishCountText,
                  { color: hasFish ? "#2B6CB0" : "#718096" },
                ]}
              >
                {item.current_stock || 0} peces
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Ionicons name="expand-outline" size={14} color="#64748B" />
            <Text style={styles.infoText}>{item.area_m2} m²</Text>
          </View>
          <View style={styles.infoBox}>
            <Ionicons
              name={item.inventory_id ? "cube-outline" : "alert-circle-outline"}
              size={14}
              color={item.inventory_id ? "#38A169" : "#E53E3E"}
            />
            <Text
              style={[
                styles.infoText,
                { color: item.inventory_id ? "#38A169" : "#E53E3E" },
              ]}
            >
              {item.inventory_id ? "Bodega vinculada" : "Sin bodega"}
            </Text>
          </View>
        </View>

        {hasFish ? (
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, styles.feedingBtn]}
              onPress={() => goToAction("feeding")}
            >
              <Ionicons name="restaurant-outline" size={18} color="#0066CC" />
              <Text style={styles.actionText}>Alimentar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.samplingBtn]}
              onPress={() => goToAction("sampling")}
            >
              <Ionicons name="scale-outline" size={18} color="#0EA5E9" />
              <Text style={[styles.actionText, { color: "#0EA5E9" }]}>
                Pesaje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.mortalityBtn]}
              onPress={() => goToAction("mortality")}
            >
              <Ionicons
                name="trending-down-outline"
                size={18}
                color="#E53E3E"
              />
              <Text style={[styles.actionText, { color: "#E53E3E" }]}>
                Bajas
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.stockingButton}
            onPress={goToStocking}
          >
            <Ionicons name="add-circle" size={22} color="white" />
            <Text style={styles.stockingButtonText}>
              Registrar Nueva Siembra
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.title}>Estanques</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push(`/(owner)/farms/${farmId}/ponds/create` as any)
          }
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      ) : (
        <FlatList
          data={ponds}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="water-outline" size={80} color="#CBD5E0" />
              <Text style={styles.emptyText}>No hay estanques</Text>
              {/* ✅ Solución Error ESLint: Quitar comillas del texto */}
              <Text style={styles.emptySub}>
                Presiona el botón Nuevo para crear el primero
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 60,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#003366" },
  addButton: {
    backgroundColor: "#0066CC",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontWeight: "bold", marginLeft: 4 },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerActions: { alignItems: "flex-end" },
  editButton: { padding: 5, marginBottom: 5 },
  pondName: { fontSize: 20, fontWeight: "bold", color: "#1E293B" },
  statusBadge: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  infoRow: { flexDirection: "row", gap: 15, marginBottom: 20 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  fishCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fishCountText: { fontWeight: "bold", fontSize: 12 },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  feedingBtn: { backgroundColor: "#F0F7FF", borderColor: "#BEE3F8" },
  samplingBtn: { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" },
  mortalityBtn: { backgroundColor: "#FFF5F5", borderColor: "#FED7D7" },
  actionText: {
    fontSize: 10,
    color: "#0066CC",
    fontWeight: "800",
    marginTop: 5,
    textTransform: "uppercase",
  },
  stockingButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
  },
  stockingButtonText: { color: "white", fontWeight: "bold", marginLeft: 8 },
  empty: { marginTop: 80, alignItems: "center" },
  emptyText: {
    color: "#475569",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
  },
  emptySub: { color: "#94A3B8", fontSize: 14, marginTop: 5 },
});
