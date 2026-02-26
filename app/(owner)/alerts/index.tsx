import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function AlertsScreen() {
  const [reports, setReports] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState(false); // false = Pendientes, true = Resueltos
  const router = useRouter();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("field_reports")
        .select("*, farms(name)")
        .eq("resolved", filterResolved) // Filtramos por estado
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error al obtener reportes:", error);
    } finally {
      setLoading(false);
    }
  }, [filterResolved]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  // Función para marcar un problema como solucionado
  const handleResolveAlert = async (id: string) => {
    Alert.alert(
      "Confirmar Solución",
      "¿Estás seguro de que este incidente ya fue resuelto en la finca?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, resuelto",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("field_reports")
                .update({ resolved: true })
                .eq("id", id);

              if (error) throw error;
              fetchReports(); // Recargamos la lista
            } catch (error) {
              Alert.alert("Error", "No se pudo actualizar el reporte.");
            }
          },
        },
      ],
    );
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "alta":
        return { color: "#EF4444", bg: "#FEE2E2", icon: "warning" };
      case "media":
        return { color: "#F59E0B", bg: "#FEF3C7", icon: "alert-circle" };
      default:
        return { color: "#10B981", bg: "#D1FAE5", icon: "information-circle" };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="arrow-back" size={26} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Novedades de Campo</Text>
            <Text style={styles.subtitle}>
              Reportes e incidentes de los operarios
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs de Filtro */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, !filterResolved && styles.filterTabActive]}
          onPress={() => setFilterResolved(false)}
        >
          <Text
            style={[
              styles.filterText,
              !filterResolved && styles.filterTextActive,
            ]}
          >
            Atención Requerida
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterResolved && styles.filterTabActive]}
          onPress={() => setFilterResolved(true)}
        >
          <Text
            style={[
              styles.filterText,
              filterResolved && styles.filterTextActive,
            ]}
          >
            Historial Resuelto
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const pStyle = getPriorityStyle(item.priority);
            return (
              <View style={[styles.reportCard, { borderColor: pStyle.color }]}>
                <View style={styles.reportHeader}>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: pStyle.bg },
                    ]}
                  >
                    <Ionicons
                      name={pStyle.icon as any}
                      size={14}
                      color={pStyle.color}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.priorityText, { color: pStyle.color }]}
                    >
                      {item.priority?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={styles.farmName}>
                  📍 {item.farms?.name || "Finca general"}
                </Text>
                <Text style={styles.description}>{item.content}</Text>

                {/* Footer Interactivo */}
                <View style={styles.footer}>
                  {!item.resolved ? (
                    <TouchableOpacity
                      style={styles.resolveBtn}
                      onPress={() => handleResolveAlert(item.id)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color="#10B981"
                      />
                      <Text style={styles.resolveBtnText}>
                        Marcar como Resuelto
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.resolvedBadge}>
                      <Ionicons
                        name="checkmark-done"
                        size={18}
                        color="#166534"
                      />
                      <Text style={styles.resolvedText}>
                        Incidente Solucionado
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconBg}>
                <Ionicons
                  name={filterResolved ? "shield-checkmark" : "leaf"}
                  size={40}
                  color={filterResolved ? "#10B981" : "#94A3B8"}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {filterResolved ? "Sin historial" : "¡Todo en orden!"}
              </Text>
              <Text style={styles.emptyText}>
                {filterResolved
                  ? "No hay incidentes resueltos."
                  : "No tienes novedades urgentes reportadas en el campo."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },

  filterContainer: { flexDirection: "row", padding: 20, paddingBottom: 10 },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabActive: { borderBottomColor: "#EF4444" },
  filterText: { fontSize: 14, fontWeight: "600", color: "#94A3B8" },
  filterTextActive: { color: "#EF4444", fontWeight: "bold" },

  reportCard: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderLeftWidth: 4,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priorityText: { fontSize: 11, fontWeight: "bold" },
  dateText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  farmName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  description: { fontSize: 15, color: "#475569", lineHeight: 22 },

  footer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  resolveBtnText: {
    color: "#059669",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 14,
  },
  resolvedBadge: { flexDirection: "row", alignItems: "center" },
  resolvedText: {
    color: "#166534",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 13,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748B",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
