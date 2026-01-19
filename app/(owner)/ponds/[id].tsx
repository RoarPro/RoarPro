import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PondDetailScreen() {
  const router = useRouter();
  const { id, pondName } = useLocalSearchParams<{ id: string; pondName: string }>();

  const [pondData, setPondData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);

  // Lógica de cálculo técnico
  const getTechnicalRate = (weightGr: number) => {
    if (weightGr <= 20) return 0.08;
    if (weightGr <= 150) return 0.05;
    if (weightGr <= 500) return 0.03;
    return 0.015;
  };

  const fetchPondDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      // 1. Obtener datos básicos del estanque
      const { data: pond, error: pondError } = await supabase
        .from("ponds")
        .select("*")
        .eq("id", id)
        .single();
      
      if (pondError) throw pondError;
      setPondData(pond);

      // 2. Obtener historial (Mortalidad, Alimentación, Pesajes)
      const [mortalidad, alimentacion, pesajes] = await Promise.all([
        supabase.from("mortality_logs").select("*").eq("pond_id", id).order("created_at", { ascending: false }).limit(5),
        supabase.from("feeding_logs").select("*").eq("pond_id", id).order("created_at", { ascending: false }).limit(5),
        supabase.from("biomass_logs").select("*").eq("pond_id", id).order("created_at", { ascending: false }).limit(5)
      ]);

      // 3. Calcular recomendación si hay pesajes previos
      if (pesajes.data && pesajes.data.length > 0 && pond) {
        const ultimoPeso = pesajes.data[0].avg_weight_gr;
        const tasa = getTechnicalRate(ultimoPeso);
        const biomasaTotalKg = (pond.current_stock * ultimoPeso) / 1000;
        const totalKgSugerido = biomasaTotalKg * tasa;
        
        setRecommendation({ 
          kg: totalKgSugerido, 
          bultos: Math.floor(totalKgSugerido / 40), 
          sobrante: totalKgSugerido % 40, 
          rate: tasa * 100 
        });
      }

      // 4. Combinar y ordenar historial
      const combined = [
        ...(mortalidad.data || []).map(item => ({ ...item, type: 'mortality', title: 'Mortalidad', color: '#E53E3E', icon: 'trending-down', bg: '#FFF5F5' })),
        ...(alimentacion.data || []).map(item => ({ ...item, type: 'feeding', title: 'Alimentación', color: '#3182CE', icon: 'restaurant', bg: '#EBF8FF' })),
        ...(pesajes.data || []).map(item => ({ ...item, type: 'biomass', title: 'Pesaje', color: '#38A169', icon: 'scale', bg: '#F0FFF4' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setHistoryLogs(combined.slice(0, 10));
    } catch (error: any) { 
      Alert.alert("Error de Carga", error.message); 
    } finally { 
      setLoading(false); 
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchPondDetails();
    }, [fetchPondDetails])
  );

  if (loading && !pondData) return (
    <View style={[styles.container, styles.center]}>
      <ActivityIndicator size="large" color="#0066CC" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F7FAFC" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pondName || pondData?.name || "Detalle"}</Text>
          <TouchableOpacity onPress={fetchPondDetails}>
            <Ionicons name="refresh" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* RESUMEN CARD */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Población Actual</Text>
          <Text style={styles.summaryValue}>{pondData?.current_stock?.toLocaleString() || 0} peces</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View>
              <Text style={styles.statLabel}>Variedad</Text>
              <Text style={styles.statValue}>{pondData?.fish_type || "N/A"}</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Área</Text>
              <Text style={styles.statValue}>{pondData?.area_m2} m²</Text>
            </View>
          </View>
        </View>

        {/* RECOMENDACIÓN TÉCNICA */}
        {recommendation && (
          <View style={styles.recommendationCard}>
            <View style={styles.row}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="analytics" size={20} color="#2B6CB0" />
                <Text style={styles.recommendationTitle}> RECOMENDACIÓN DIARIA ({recommendation.rate.toFixed(1)}%)</Text>
              </View>
            </View>
            <Text style={styles.recommendationText}>Ración Sugerida: <Text style={{fontWeight: 'bold'}}>{recommendation.kg.toFixed(1)} Kg</Text></Text>
            <View style={styles.bultosBadge}>
              <Text style={styles.bultosText}>{recommendation.bultos} Bultos + {recommendation.sobrante.toFixed(1)} Kg</Text>
            </View>
          </View>
        )}

        {/* BOTONES DE ACCIÓN - RUTAS CORREGIDAS */}
        <Text style={styles.sectionTitle}>Registrar Actividad</Text>
        <View style={styles.actionGrid}>
          <ActionBtn 
            label="Alimentar" 
            icon="restaurant" 
            color="#3182CE" 
            bg="#EBF8FF" 
            onPress={() => router.push({
              pathname: "/(owner)/ponds/feeding",
              params: { id: id, name: pondData?.name, farm_id: pondData?.farm_id }
            } as any)} 
          />
          <ActionBtn 
            label="Mortalidad" 
            icon="trending-down" 
            color="#E53E3E" 
            bg="#FFF5F5" 
            onPress={() => router.push({
              pathname: "/(owner)/ponds/mortality",
              params: { id: id, name: pondData?.name }
            } as any)} 
          />
          <ActionBtn 
            label="Pesaje" 
            icon="scale" 
            color="#38A169" 
            bg="#F0FFF4" 
            onPress={() => router.push({
              pathname: "/(owner)/ponds/sampling",
              params: { id: id, name: pondData?.name }
            } as any)} 
          />
        </View>

        {/* HISTORIAL RECIENTE */}
        <Text style={styles.sectionTitle}>Historial del Estanque</Text>
        <View style={styles.historyCard}>
          {historyLogs.length === 0 ? (
            <Text style={{ padding: 20, textAlign: 'center', color: '#A0AEC0' }}>Sin movimientos registrados</Text>
          ) : (
            historyLogs.map((log, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={[styles.historyIcon, { backgroundColor: log.bg }]}>
                  <Ionicons name={log.icon} size={18} color={log.color} />
                </View>
                
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.historyTitle}>
                    {log.type === 'mortality' ? `${log.quantity} peces` : log.type === 'feeding' ? `${log.amount_kg} Kg` : `${log.avg_weight_gr} gr`}
                    <Text style={{ fontWeight: '400', color: '#718096' }}> • {log.title}</Text>
                  </Text>
                  {log.notes && <Text style={styles.historyNotes}>💬 {log.notes}</Text>}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyDate}>
                    {new Date(log.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </Text>
                  <Text style={[styles.historyDate, { marginTop: 2, color: '#4A5568', fontWeight: 'bold' }]}>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const ActionBtn = ({ label, icon, color, bg, onPress }: any) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: "#0066CC", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  summaryCard: { backgroundColor: "white", margin: 20, borderRadius: 20, padding: 25, elevation: 4 },
  summaryLabel: { color: "#718096", fontSize: 14, marginBottom: 5 },
  summaryValue: { fontSize: 32, fontWeight: "bold", color: "#2D3748" },
  divider: { height: 1, backgroundColor: "#EDF2F7", marginVertical: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center' },
  statLabel: { color: "#A0AEC0", fontSize: 12 },
  statValue: { color: "#4A5568", fontSize: 16, fontWeight: "600", marginTop: 4 },
  recommendationCard: { backgroundColor: "#EBF8FF", marginHorizontal: 20, padding: 18, borderRadius: 15, borderLeftWidth: 5, borderLeftColor: "#3182CE" },
  recommendationTitle: { fontSize: 11, fontWeight: "bold", color: "#2B6CB0", letterSpacing: 0.5 },
  recommendationText: { fontSize: 17, color: "#2D3748", marginTop: 8 },
  bultosBadge: { backgroundColor: "#BEE3F8", alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  bultosText: { fontSize: 12, color: '#2C5282', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginHorizontal: 20, color: "#2D3748", marginTop: 25 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 15 },
  actionButton: { backgroundColor: 'white', width: '31%', padding: 12, borderRadius: 15, alignItems: 'center', elevation: 2 },
  iconCircle: { width: 45, height: 45, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 11, fontWeight: 'bold', color: '#4A5568' },
  historyCard: { backgroundColor: 'white', margin: 20, borderRadius: 20, padding: 10, elevation: 2, marginBottom: 40 },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F7FAFC', paddingHorizontal: 5 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontSize: 14, fontWeight: 'bold', color: '#2D3748' },
  historyNotes: { fontSize: 11, color: '#4A5568', marginTop: 4, fontStyle: 'italic', backgroundColor: '#F7FAFC', padding: 6, borderRadius: 5 },
  historyDate: { fontSize: 10, color: '#A0AEC0' },
});