import { supabase } from "@/lib/supabase"; // <-- IMPORTANTE: Agregado para leer las alertas reales
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react"; // <-- Agregados los hooks de React
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface OwnerViewProps {
  userName: string;
  farms: any[];
  pendingTasksCount: number;
}

export default function OwnerView({
  userName,
  farms,
  pendingTasksCount,
}: OwnerViewProps) {
  const router = useRouter();

  // --- LÓGICA DE ALERTAS REALES ---
  const [alerts, setAlerts] = useState(0);

  useEffect(() => {
    const fetchAlertsCount = async () => {
      try {
        const { count } = await supabase
          .from("field_reports")
          .select("*", { count: "exact", head: true })
          .eq("resolved", false); // Solo cuenta las no resueltas

        setAlerts(count || 0);
      } catch (error) {
        console.error("Error contando alertas:", error);
      }
    };

    fetchAlertsCount();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. HEADER GERENCIAL */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Visión General</Text>
          <Text style={styles.title}>¡Hola, {userName}!</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* 2. CENTRO DE INTELIGENCIA DE NEGOCIOS */}
        <Text style={styles.sectionLabel}>Inteligencia de Negocios</Text>

        <TouchableOpacity
          style={styles.analyticsCard}
          onPress={() => router.push("/(owner)/reports" as any)}
        >
          <View style={styles.analyticsIconBg}>
            <Ionicons name="pie-chart" size={28} color="#FFF" />
          </View>
          <View style={styles.analyticsTextContainer}>
            <Text style={styles.analyticsTitle}>Analítica y Descargas</Text>
            <Text style={styles.analyticsSub}>
              Gráficas de rentabilidad, exportación a PDF y Excel.
            </Text>
          </View>
          <Ionicons name="download-outline" size={24} color="#0066CC" />
        </TouchableOpacity>

        {/* 3. GESTIÓN ADMINISTRATIVA (LAS 3 TARJETAS ALINEADAS) */}
        <Text style={styles.sectionLabel}>Administración Operativa</Text>

        <View style={styles.adminGrid}>
          {/* Tarjeta 1: DIRECTORIO GLOBAL (Reemplazando a "Personal") */}
          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => router.push("/(owner)/staff" as any)}
          >
            <View
              style={[styles.adminIconCircle, { backgroundColor: "#ECFDF5" }]}
            >
              <Ionicons name="call" size={24} color="#059669" />
            </View>
            <Text style={styles.adminCardTitle}>Directorio</Text>
            <Text style={styles.adminCardSub}>Contactos</Text>
          </TouchableOpacity>

          {/* Tarjeta 2: Alertas (Dinámica) */}
          <TouchableOpacity
            style={[styles.adminCard, alerts > 0 && styles.cardWarning]}
            onPress={() => router.push("/(owner)/alerts" as any)}
          >
            <View
              style={[
                styles.adminIconCircle,
                { backgroundColor: alerts > 0 ? "#FEE2E2" : "#F1F5F9" },
              ]}
            >
              <Ionicons
                name={alerts > 0 ? "warning" : "shield-checkmark"}
                size={24}
                color={alerts > 0 ? "#EF4444" : "#64748B"}
              />
              {/* Globito rojo con el número de alertas */}
              {alerts > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{alerts}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.adminCardTitle,
                alerts > 0 && { color: "#EF4444" },
              ]}
            >
              Alertas
            </Text>
            {alerts === 0 && (
              <Text style={styles.adminCardSub}>Sin riesgo</Text>
            )}
          </TouchableOpacity>

          {/* Tarjeta 3: Tareas */}
          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => router.push("/(owner)/tasks" as any)}
          >
            <View
              style={[styles.adminIconCircle, { backgroundColor: "#EEF2FF" }]}
            >
              <Ionicons name="checkbox" size={24} color="#4F46E5" />
              {/* Globito rojo con el número de tareas */}
              {pendingTasksCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingTasksCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.adminCardTitle}>Tareas</Text>
            <Text style={styles.adminCardSub}>Globales</Text>
          </TouchableOpacity>
        </View>

        {/* 4. LISTA DE FINCAS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Tus Sedes Operativas</Text>
          <TouchableOpacity
            onPress={() => router.push("/(owner)/farms/create" as any)}
          >
            <Text style={styles.addLink}>+ Nueva Sede</Text>
          </TouchableOpacity>
        </View>

        {farms.length > 0 ? (
          farms.map((farm) => {
            const pondCount = farm.ponds?.length || 0;
            const hasAlerts = Math.random() > 0.7; // Simulación visual para el diseño

            return (
              <TouchableOpacity
                key={farm.id}
                style={styles.farmCard}
                onPress={() => router.push(`/(owner)/farms/${farm.id}` as any)}
              >
                <View style={styles.farmMain}>
                  <View style={styles.farmIconContainer}>
                    <Ionicons name="business" size={22} color="#003366" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{farm.name}</Text>
                    <Text style={styles.farmDetails}>
                      {pondCount} Estanques • {farm.location || "Ubicación N/A"}
                    </Text>
                  </View>
                </View>

                {/* Indicador de Salud de la Finca */}
                <View
                  style={[
                    styles.healthIndicator,
                    hasAlerts ? styles.healthWarning : styles.healthGood,
                  ]}
                >
                  <Ionicons
                    name={hasAlerts ? "warning" : "checkmark-circle"}
                    size={14}
                    color={hasAlerts ? "#991B1B" : "#166534"}
                  />
                  <Text
                    style={[
                      styles.healthText,
                      { color: hasAlerts ? "#991B1B" : "#166534" },
                    ]}
                  >
                    {hasAlerts ? "Requiere Atención" : "Operación Normal"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="map"
              size={48}
              color="#CBD5E1"
              style={{ marginBottom: 15 }}
            />
            <Text style={styles.emptyTitle}>Sin sedes operativas</Text>
            <Text style={styles.emptyText}>
              Registra tu primera finca para comenzar a monitorear la
              producción.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/(owner)/farms/create" as any)}
            >
              <Text style={styles.primaryBtnText}>Registrar Finca</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  welcome: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#0F172A", marginTop: 4 },

  content: { padding: 20 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
  },
  addLink: { color: "#0066CC", fontWeight: "bold", fontSize: 14 },

  // --- TARJETA DE ANALÍTICA ---
  analyticsCard: {
    backgroundColor: "#EBF8FF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#BEE3F8",
  },
  analyticsIconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  analyticsTextContainer: { flex: 1, paddingRight: 10 },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2B6CB0",
    marginBottom: 4,
  },
  analyticsSub: { fontSize: 12, color: "#4A5568", lineHeight: 16 },

  // --- GRID ADMINISTRATIVO (3 COLUMNAS) ---
  adminGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  adminCard: {
    backgroundColor: "white",
    width: "31%",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 5,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  cardWarning: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  adminIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  adminCardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
  },
  adminCardSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },

  // Globitos rojos para las notificaciones
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },

  // --- FINCAS COMPACTAS ---
  farmCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    marginBottom: 15,
    padding: 15,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  farmMain: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  farmIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  farmName: { fontSize: 16, fontWeight: "bold", color: "#0F172A" },
  farmDetails: { fontSize: 12, color: "#64748B", marginTop: 2 },

  healthIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  healthGood: { backgroundColor: "#F0FDF4" },
  healthWarning: { backgroundColor: "#FEF2F2" },
  healthText: { fontSize: 11, fontWeight: "700", marginLeft: 6 },

  // --- ESTADO VACÍO ---
  emptyContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: "#003366",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
});
