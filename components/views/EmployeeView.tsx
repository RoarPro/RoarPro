import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface EmployeeViewProps {
  userName: string;
  farm: any;
  totalBiomasa: number;
  alerts: number;
  pendingTasksCount: number;
  onRefresh?: () => Promise<void>;
}

export default function EmployeeView({
  userName,
  farm,
  totalBiomasa,
  alerts,
  pendingTasksCount,
  onRefresh,
}: EmployeeViewProps) {
  const router = useRouter();

  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const getNextDoseInfo = () => {
    const hour = new Date().getHours();
    if (hour < 8) return "08:00 AM";
    if (hour < 11) return "11:00 AM";
    if (hour < 15) return "03:00 PM";
    return "Mañana 08:00 AM";
  };

  const handleSignOut = () => {
    Alert.alert("Cerrar Sesión", "¿Deseas finalizar tu jornada y salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleSendReport = async () => {
    if (!reportText.trim()) {
      return Alert.alert("Atención", "Por favor describe el problema.");
    }

    setSending(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const { error } = await supabase.from("field_reports").insert([
        {
          farm_id: farm?.id,
          content: reportText,
          resolved: false,
          created_by: session.user.id,
        },
      ]);

      if (error) throw error;

      Alert.alert("Éxito", "Reporte enviado. El dueño será notificado.");
      setReportText("");
      setReportModal(false);
    } catch (error: any) {
      Alert.alert("Error", "No se pudo enviar el reporte.");
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) await onRefresh();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFF"
          />
        }
      >
        {/* 1. HEADER OPERATIVO CON LOGOUT */}
        <View style={styles.headerBlue}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>CENTRO DE MANDO</Text>
              <Text style={styles.greeting} numberOfLines={1}>
                ¡Hola, {userName?.split(" ")[0]}! 👋
              </Text>
              <Text style={styles.farmName}>
                📍 {farm?.name || "Sin Finca Asignada"}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {/* Botón Salir */}
              <TouchableOpacity
                style={styles.iconCircleHeader}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={22} color="white" />
              </TouchableOpacity>

              {/* Botón Notificaciones */}
              <TouchableOpacity
                style={styles.taskBadgeContainer}
                onPress={() => router.push("/(employee)/tasks")}
              >
                <View style={styles.iconCircleHeader}>
                  <Ionicons name="notifications" size={24} color="white" />
                </View>
                {pendingTasksCount > 0 && (
                  <View style={styles.badgeLabel}>
                    <Text style={styles.badgeText}>{pendingTasksCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. INDICADORES RESUMIDOS */}
          <View style={styles.summaryCard}>
            <View style={styles.statBox}>
              <View style={[styles.miniIcon, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="scale-outline" size={18} color="#0369A1" />
              </View>
              <Text style={styles.statValue}>{totalBiomasa} kg</Text>
              <Text style={styles.statLabel}>Biomasa Est.</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statBox}>
              <View
                style={[
                  styles.miniIcon,
                  { backgroundColor: alerts > 0 ? "#FEE2E2" : "#DCFCE7" },
                ]}
              >
                <Ionicons
                  name="thermometer-outline"
                  size={18}
                  color={alerts > 0 ? "#EF4444" : "#10B981"}
                />
              </View>
              <Text style={styles.statValue}>{alerts}</Text>
              <Text style={styles.statLabel}>Alertas O₂</Text>
            </View>
          </View>
        </View>

        {/* 3. LISTADO DE ESTANQUES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tus Estanques</Text>
            <Text style={styles.sectionSubtitle}>
              Próxima ración:{" "}
              <Text style={styles.boldBlue}>{getNextDoseInfo()}</Text>
            </Text>
          </View>

          {farm?.ponds?.length > 0 ? (
            farm.ponds.map((pond: any) => (
              <TouchableOpacity
                key={pond.id}
                style={styles.pondCard}
                onPress={() =>
                  router.push({
                    pathname: "/(employee)/pond-details",
                    params: { pondId: pond.id, pondName: pond.name },
                  } as any)
                }
              >
                <View style={styles.pondIconBox}>
                  <Ionicons name="water" size={24} color="#0288D1" />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{pond.name}</Text>
                  <Text style={styles.taskStatus}>
                    Toca para registrar acciones
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="leaf-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No hay estanques activos.</Text>
            </View>
          )}
        </View>

        {/* 4. BOTÓN DE EMERGENCIA */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => setReportModal(true)}
        >
          <Ionicons name="alert-circle" size={22} color="white" />
          <Text style={styles.reportButtonText}>REPORTAR NOVEDAD URGENTE</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL DE REPORTES */}
      <Modal visible={reportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novedad de Campo</Text>
              <TouchableOpacity onPress={() => setReportModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Describe el problema..."
              multiline
              value={reportText}
              onChangeText={setReportText}
            />
            <TouchableOpacity
              onPress={handleSendReport}
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.sendBtnText}>Enviar Reporte</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlue: {
    backgroundColor: "#003366",
    height: 190,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    paddingHorizontal: 25,
    paddingTop: 60,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  greeting: { fontSize: 24, fontWeight: "900", color: "white", marginTop: 2 },
  farmName: { fontSize: 14, color: "#BAE6FD", marginTop: 4, fontWeight: "600" },
  taskBadgeContainer: { position: "relative" },
  iconCircleHeader: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeLabel: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#003366",
  },
  badgeText: { color: "white", fontSize: 9, fontWeight: "bold" },
  summaryCard: {
    position: "absolute",
    bottom: -35,
    left: 20,
    right: 20,
    backgroundColor: "white",
    flexDirection: "row",
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statBox: { flex: 1, alignItems: "center" },
  miniIcon: { padding: 8, borderRadius: 12, marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  divider: { width: 1, backgroundColor: "#F1F5F9", height: "100%" },
  section: { paddingHorizontal: 22, marginTop: 65 },
  sectionHeader: { marginBottom: 15 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: "#0F172A" },
  sectionSubtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  boldBlue: { fontWeight: "700", color: "#0369A1" },
  pondCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pondIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: "bold", color: "#334155" },
  taskStatus: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  reportButton: {
    marginHorizontal: 25,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderRadius: 22,
    marginTop: 30,
  },
  reportButtonText: {
    color: "white",
    fontWeight: "900",
    marginLeft: 12,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    padding: 25,
  },
  modalContent: { backgroundColor: "white", borderRadius: 30, padding: 25 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 18,
    height: 120,
    textAlignVertical: "top",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sendBtn: {
    backgroundColor: "#003366",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 20,
  },
  sendBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  emptyCard: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 30,
  },
  emptyText: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },
});
