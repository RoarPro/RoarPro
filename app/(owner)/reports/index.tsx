import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';

export default function ReportsScreen() {
  const [reports, setReports] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('field_reports')
        .select('*, farms(name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error al obtener reportes:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  // Función para determinar el color de la prioridad
  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta': return { color: '#EF4444', bg: '#FEE2E2' };
      case 'media': return { color: '#F59E0B', bg: '#FEF3C7' };
      default: return { color: '#10B981', bg: '#D1FAE5' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Novedades del Campo</Text>
        <Text style={styles.subtitle}>Historial de incidentes reportados</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const pStyle = getPriorityStyle(item.priority);
          return (
            <View style={[styles.reportCard, { borderLeftColor: pStyle.color }]}>
              <View style={styles.reportHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: pStyle.bg }]}>
                  <Text style={[styles.priorityText, { color: pStyle.color }]}>
                    {item.priority?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString()} - {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <Text style={styles.farmName}>📍 {item.farms?.name || 'Finca desconocida'}</Text>
              
              {/* CAMBIO CLAVE: Usamos 'content' en lugar de 'description' para que coincida con EmployeeView */}
              <Text style={styles.description}>{item.content}</Text>
              
              <View style={styles.footer}>
                <Text style={styles.status}>
                   Estado: <Text style={{fontWeight: 'bold'}}>{item.resolved ? '✅ Resuelto' : '⏳ Pendiente'}</Text>
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={50} color="#CBD5E0" />
            <Text style={styles.emptyText}>No hay novedades reportadas aún.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FFF' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  reportCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginHorizontal: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderLeftWidth: 6 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '900' },
  dateText: { fontSize: 12, color: '#94A3B8' },
  farmName: { fontSize: 13, fontWeight: '700', color: '#0066CC', marginBottom: 8 },
  description: { fontSize: 15, color: '#334155', lineHeight: 22 },
  footer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  status: { fontSize: 12, color: '#64748B' },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 10, fontSize: 16 }
});