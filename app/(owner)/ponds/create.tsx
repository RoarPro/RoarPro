import { supabase } from "@/lib/supabase";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

export default function CreatePondScreen() {
  const router = useRouter();
  // Capturamos el ID de la finca desde los parámetros de navegación
  const { farmId: paramsFarmId } = useLocalSearchParams(); 

  const [pondName, setPondName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingBodegas, setFetchingBodegas] = useState(true);
  
  const [bodegas, setBodegas] = useState<any[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");

  const loadInitialData = useCallback(async () => {
    try {
      setFetchingBodegas(true);
      
      // 1. Validación de parámetro: Si no hay farmId, no podemos continuar
      if (!paramsFarmId) {
        throw new Error("No se recibió el ID de la finca. Regresa e intenta de nuevo.");
      }

      // 2. Obtener bodegas de esta finca específica
      const { data: inventoryData, error: invError } = await supabase
        .from("inventory")
        .select("id, item_name, is_satellite")
        .eq("farm_id", paramsFarmId)
        .order("is_satellite", { ascending: true });

      if (invError) throw invError;
      
      if (!inventoryData || inventoryData.length === 0) {
        Alert.alert(
          "Atención", 
          "Primero debes crear al menos una bodega en el Inventario de esta finca para vincular el estanque."
        );
        router.back();
        return;
      }

      setBodegas(inventoryData);

    } catch (error: any) {
      Alert.alert("Error de Configuración", error.message);
      if (!paramsFarmId) router.back();
    } finally {
      setFetchingBodegas(false);
    }
  }, [paramsFarmId, router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const createPond = async () => {
    if (!pondName.trim()) return Alert.alert("Campo Requerido", "Ingresa el nombre.");
    if (!selectedInventoryId) return Alert.alert("Bodega Requerida", "Asigna una bodega.");

    setLoading(true);

    try {
      // INSERT CORREGIDO:
      // Hemos eliminado 'user_id' porque tu tabla 'ponds' no contiene esa columna.
      // La seguridad se maneja a través de 'farm_id'.
      const { error } = await supabase.from("ponds").insert({
        name: pondName.trim(),
        farm_id: paramsFarmId, 
        inventory_id: selectedInventoryId,
        active: true,
        current_stock: 0,
      });

      if (error) throw error;

      Alert.alert("¡Éxito!", "Estanque creado y vinculado a esta finca.");
      
      // Regresamos a la lista de estanques
      router.back();
      
    } catch (error: any) {
      console.error("Error al Guardar:", error);
      Alert.alert("Error", error.message || "No se pudo guardar el estanque.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Nuevo Estanque</Text>
        <Text style={styles.subtitle}>
          Se registrará en la finca seleccionada utilizando una de sus bodegas.
        </Text>

        <Text style={styles.label}>Nombre del Estanque</Text>
        <TextInput
          placeholder="Ej: Estanque 01"
          style={styles.input}
          value={pondName}
          onChangeText={setPondName}
          placeholderTextColor="#A0AEC0"
        />

        <Text style={styles.label}>Bodega de Abastecimiento</Text>
        <View style={styles.pickerWrapper}>
          {fetchingBodegas ? (
            <View style={styles.loadingPicker}>
              <ActivityIndicator size="small" color="#0066CC" />
            </View>
          ) : (
            <Picker
              selectedValue={selectedInventoryId}
              onValueChange={(val) => setSelectedInventoryId(val)}
              style={styles.picker}
            >
              <Picker.Item label="-- Seleccione una Bodega --" value="" color="#A0AEC0" />
              {bodegas.map((bodega) => (
                <Picker.Item 
                  key={bodega.id} 
                  label={`${bodega.is_satellite ? "📍 Satélite: " : "🏠 Global: "} ${bodega.item_name}`} 
                  value={bodega.id} 
                />
              ))}
            </Picker>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.button, (!selectedInventoryId || !pondName.trim() || loading) && styles.buttonDisabled]} 
          onPress={createPond}
          disabled={!selectedInventoryId || !pondName.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Crear Estanque</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ textAlign: 'center', color: '#718096' }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F2F5F7", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "white", padding: 25, borderRadius: 25, elevation: 5 },
  title: { fontSize: 26, fontWeight: "bold", color: "#003366", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", color: "#718096", marginBottom: 25, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "bold", color: "#4A5568", marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: "#F7FAFC", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20, fontSize: 16 },
  pickerWrapper: { backgroundColor: "#F7FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 30, overflow: "hidden" },
  picker: { height: 55, width: "100%" },
  loadingPicker: { height: 55, justifyContent: 'center' },
  button: { backgroundColor: "#0066CC", padding: 18, borderRadius: 15, alignItems: 'center' },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});