import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function OwnerHomeScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [userName, setUserName] = useState(""); // Estado para el nombre del perfil
  const [loading, setLoading] = useState(true);

  // useFocusEffect hace que los datos se recarguen cada vez que entras a esta pantalla
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  const loadInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Traer datos del perfil (Nombre)
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", session.user.id)
        .single();
      
      if (profile) setUserName(profile.name);

      // 2. Traer las fincas
      const { data: farmsData, error: farmsError } = await supabase
        .from("farms")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("active", true);

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabecera Personalizada */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>¡Hola, {userName || "Propietario"}!</Text>
          <Text style={styles.title}>Mis Fincas</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.profileIconButton}
          onPress={() => router.push("/(owner)/profile" as any)}
        >
          <Ionicons name="person-circle-outline" size={45} color="#003366" />
        </TouchableOpacity>
      </View>

      {farms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="water-outline" size={100} color="#CBD5E0" />
          <Text style={styles.emptyText}>Bienvenido al sistema</Text>
          <Text style={styles.emptySubtext}>Para empezar a gestionar tu producción, registra tu primera finca.</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push("/(owner)/create-farm" as any)}
          >
            <Text style={styles.createButtonText}>Registrar Mi Finca</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.farmCard}
              onPress={() => router.push(`/(owner)/farm-dashboard/${item.id}` as any)}
            >
              <View style={styles.farmInfo}>
                <View style={styles.iconCircle}>
                  <Ionicons name="business" size={24} color="#0066CC" />
                </View>
                <View>
                  <Text style={styles.farmName}>{item.name}</Text>
                  <Text style={styles.farmDetails}>Toca para ver detalles</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
            </TouchableOpacity>
          )}
        />
      )}

      {farms.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push("/(owner)/create-farm" as any)}
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
    elevation: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10
  },
  welcome: { fontSize: 16, color: "#0066CC", fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "bold", color: "#003366" },
  profileIconButton: { padding: 5 },
  listContent: { padding: 20 },
  farmCard: {
    backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 15,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  farmInfo: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#E6F0FA", justifyContent: "center", alignItems: "center", marginRight: 15 },
  farmName: { fontSize: 18, fontWeight: "bold", color: "#003366" },
  farmDetails: { fontSize: 12, color: "#718096", marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { fontSize: 20, fontWeight: "bold", color: "#4A5568", marginTop: 20 },
  emptySubtext: { fontSize: 14, color: "#718096", textAlign: "center", marginTop: 10, marginBottom: 30 },
  createButton: { backgroundColor: "#0066CC", paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12 },
  createButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  fab: {
    position: "absolute", bottom: 30, right: 30, width: 60, height: 60,
    backgroundColor: "#00C853", borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5
  }
});