import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function OwnerHomeScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados para el resumen (Datos de ejemplo que luego conectaremos a Supabase)
  const [totalBiomasa, setTotalBiomasa] = useState(0); 
  const [alerts, setAlerts] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  const loadInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", session.user.id)
        .single();
      
      if (profile) setUserName(profile.name);

      const { data: farmsData, error: farmsError } = await supabase
        .from("farms")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("active", true);

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);
      
      // Aquí podrías calcular la biomasa total sumando los estanques de estas fincas
      setTotalBiomasa(1240.5); // Dato de ejemplo en kg
      setAlerts(2); // Ejemplo: 2 estanques sin alimentar o poco inventario

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Componente de Tarjetas de Resumen
  const SummarySection = () => (
    <View style={styles.summaryContainer}>
      <View style={[styles.summaryCard, { backgroundColor: '#E6F4EA' }]}>
        <Ionicons name="fish" size={20} color="#1E8E3E" />
        <Text style={styles.summaryValue}>{totalBiomasa} kg</Text>
        <Text style={styles.summaryLabel}>Biomasa Total</Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: '#FEF7E0' }]}>
        <Ionicons name="alert-circle" size={20} color="#F9AB00" />
        <Text style={styles.summaryValue}>{alerts}</Text>
        <Text style={styles.summaryLabel}>Alertas hoy</Text>
      </View>
    </View>
  );

  // Componente de Acciones Rápidas
  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Acceso Rápido</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(owner)/ponds")}>
          <View style={[styles.actionIcon, { backgroundColor: '#E8F0FE' }]}>
            <Ionicons name="restaurant-outline" size={24} color="#1A73E8" />
          </View>
          <Text style={styles.actionText}>Alimentar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(owner)/ponds")}>
          <View style={[styles.actionIcon, { backgroundColor: '#FCE8E6' }]}>
            <Ionicons name="stats-chart-outline" size={24} color="#D93025" />
          </View>
          <Text style={styles.actionText}>Muestreo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(owner)/inventory")}>
          <View style={[styles.actionIcon, { backgroundColor: '#E6F4EA' }]}>
            <Ionicons name="cube-outline" size={24} color="#1E8E3E" />
          </View>
          <Text style={styles.actionText}>Insumos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>¡Hola, {userName || "Propietario"}!</Text>
          <Text style={styles.title}>Panel Principal</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(owner)/profile")}>
          <Ionicons name="person-circle-outline" size={45} color="#003366" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SummarySection />
        <QuickActions />

        <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 10 }]}>Mis Fincas</Text>

        {farms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="water-outline" size={100} color="#CBD5E0" />
            <Text style={styles.emptyText}>Bienvenido al sistema</Text>
            <Text style={styles.emptySubtext}>Registra tu primera finca para empezar.</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push("/(owner)/farms/create")}
            >
              <Text style={styles.createButtonText}>Registrar Mi Finca</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {farms.map((item) => (
              <TouchableOpacity 
                key={item.id}
                style={styles.farmCard}
                onPress={() => router.push(`/(owner)/farms/${item.id}`)}
              >
                <View style={styles.farmInfo}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="business" size={24} color="#0066CC" />
                  </View>
                  <View>
                    <Text style={styles.farmName}>{item.name}</Text>
                    <Text style={styles.farmDetails}>Toca para gestionar esta finca</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {farms.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push("/(owner)/farms/create")}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { 
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, 
    backgroundColor: "white", flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    elevation: 4
  },
  welcome: { fontSize: 14, color: "#0066CC", fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "bold", color: "#003366" },
  scrollContent: { paddingBottom: 100 },
  
  // Resumen
  summaryContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  summaryCard: { flex: 0.48, padding: 15, borderRadius: 16, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 5 },
  summaryLabel: { fontSize: 12, color: '#666' },

  // Acciones Rápidas
  quickActionsContainer: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#003366', marginBottom: 15 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { alignItems: 'center', width: '30%' },
  actionIcon: { width: 55, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#4A5568' },

  // Tarjetas de Fincas
  farmCard: {
    backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    elevation: 2
  },
  farmInfo: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 45, height: 45, borderRadius: 22, backgroundColor: "#E6F0FA", justifyContent: "center", alignItems: "center", marginRight: 12 },
  farmName: { fontSize: 16, fontWeight: 'bold', color: "#003366" },
  farmDetails: { fontSize: 11, color: "#718096" },

  emptyContainer: { alignItems: "center", padding: 40 },
  emptyText: { fontSize: 20, fontWeight: "bold", color: "#4A5568", marginTop: 20 },
  emptySubtext: { fontSize: 14, color: "#718096", textAlign: "center", marginTop: 10, marginBottom: 30 },
  createButton: { backgroundColor: "#0066CC", paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12 },
  createButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  fab: {
    position: "absolute", bottom: 30, right: 30, width: 60, height: 60,
    backgroundColor: "#00C853", borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5
  }
});