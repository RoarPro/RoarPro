import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Definimos la interfaz formal para el Administrador
interface AdminViewProps {
  userName: string;
  farm: any;
  totalBiomasa: number;
  alerts: number;
  pendingTasksCount: number;
}

export default function AdminView({ 
  userName, 
  farm, 
  totalBiomasa, 
  alerts, 
  pendingTasksCount 
}: AdminViewProps) {
  const router = useRouter();

  // Acciones rápidas para el Administrador
  const adminActions = [
    { id: '1', title: 'Tareas', icon: 'clipboard-outline', color: '#6366F1', route: '/(owner)/tasks' },
    { id: '2', title: 'Inventario', icon: 'cube-outline', color: '#10B981', route: '/(owner)/inventory' },
    { id: '3', title: 'Reportes', icon: 'megaphone-outline', color: '#F59E0B', route: '/(owner)/reports' },
    { id: '4', title: 'Personal', icon: 'people-outline', color: '#EC4899', route: '/(owner)/employees' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Estilo Admin */}
      <View style={styles.header}>
        <View>
          <Text style={styles.roleTag}>ADMINISTRADOR</Text>
          <Text style={styles.title}>Finca: {farm?.name || 'Cargando...'}</Text>
          <Text style={styles.subtitle}>Gestionado por {userName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(owner)/profile" as any)}>
          <Ionicons name="settings-outline" size={28} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Resumen Operativo */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Biomasa Actual</Text>
          <Text style={styles.statValue}>{totalBiomasa} kg</Text>
        </View>
        <View style={[styles.statCard, alerts > 0 && styles.alertCard]}>
          <Text style={styles.statLabel}>Alertas Stock</Text>
          <Text style={[styles.statValue, alerts > 0 && { color: '#EF4444' }]}>{alerts}</Text>
        </View>
      </View>

      {/* Panel de Control con Badge en Tareas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Panel de Control</Text>
        <View style={styles.grid}>
          {adminActions.map((action) => (
            <TouchableOpacity 
              key={action.id} 
              style={styles.actionButton}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={24} color="white" />
                {/* Badge de Tareas Pendientes solo en el icono de Tareas */}
                {action.id === '1' && pendingTasksCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingTasksCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionLabel}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Acceso rápido a Estanques */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Estanques Activos</Text>
          <TouchableOpacity onPress={() => router.push("/(owner)/ponds" as any)}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        
        {farm?.ponds?.slice(0, 3).map((pond: any) => (
          <TouchableOpacity 
            key={pond.id} 
            style={styles.pondCard}
            onPress={() => router.push(`/(owner)/ponds/${pond.id}` as any)}
          >
            <Ionicons name="water" size={24} color="#0EA5E9" />
            <View style={styles.pondInfo}>
              <Text style={styles.pondName}>{pond.name}</Text>
              <Text style={styles.pondSub}>Producción en curso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 25, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  roleTag: { fontSize: 10, fontWeight: 'bold', color: '#6366F1', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B' },
  statsContainer: { flexDirection: 'row', padding: 20, gap: 15 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#0EA5E9', elevation: 2 },
  alertCard: { borderLeftColor: '#EF4444' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  seeAll: { fontSize: 13, color: '#6366F1', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: { width: '48%', backgroundColor: 'white', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 1 },
  iconCircle: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, position: 'relative' },
  actionLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white'
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  pondCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 14, marginBottom: 10 },
  pondInfo: { flex: 1, marginLeft: 12 },
  pondName: { fontSize: 15, fontWeight: 'bold', color: '#334155' },
  pondSub: { fontSize: 11, color: '#94A3B8' }
});