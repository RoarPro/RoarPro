import { supabase } from "@/lib/supabase";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function FeedingForm() {
  const { id, name, farm_id } = useLocalSearchParams();
  const router = useRouter();

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedItem, setSelectedItem] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async (fincaId: string, pondId: string) => {
    try {
      setLoading(true);
      
      // 1. Obtener la bodega vinculada preferida de este estanque
      const { data: pondData } = await supabase
        .from("ponds")
        .select("inventory_id")
        .eq("id", pondId)
        .single();

      // 2. Obtener todos los inventarios de la finca (Global y Satélites)
      const { data: invData, error: invError } = await supabase
        .from("inventory")
        .select("id, item_name, quantity, unit, is_satellite")
        .eq("farm_id", fincaId)
        .gt("quantity", 0) 
        .order("is_satellite", { ascending: false }); // Satélites primero
      
      if (invError) throw invError;
      
      setInventory(invData || []);

      // Si el estanque tiene una bodega asignada, la seleccionamos por defecto
      if (pondData?.inventory_id) {
        setSelectedItem(pondData.inventory_id);
      }
    } catch {
      Alert.alert("Error", "No se pudo sincronizar con la bodega.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farm_id && id) {
      fetchData(farm_id as string, id as string);
    }
  }, [farm_id, id, fetchData]);

  const handleSave = async () => {
    const qtyToSubtract = parseFloat(amount.replace(',', '.'));
    
    if (!selectedItem) return Alert.alert("Error", "Selecciona una bodega de suministro");
    if (isNaN(qtyToSubtract) || qtyToSubtract <= 0) {
      return Alert.alert("Error", "Ingresa una cantidad válida");
    }

    const item = inventory.find(i => i.id === selectedItem);
    if (!item) return Alert.alert("Error", "Insumo no encontrado");

    if (qtyToSubtract > item.quantity) {
      return Alert.alert("Stock Insuficiente", `En esta bodega solo quedan ${item.quantity} ${item.unit}.`);
    }

    try {
      setSaving(true);
      
      // 1. Registrar el log de alimentación
      const { error: logError } = await supabase.from("feeding_logs").insert([
        {
          pond_id: id,
          inventory_id: selectedItem,
          amount_kg: qtyToSubtract,
          notes: notes.trim(),
        },
      ]);
      if (logError) throw logError;

      // 2. Descontar del inventario seleccionado
      const { error: invError } = await supabase
        .from("inventory")
        .update({ quantity: item.quantity - qtyToSubtract })
        .eq("id", item.id);
      
      if (invError) throw invError;

      Alert.alert("¡Éxito!", "Alimentación registrada correctamente.");
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo completar el registro.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#003366" />
      <Text style={{marginTop: 10, color: '#666'}}>Cargando bodegas...</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1, backgroundColor: '#F2F5F7' }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Registrar Alimentación</Text>
            <Text style={styles.subtitle}>{name}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Punto de Abastecimiento</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedItem}
              onValueChange={(val) => setSelectedItem(val)}
              dropdownIconColor="#003366"
            >
              <Picker.Item label="-- Seleccione bodega --" value="" color="#999" />
              {inventory.map((inv) => (
                <Picker.Item 
                  key={inv.id} 
                  label={`${inv.is_satellite ? "📍" : "🏠"} ${inv.item_name} (Disp: ${inv.quantity} ${inv.unit})`} 
                  value={inv.id} 
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Cantidad (Kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 12.5"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Opcional: comportamiento de los peces, clima, etc."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => router.back()} 
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.saveButton, (saving || !selectedItem) && { opacity: 0.5 }]} 
              onPress={handleSave}
              disabled={saving || !selectedItem}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  header: { 
    backgroundColor: "#003366", 
    paddingTop: 60, 
    paddingBottom: 30, 
    paddingHorizontal: 25, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    elevation: 5
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#F2F5F7' },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 16, color: "#E2E8F0", marginTop: 5 },
  form: { padding: 25, gap: 20 },
  label: { fontSize: 14, fontWeight: "bold", color: "#4A5568", marginBottom: -10, marginLeft: 5 },
  pickerContainer: { backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", overflow: 'hidden', elevation: 1 },
  input: { backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 15, fontSize: 16, elevation: 1 },
  textArea: { height: 100, textAlignVertical: 'top' },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  button: { flex: 0.48, padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  cancelButton: { backgroundColor: "#fff" },
  saveButton: { backgroundColor: "#003366" },
  cancelButtonText: { color: "#4A5568", fontWeight: "bold" },
  saveButtonText: { color: "#fff", fontWeight: "bold" }
});