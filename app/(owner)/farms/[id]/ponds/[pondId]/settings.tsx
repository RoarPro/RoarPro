import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PondSettingsScreen() {
  const router = useRouter();
  const { pondId } = useLocalSearchParams();

  // Estados para los datos del estanque
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [depth, setDepth] = useState("");

  // Estados de la UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Cargar datos actuales desde Supabase al abrir la pantalla
  useEffect(() => {
    const fetchPondSettings = async () => {
      try {
        setLoading(true);
        // 1. Traer info técnica del estanque
        const { data: pondData, error: pondError } = await supabase
          .from("ponds")
          .select("name, max_capacity, depth")
          .eq("id", pondId)
          .single();

        if (pondError) throw pondError;

        setName(pondData.name || "");
        setCapacity(
          pondData.max_capacity ? pondData.max_capacity.toString() : "",
        );
        setDepth(pondData.depth ? pondData.depth.toString() : "");

        // 2. Verificar si hay un lote activo para habilitar el botón de Cosecha
        const { data: batchData } = await supabase
          .from("fish_batches")
          .select("id")
          .eq("pond_id", pondId)
          .eq("status", "active")
          .maybeSingle();

        if (batchData) {
          setActiveBatchId(batchData.id);
        }
      } catch (error: any) {
        Alert.alert("Error", "No se pudieron cargar los ajustes del estanque.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPondSettings();
  }, [pondId]);

  // Guardar cambios técnicos
  const handleUpdate = async () => {
    if (!name.trim())
      return Alert.alert("Atención", "El nombre es obligatorio.");

    try {
      setSaving(true);
      const { error } = await supabase
        .from("ponds")
        .update({
          name: name.trim(),
          max_capacity: capacity ? parseInt(capacity) : null,
          depth: depth ? parseFloat(depth.replace(",", ".")) : null,
        })
        .eq("id", pondId);

      if (error) throw error;

      Alert.alert("¡Éxito!", "Parámetros técnicos actualizados.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", "No se guardaron los cambios.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Cierre de Ciclo (Cosecha)
  const executeHarvest = async () => {
    try {
      setSaving(true);
      // Cambiamos el estado del lote a completado/cosechado
      const { error } = await supabase
        .from("fish_batches")
        .update({
          status: "completed",
          end_date: new Date().toISOString(), // Fecha de cierre automático
        })
        .eq("id", activeBatchId);

      if (error) throw error;

      Alert.alert(
        "Lote Finalizado",
        "El estanque ahora está libre para una nueva siembra.",
      );
      router.back(); // Regresamos al detalle, que ahora debería verse vacío
    } catch (error: any) {
      Alert.alert("Error", "No se pudo finalizar el lote.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseBatch = () => {
    Alert.alert(
      "Finalizar Lote (Cosecha)",
      "¿Estás seguro de que deseas cerrar este ciclo productivo? El estanque pasará a estar disponible.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Cosechar",
          style: "destructive",
          onPress: executeHarvest,
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Parámetros Técnicos</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#0066CC" />
          ) : (
            <Text style={styles.saveText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* SECCIÓN 1: DATOS FÍSICOS */}
        <Text style={styles.sectionTitle}>Infraestructura del Estanque</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Identificador del Estanque</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Estanque P-01"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Capacidad (Peces)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 5000"
              keyboardType="numeric"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Profundidad (m)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 2"
              keyboardType="decimal-pad"
              value={depth}
              onChangeText={setDepth}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* SECCIÓN 2: GESTIÓN DE PRODUCCIÓN */}
        <Text style={styles.sectionTitle}>Ciclo Productivo</Text>

        {activeBatchId ? (
          <>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={handleCloseBatch}
            >
              <Ionicons name="fish-outline" size={20} color="#E53E3E" />
              <Text style={styles.dangerBtnText}>
                Registrar Cosecha (Cerrar Lote)
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Ejecuta esta acción solo cuando se haya retirado la biomasa
              completa. El sistema calculará el factor de conversión final.
            </Text>
          </>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#64748B"
            />
            <Text style={styles.emptyStateText}>
              No hay ningún lote activo en este estanque para cosechar.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  saveText: { color: "#0066CC", fontWeight: "bold", fontSize: 16 },
  content: { padding: 25 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#003366",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#64748B", marginBottom: 8 },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 16,
    color: "#1E293B",
  },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 25 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEB2B2",
  },
  dangerBtnText: {
    color: "#E53E3E",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 15,
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 12,
    lineHeight: 18,
    textAlign: "justify",
  },
  emptyStateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 15,
    borderRadius: 10,
  },
  emptyStateText: { color: "#64748B", fontSize: 14, marginLeft: 10, flex: 1 },
});
