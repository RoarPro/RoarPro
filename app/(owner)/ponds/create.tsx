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
  // Capturamos params de creación o edición
  const { farmId: paramsFarmId, pondId, isEditing } = useLocalSearchParams(); 

  const [pondName, setPondName] = useState("");
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  const [bodegas, setBodegas] = useState<any[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");

  const loadInitialData = useCallback(async () => {
    try {
      setFetchingData(true);
      
      if (!paramsFarmId) {
        throw new Error("No se recibió el ID de la finca.");
      }

      // 1. Cargar Bodegas disponibles
      const { data: inventoryData, error: invError } = await supabase
        .from("inventory")
        .select("id, item_name, is_satellite")
        .eq("farm_id", paramsFarmId)
        .order("is_satellite", { ascending: true });

      if (invError) throw invError;
      setBodegas(inventoryData || []);

      // 2. Si estamos EDITANDO, cargar los datos del estanque actual
      if (isEditing === "true" && pondId) {
        const { data: pondData, error: pondError } = await supabase
          .from("ponds")
          .select("*")
          .eq("id", pondId)
          .single();

        if (pondError) throw pondError;
        
        if (pondData) {
          setPondName(pondData.name);
          setArea(pondData.area_m2?.toString() || "");
          setSelectedInventoryId(pondData.inventory_id || "");
        }
      }

    } catch (error: any) {
      Alert.alert("Error", error.message);
      router.back();
    } finally {
      setFetchingData(false);
    }
  }, [paramsFarmId, pondId, isEditing, router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSave = async () => {
    if (!pondName.trim()) return Alert.alert("Campo Requerido", "Ingresa el nombre.");
    if (!area.trim() || isNaN(parseFloat(area))) return Alert.alert("Campo Requerido", "Ingresa un área válida.");
    if (!selectedInventoryId) return Alert.alert("Bodega Requerida", "Asigna una bodega.");

    setLoading(true);

    const pondPayload = {
      name: pondName.trim(),
      farm_id: paramsFarmId, 
      inventory_id: selectedInventoryId,
      current_food_id: selectedInventoryId,
      area_m2: parseFloat(area),
    };

    try {
      if (isEditing === "true" && pondId) {
        // LÓGICA DE ACTUALIZACIÓN
        const { error } = await supabase
          .from("ponds")
          .update(pondPayload)
          .eq("id", pondId);
        
        if (error) throw error;
        Alert.alert("¡Actualizado!", "Los datos del estanque han sido corregidos.");
      } else {
        // LÓGICA DE CREACIÓN
        const { error } = await supabase.from("ponds").insert({
          ...pondPayload,
          active: true,
          current_stock: 0,
        });
        
        if (error) throw error;
        Alert.alert("¡Éxito!", "Estanque creado correctamente.");
      }

      router.back();
      
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 10, color: '#718096' }}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>{isEditing === "true" ? "Editar Estanque" : "Nuevo Estanque"}</Text>
        <Text style={styles.subtitle}>
          {isEditing === "true" 
            ? "Modifica las especificaciones técnicas del estanque." 
            : "Registra la infraestructura y define su capacidad productiva."}
        </Text>

        <Text style={styles.label}>Nombre del Estanque</Text>
        <TextInput
          placeholder="Ej: Estanque 01"
          style={styles.input}
          value={pondName}
          onChangeText={setPondName}
          placeholderTextColor="#A0AEC0"
        />

        <Text style={styles.label}>Área Espejo de Agua (m²)</Text>
        <TextInput
          placeholder="Ej: 500"
          style={styles.input}
          value={area}
          onChangeText={setArea}
          keyboardType="numeric"
          placeholderTextColor="#A0AEC0"
        />

        <Text style={styles.label}>Bodega de Abastecimiento</Text>
        <View style={styles.pickerWrapper}>
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
        </View>

        <TouchableOpacity 
          style={[
            styles.button, 
            (!selectedInventoryId || !pondName.trim() || !area.trim() || loading) && styles.buttonDisabled
          ]} 
          onPress={handleSave}
          disabled={!selectedInventoryId || !pondName.trim() || !area.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {isEditing === "true" ? "Guardar Cambios" : "Crear Estanque"}
            </Text>
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
  center: { alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: "white", padding: 25, borderRadius: 25, elevation: 5 },
  title: { fontSize: 26, fontWeight: "bold", color: "#003366", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", color: "#718096", marginBottom: 25, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "bold", color: "#4A5568", marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: "#F7FAFC", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20, fontSize: 16 },
  pickerWrapper: { backgroundColor: "#F7FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 30, overflow: "hidden" },
  picker: { height: 55, width: "100%" },
  button: { backgroundColor: "#0066CC", padding: 18, borderRadius: 15, alignItems: 'center' },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});