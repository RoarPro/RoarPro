import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
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
  // farmId viene de la ruta [id], pondId e isEditing vienen como query params
  const { id: farmId, pondId, isEditing } = useLocalSearchParams();

  const [pondName, setPondName] = useState("");
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [bodegas, setBodegas] = useState<any[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");

  const loadInitialData = useCallback(async () => {
    try {
      setFetchingData(true);

      if (!farmId) {
        throw new Error("No se detectó el ID de la finca en la ruta.");
      }

      // 1. Cargar Bodegas disponibles para esta finca
      const { data: inventoryData, error: invError } = await supabase
        .from("inventory")
        .select("id, item_name, is_satellite")
        .eq("farm_id", farmId)
        .order("is_satellite", { ascending: true });

      if (invError) throw invError;
      setBodegas(inventoryData || []);

      // 2. Si estamos EDITANDO, cargar los datos previos del estanque
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
      Alert.alert("Error de Carga", error.message);
      router.back();
    } finally {
      setFetchingData(false);
    }
  }, [farmId, pondId, isEditing, router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSave = async () => {
    const cleanArea = area.replace(",", ".");

    if (!pondName.trim())
      return Alert.alert("Requerido", "El nombre es obligatorio.");
    if (!cleanArea.trim() || isNaN(parseFloat(cleanArea)))
      return Alert.alert("Requerido", "Ingresa un área válida.");
    if (!selectedInventoryId)
      return Alert.alert(
        "Bodega",
        "Debes asignar una bodega de abastecimiento.",
      );

    setLoading(true);

    const pondPayload = {
      name: pondName.trim(),
      farm_id: farmId,
      inventory_id: selectedInventoryId,
      area_m2: parseFloat(cleanArea),
    };

    try {
      if (isEditing === "true" && pondId) {
        const { error } = await supabase
          .from("ponds")
          .update(pondPayload)
          .eq("id", pondId);

        if (error) throw error;
        Alert.alert("¡Actualizado!", "Estanque modificado correctamente.");
      } else {
        const { error } = await supabase.from("ponds").insert({
          ...pondPayload,
          active: true,
          current_quantity: 0,
        });

        if (error) throw error;
        Alert.alert("¡Éxito!", "Nuevo estanque registrado.");
      }

      router.back();
    } catch (error: any) {
      Alert.alert("Error al guardar", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 15, color: "#64748B", fontWeight: "500" }}>
          Sincronizando datos...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Botón Volver Manual (Header Personalizado) */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#003366" />
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.iconHeader}>
          <Ionicons
            name={isEditing === "true" ? "options-outline" : "water-outline"}
            size={40}
            color="#0066CC"
          />
        </View>

        <Text style={styles.title}>
          {isEditing === "true" ? "Editar Estanque" : "Nuevo Estanque"}
        </Text>
        <Text style={styles.subtitle}>
          {isEditing === "true"
            ? "Modifica los parámetros técnicos de esta unidad de producción."
            : "Configura las dimensiones y logística del nuevo estanque."}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Estanque</Text>
          <TextInput
            placeholder="Ej: Estanque 01 - Engorde"
            style={styles.input}
            value={pondName}
            onChangeText={setPondName}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Área Espejo de Agua (m²)</Text>
          <TextInput
            placeholder="Ej: 500"
            style={styles.input}
            value={area}
            onChangeText={setArea}
            keyboardType="decimal-pad"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bodega de Alimento</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedInventoryId}
              onValueChange={(val) => setSelectedInventoryId(val)}
              style={styles.picker}
            >
              <Picker.Item
                label="Seleccionar bodega..."
                value=""
                color="#94A3B8"
              />
              {bodegas.map((bodega) => (
                <Picker.Item
                  key={bodega.id}
                  label={`${bodega.is_satellite ? "📍 Satélite: " : "🏠 Principal: "} ${bodega.item_name}`}
                  value={bodega.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!selectedInventoryId ||
              !pondName.trim() ||
              !area.trim() ||
              loading) &&
              styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={
            !selectedInventoryId || !pondName.trim() || !area.trim() || loading
          }
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {isEditing === "true" ? "Guardar Cambios" : "Crear Estanque"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    padding: 20,
    paddingTop: 60,
  },
  center: { alignItems: "center", justifyContent: "center" },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 32,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  iconHeader: {
    alignSelf: "center",
    marginBottom: 15,
    backgroundColor: "#F0F9FF",
    padding: 20,
    borderRadius: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748B",
    marginBottom: 30,
    lineHeight: 20,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
    color: "#1E293B",
  },
  pickerWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  picker: { height: 55, width: "100%" },
  button: {
    backgroundColor: "#0066CC",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { backgroundColor: "#CBD5E0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 17 },
  cancelButton: { marginTop: 15, padding: 10 },
  cancelText: { textAlign: "center", color: "#94A3B8", fontWeight: "600" },
});
