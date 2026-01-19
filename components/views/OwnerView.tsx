import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Definimos la interfaz para el Propietario con tipos más precisos
interface OwnerViewProps {
  userName: string;
  farms: any[];
  totalBiomasa: number;
  alerts: number;
  pendingTasksCount: number;
}

export default function OwnerView({
  userName,
  farms,
  totalBiomasa,
  alerts,
  pendingTasksCount,
}: OwnerViewProps) {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Header Dinámico */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Panel de Propietario</Text>
        <Text style={styles.title}>¡Hola, {userName}!</Text>
      </View>

      {/* 2. Estadísticas Globales (Kpis) */}
      <View style={styles.statsRow}>
        <View style={styles.mainCard}>
          <View style={styles.iconBgBlue}>
            <Ionicons name="stats-chart" size={20} color="#0066CC" />
          </View>
          <Text style={styles.cardValue}>{totalBiomasa} kg</Text>
          <Text style={styles.cardLabel}>Biomasa Global</Text>
        </View>

        <View style={[styles.mainCard, alerts > 0 && styles.cardWarning]}>
          <View
            style={[
              styles.iconBgRed,
              alerts === 0 && { backgroundColor: "#F1F5F9" },
            ]}
          >
            <Ionicons
              name="warning"
              size={20}
              color={alerts > 0 ? "#EF4444" : "#94A3B8"}
            />
          </View>
          <Text style={styles.cardValue}>{alerts}</Text>
          <Text style={styles.cardLabel}>Alertas Stock</Text>
        </View>
      </View>

      {/* 3. Acceso Rápido Operativo */}
      <View style={styles.operationalRow}>
        <TouchableOpacity
          style={styles.opItem}
          onPress={() => router.push("/(owner)/tasks" as any)}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="clipboard" size={24} color="#6366F1" />
            {pendingTasksCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingTasksCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.opLabel}>Tareas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.opItem}
          onPress={() => router.push("/(owner)/reports" as any)}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#FFF1F2" }]}>
            <Ionicons name="megaphone" size={24} color="#F43F5E" />
          </View>
          <Text style={styles.opLabel}>Reportes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.opItem}
          onPress={() => router.push("/(owner)/employees" as any)}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="people" size={24} color="#22C55E" />
          </View>
          <Text style={styles.opLabel}>Equipo</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Lista de Fincas */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gestión de Fincas</Text>
          <TouchableOpacity
            onPress={() => router.push("/(owner)/farms/create" as any)}
          >
            <Text style={styles.addLink}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        {farms.length > 0 ? (
          farms.map((farm) => (
            <TouchableOpacity
              key={farm.id}
              style={styles.farmItem}
              onPress={() => router.push(`/(owner)/farms/${farm.id}` as any)}
            >
              <View style={styles.farmInfo}>
                <View style={styles.farmIcon}>
                  <Ionicons name="business" size={22} color="#0066CC" />
                </View>
                <View>
                  <Text style={styles.farmName}>{farm.name}</Text>
                  <Text style={styles.farmSub}>
                    {farm.ponds?.length || 0}{" "}
                    {farm.ponds?.length === 1
                      ? "Estanque activo"
                      : "Estanques activos"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={40} color="#CBD5E0" />
            <Text style={styles.emptyText}>
              No tienes fincas registradas aún.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    padding: 25,
    paddingTop: 60,
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  welcome: {
    fontSize: 13,
    color: "#0066CC",
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#003366" },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: "space-between",
  },
  mainCard: {
    backgroundColor: "#FFF",
    width: "47%",
    padding: 18,
    borderRadius: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardWarning: { borderLeftWidth: 4, borderLeftColor: "#EF4444" },
  iconBgBlue: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBgRed: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardValue: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  cardLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },

  operationalRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: "white",
    padding: 18,
    borderRadius: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  opItem: { alignItems: "center" },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  opLabel: { fontSize: 13, fontWeight: "700", color: "#475569", marginTop: 8 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
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

  section: { paddingHorizontal: 20, paddingBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 19, fontWeight: "bold", color: "#1E293B" },
  addLink: { color: "#0066CC", fontWeight: "bold", fontSize: 14 },
  farmItem: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
  },
  farmInfo: { flexDirection: "row", alignItems: "center" },
  farmIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  farmName: { fontSize: 17, fontWeight: "700", color: "#334155" },
  farmSub: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  emptyContainer: { alignItems: "center", marginTop: 30, padding: 20 },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 10,
    fontSize: 15,
  },
});
