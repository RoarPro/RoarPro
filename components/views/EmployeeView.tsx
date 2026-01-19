import { supabase } from "@/lib/supabase"; // IMPORTANTE: Añadido para la conexión real
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface EmployeeViewProps {
  userName: string;
  farm: any;
  totalBiomasa: number;
  alerts: number;
  pendingTasksCount: number;
}

export default function EmployeeView({ 
  userName, 
  farm, 
  totalBiomasa, 
  alerts,
  pendingTasksCount 
}: EmployeeViewProps) {
  const router = useRouter();
  
  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [sending, setSending] = useState(false); // Estado para evitar múltiples clics

  const getNextDoseInfo = () => {
    const hour = new Date().getHours();
    if (hour < 8) return "08:00 AM";
    if (hour < 11) return "11:00 AM";
    if (hour < 15) return "03:00 PM";
    return "Mañana 08:00 AM";
  };

  // FUNCIÓN CONECTADA A SUPABASE
  const handleSendReport = async () => {
    if (!reportText.trim()) {
      Alert.alert("Atención", "Por favor describe el problema.");
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("No hay sesión activa");

      const { error } = await supabase
        .from('field_reports') // Asegúrate de que la tabla exista en Supabase
        .insert([{
          farm_id: farm.id,
          created_by: session.user.id,
          content: reportText,
          report_type: 'emergencia',
          priority: 'alta' 
        }]);

      if (error) throw error;

      Alert.alert("Éxito", "El reporte ha sido enviado y el dueño ha sido notificado.");
      setReportText("");
      setReportModal(false);
    } catch (error: any) {
      console.error("Error enviando reporte:", error);
      Alert.alert("Error", "No se pudo enviar el reporte. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 1. Header con Badge de Tareas */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.greeting}>¡Hola, {userName?.split(' ')[0] || 'Operario'}! 👋</Text>
            <Text style={styles.farmName}>{farm?.name || 'Cargando Finca...'}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.taskBadgeContainer}
            onPress={() => router.push('/(owner)/tasks' as any)}
          >
            <Ionicons name="clipboard" size={28} color="white" />
            {pendingTasksCount > 0 && (
              <View style={styles.badgeLabel}>
                <Text style={styles.badgeText}>{pendingTasksCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Indicadores Rápidos */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="fish" size={20} color="#003366" />
              <Text style={styles.statValue}>{totalBiomasa} kg</Text>
              <Text style={styles.statLabel}>Biomasa</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="alert-circle" size={20} color={alerts > 0 ? "#EF4444" : "#10B981"} />
              <Text style={styles.statValue}>{alerts}</Text>
              <Text style={styles.statLabel}>Alertas Stock</Text>
            </View>
          </View>
        </View>

        {/* 3. Rutina Diaria */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rutina de Alimentación</Text>
          <Text style={styles.sectionSubtitle}>Siguiente ración: {getNextDoseInfo()}</Text>

          {farm?.ponds?.length > 0 ? (
            farm.ponds.map((pond: any) => (
              <TouchableOpacity 
                key={pond.id}
                style={[styles.taskCard, styles.pendingBorder]}
                onPress={() => router.push(`/(owner)/ponds/${pond.id}` as any)}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="water" size={26} color="#0288D1" />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{pond.name}</Text>
                  <Text style={styles.taskStatus}>Toca para registrar parámetros</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay estanques asignados.</Text>
            </View>
          )}
        </View>

        {/* 4. Botón de Novedades */}
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => setReportModal(true)}
        >
          <Ionicons name="megaphone-outline" size={24} color="white" />
          <Text style={styles.reportButtonText}>Reportar Novedad Urgente</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Reportes */}
      <Modal visible={reportModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Novedad</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describa el problema aquí (ej: falla eléctrica, mortalidad, etc.)..."
              multiline
              value={reportText}
              onChangeText={setReportText}
              editable={!sending}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setReportModal(false)} 
                style={styles.cancelBtn}
                disabled={sending}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSendReport} 
                style={[styles.sendBtn, sending && { opacity: 0.7 }]}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.sendBtnText}>Enviar Reporte</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... (Styles se mantienen iguales a tu código original)
const styles = StyleSheet.create({
    // (Pega aquí tus estilos originales, no han cambiado)
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    welcomeSection: { 
      paddingTop: 60, paddingHorizontal: 25, paddingBottom: 35, 
      backgroundColor: '#003366', borderBottomLeftRadius: 35, borderBottomRightRadius: 35, 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
    },
    greeting: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    farmName: { fontSize: 16, color: '#BAE6FD', marginTop: 4 },
    taskBadgeContainer: {
      width: 50, height: 50, justifyContent: 'center', alignItems: 'center'
    },
    badgeLabel: {
      position: 'absolute', top: 5, right: 5, backgroundColor: '#EF4444',
      borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center',
      alignItems: 'center', borderWidth: 2, borderColor: '#003366'
    },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    section: { paddingHorizontal: 20, marginTop: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    sectionSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 15 },
    taskCard: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
      padding: 16, borderRadius: 18, marginBottom: 12, elevation: 2 
    },
    pendingBorder: { borderLeftWidth: 5, borderLeftColor: '#003366' },
    iconContainer: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    taskInfo: { flex: 1 },
    taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    taskStatus: { fontSize: 12, color: '#94A3B8' },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { backgroundColor: 'white', width: '48%', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 1 },
    statLabel: { fontSize: 11, color: '#64748B', marginTop: 5 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#003366' },
    reportButton: { 
      marginHorizontal: 20, backgroundColor: '#EF4444', flexDirection: 'row', 
      justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 15, 
      marginTop: 30, marginBottom: 50 
    },
    reportButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 25, padding: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#003366', marginBottom: 20, textAlign: 'center' },
    textInput: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 15, height: 120, textAlignVertical: 'top', fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
    cancelBtn: { flex: 0.45, padding: 15, alignItems: 'center' },
    cancelBtnText: { color: '#64748B', fontWeight: 'bold' },
    sendBtn: { flex: 0.45, backgroundColor: '#003366', padding: 15, borderRadius: 12, alignItems: 'center' },
    sendBtnText: { color: 'white', fontWeight: 'bold' },
    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { color: '#94A3B8' }
});