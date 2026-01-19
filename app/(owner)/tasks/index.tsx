import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function TaskManagerScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('pendiente');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Usamos useCallback para limpiar el error de dependencias de useEffect
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_user:employees(full_name)
        `)
        .eq('status', filter)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getPriorityColor = (prio: string) => {
    switch(prio) {
      case 'alta': return '#EF4444';
      case 'media': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Control de Tareas</Text>
          <Text style={styles.subtitle}>Gestión operativa de la finca</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => router.push('/(owner)/tasks/create' as any)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filtros de Estado */}
      <View style={styles.filterRow}>
        {['pendiente', 'completada'].map((status) => (
          <TouchableOpacity 
            key={status}
            onPress={() => setFilter(status)}
            style={[styles.filterBtn, filter === status && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <View style={[styles.priorityLine, { backgroundColor: getPriorityColor(item.priority) }]} />
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <Text style={styles.taskUser}>
                  <Ionicons name="person-outline" size={12} /> {item.assigned_to_user?.full_name || 'Sin asignar'}
                </Text>
                <Text style={styles.taskDate}>Fecha: {item.due_date}</Text>
              </View>
              {item.status === 'completada' && (
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-done-circle" size={24} color="#10B981" />
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="clipboard-outline" size={50} color="#CBD5E0" />
              <Text style={styles.empty}>No hay tareas {filter}s</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B' },
  addButton: { backgroundColor: '#6366F1', width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 15 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E2E8F0' },
  filterBtnActive: { backgroundColor: '#1E293B' },
  filterText: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
  filterTextActive: { color: 'white' },
  taskCard: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 10, borderRadius: 12, flexDirection: 'row', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  priorityLine: { width: 6, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  taskContent: { padding: 15, flex: 1 },
  taskTitle: { fontWeight: 'bold', fontSize: 16, color: '#334155' },
  taskUser: { fontSize: 13, color: '#64748B', marginTop: 4 },
  taskDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { padding: 15, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  empty: { textAlign: 'center', marginTop: 10, color: '#94A3B8', fontSize: 14 }
});