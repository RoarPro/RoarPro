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
  View
} from "react-native";

type Pond = {
  id: string;
  name: string;
  active: boolean;
  farm_id: string;
  inventory_id: string | null; // Añadimos esto para saber su bodega vinculada
};

export default function PondsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ponds, setPonds] = useState<Pond[]>([]);

  const loadPonds = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: farm, error: farmError } = await supabase
        .from("farms")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (farmError || !farm) throw new Error("No se pudo obtener la finca vinculada");

      // Traemos también el inventory_id para saber qué bodega usa cada estanque
      const { data: pondsData, error: pondsError } = await supabase
        .from("ponds")
        .select("id, name, active, farm_id, inventory_id")
        .eq("farm_id", farm.id)
        .order("created_at", { ascending: true });

      if (pondsError) throw pondsError;

      setPonds(pondsData || []);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los estanques.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPonds();
  }, [loadPonds]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPonds();
  };

  const renderItem = ({ item }: { item: Pond }) => {
    const goToAction = (basePath: string) => {
      if (!item.farm_id) {
        Alert.alert("Dato faltante", "Este estanque no tiene un farm_id asociado.");
        return;
      }

      router.push({
        pathname: `${basePath}/${item.id}` as any,
        params: { 
          name: item.name, 
          farm_id: item.farm_id 
        }
      });
    };

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pondName}>{item.name}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: item.active ? "#00C853" : "#D50000" }]} />
            <Text style={styles.statusLabel}>
               {item.active ? "Activo" : "Inactivo"} 
               {item.inventory_id ? " • 📍 Bodega Vinculada" : " • ⚠️ Sin Bodega"}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, !item.farm_id && { opacity: 0.5 }]}
            onPress={() => goToAction("/(owner)/ponds/feeding")}
          >
            <Ionicons name="restaurant" size={20} color="#0066CC" />
            <Text style={styles.actionText}>Alimentar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#FFF5F5' }, !item.farm_id && { opacity: 0.5 }]}
            onPress={() => goToAction("/(owner)/ponds/mortality")}
          >
            <Ionicons name="skull" size={20} color="#E53E3E" />
            <Text style={[styles.actionText, { color: '#E53E3E' }]}>Bajas</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Estanques</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(owner)/ponds/create" as any)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#0066CC" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={ponds}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="water-outline" size={50} color="#CBD5E0" />
              <Text style={styles.emptyText}>No hay estanques registrados</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7", padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: "bold", color: "#003366" },
  addButton: { backgroundColor: "#0066CC", flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  addButtonText: { color: "white", fontWeight: "bold", marginLeft: 4 },
  card: { 
    backgroundColor: "white", 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 14, 
    flexDirection: 'row', 
    alignItems: 'center',
    elevation: 2,
  },
  pondName: { fontSize: 18, fontWeight: "700", color: "#2D3748", marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 12, color: "#718096" },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { alignItems: 'center', padding: 10, backgroundColor: '#F0F7FF', borderRadius: 14, minWidth: 75 },
  actionText: { fontSize: 11, color: "#0066CC", fontWeight: '700', marginTop: 4 },
  empty: { marginTop: 80, alignItems: "center" },
  emptyText: { color: "#A0AEC0", fontSize: 16, marginTop: 10 },
});