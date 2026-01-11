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
  View
} from "react-native";

type Pond = {
  id: string;
  name: string;
  active: boolean;
  farm_id: string;
  inventory_id: string | null;
  current_quantity: number;
  area_m2: number; // <-- 1. Añadido al tipo
};

export default function PondsScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ponds, setPonds] = useState<Pond[]>([]);

  const loadPonds = useCallback(async () => {
  // Si no hay farmId, no hacemos nada todavía, evitamos el crash
  if (!farmId) {
    setLoading(false);
    return; 
  }

  try {
    setLoading(true);
    const { data: pondsData, error: pondsError } = await supabase
      .from("ponds")
      .select("id, name, active, farm_id, inventory_id, current_quantity, area_m2")
      .eq("farm_id", farmId)
      .order("created_at", { ascending: false });

    if (pondsError) throw pondsError;
    setPonds(pondsData || []);

  } catch (error: any) {
    console.error("Error en loadPonds:", error.message);
    Alert.alert("Error de Carga", error.message);
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
    const hasFish = item.current_quantity > 0;

    const goToAction = (basePath: string) => {
      router.push({
        pathname: `${basePath}/${item.id}` as any,
        params: { name: item.name, farm_id: item.farm_id }
      });
    };

    const goToStocking = () => {
      router.push({
        pathname: "/(owner)/ponds/stocking",
        params: { 
          pondId: item.id, 
          farmId: item.farm_id, 
          pondName: item.name,
          pondArea: item.area_m2 // <-- 3. Enviamos el área a la calculadora
        }
      });
    };

    const goToEdit = () => {
      router.push({
        pathname: "/(owner)/ponds/create", // Reutilizaremos el form de creación o uno de edit
        params: { farmId: farmId, pondId: item.id, isEditing: "true" } 
      });
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.pondName}>{item.name}</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: hasFish ? "#00C853" : "#718096" }]} />
              <Text style={styles.statusLabel}>
                {hasFish ? "En Producción" : "Vacio / Inactivo"}
              </Text>
            </View>
            {/* 4. Visualización del Área */}
            <Text style={styles.areaLabel}>
              <Ionicons name="expand-outline" size={12} /> {item.area_m2 || 0} m²
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={goToEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={18} color="#718096" />
            </TouchableOpacity>
            <View style={[styles.fishCountBadge, { backgroundColor: hasFish ? '#EBF8FF' : '#EDF2F7' }]}>
               <Text style={[styles.fishCountText, { color: hasFish ? '#2B6CB0' : '#718096' }]}>
                 {item.current_quantity || 0} peces
               </Text>
            </View>
          </View>
        </View>

        <Text style={styles.inventoryNote}>
           {item.inventory_id ? "📍 Bodega Vinculada" : "⚠️ Sin Bodega de Alimento"}
        </Text>

        {hasFish ? (
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.feedingBtn]}
              onPress={() => goToAction("/(owner)/ponds/feeding")}
            >
              <Ionicons name="restaurant" size={20} color="#0066CC" />
              <Text style={styles.actionText}>Alimentar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.samplingBtn]}
              onPress={() => goToAction("/(owner)/ponds/sampling")}
            >
              <Ionicons name="scale" size={20} color="#0EA5E9" />
              <Text style={[styles.actionText, { color: '#0EA5E9' }]}>Muestreo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.mortalityBtn]}
              onPress={() => goToAction("/(owner)/ponds/mortality")}
            >
              <Ionicons name="skull" size={20} color="#E53E3E" />
              <Text style={[styles.actionText, { color: '#E53E3E' }]}>Bajas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.stockingButton}
            onPress={goToStocking}
          >
            <Ionicons name="add-circle" size={22} color="white" />
            <Text style={styles.stockingButtonText}>Sembrar Lote de Peces</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Estanques</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push({
            pathname: "/(owner)/ponds/create",
            params: { farmId: farmId } 
          })}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="water-outline" size={80} color="#CBD5E0" />
              <Text style={styles.emptyText}>No hay estanques registrados</Text>
              <Text style={styles.emptySub}>{"Presiona \"Nuevo\" para comenzar"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F2F5F7", paddingHorizontal: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingTop: 60 },
    title: { fontSize: 24, fontWeight: "bold", color: "#003366" },
    addButton: { backgroundColor: "#0066CC", flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    addButtonText: { color: "white", fontWeight: "bold", marginLeft: 4 },
    card: { backgroundColor: "white", padding: 18, borderRadius: 24, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    headerActions: { alignItems: 'flex-end' },
    editButton: { padding: 5, marginBottom: 5 },
    pondName: { fontSize: 20, fontWeight: "bold", color: "#2D3748" },
    areaLabel: { fontSize: 12, color: "#4A5568", marginTop: 2, fontWeight: '600' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusLabel: { fontSize: 13, color: "#718096", fontWeight: '500' },
    fishCountBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    fishCountText: { fontWeight: 'bold', fontSize: 13 },
    inventoryNote: { fontSize: 12, color: "#A0AEC0", marginBottom: 15 },
    actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    actionButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
    feedingBtn: { backgroundColor: '#F0F7FF', borderColor: '#BEE3F8' },
    samplingBtn: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
    mortalityBtn: { backgroundColor: '#FFF5F5', borderColor: '#FED7D7' },
    actionText: { fontSize: 11, color: "#0066CC", fontWeight: '800', marginTop: 6 },
    stockingButton: { backgroundColor: "#00C853", flexDirection: "row", justifyContent: "center", alignItems: "center", padding: 15, borderRadius: 15 },
    stockingButtonText: { color: "white", fontWeight: "bold", marginLeft: 8 },
    empty: { marginTop: 80, alignItems: "center" },
    emptyText: { color: "#4A5568", fontSize: 18, fontWeight: 'bold', marginTop: 15 },
    emptySub: { color: "#A0AEC0", fontSize: 14, marginTop: 5 },
});