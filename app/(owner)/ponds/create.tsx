import { supabase } from "@/lib/supabase";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
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

  const [pondName, setPondName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingBodegas, setFetchingBodegas] = useState(true);
  
  const [farmId, setFarmId] = useState<string | null>(null);
  const [bodegas, setBodegas] = useState<any[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");

  const loadInitialData = useCallback(async () => {
    try {
      setFetchingBodegas(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data: farm, error: farmError } = await supabase
        .from("farms")
        .select("id")
        .eq("owner_id", user.id)
        .eq("active", true)
        .single();

      if (farmError || !farm) {
        throw new Error("No se pudo obtener la finca activa.");
      }
      setFarmId(farm.id);

      const { data: inventoryData, error: invError } = await supabase
        .from("inventory")
        .select("id, item_name, is_satellite")
        .eq("farm_id", farm.id)
        .order("is_satellite", { ascending: true });

      if (invError) throw invError;
      setBodegas(inventoryData || []);

    } catch {
      Alert.alert("Error", "No se pudo configurar la información inicial.");
      router.replace("/(owner)/ponds");
    } finally {
      setFetchingBodegas(false);
    }
  }, [router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const createPond = async () => {
    if (!pondName.trim()) {
      return Alert.alert("Campo Requerido", "Ingresa el nombre del estanque.");
    }
    if (!selectedInventoryId) {
      return Alert.alert("Bodega Requerida", "Asigna una bodega para este estanque.");
    }
    if (!farmId) return;

    setLoading(true);

    try {
      const { error } = await supabase.from("ponds").insert({
        name: pondName.trim(),
        farm_id: farmId,
        inventory_id: selectedInventoryId,
        active: true,
      });

      if (error) throw error;

      Alert.alert("¡Éxito!", "Estanque creado y vinculado correctamente.");
      router.replace("/(owner)/ponds");
      
    } catch {
      Alert.alert("Error", "No se pudo guardar el estanque.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Nuevo Estanque</Text>
        <Text style={styles.subtitle}>
          Configura un estanque asignándole una bodega específica para su alimentación.
        </Text>

        <Text style={styles.label}>Nombre del Estanque</Text>
        <TextInput
          placeholder="Ej: Estanque P31 o La Vega"
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
            <Text style={styles.buttonText}>Finalizar Registro</Text>
          )}
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