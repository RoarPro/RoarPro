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
  const [pondData, setPondData] = useState<any>(null); // Datos del estanque + batch
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedItem, setSelectedItem] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async (fincaId: string, pondId: string) => {
    try {
      setLoading(true);
      
      // 1. Obtener estanque con su Lote Activo (para Biomasa) e Item de alimento vinculado
      const { data: pData, error: pError } = await supabase
        .from("ponds")
        .select(`
          inventory_id,
          current_food_id,
          fish_batches(current_quantity, average_weight)
        `)
        .eq("id", pondId)
        .eq("fish_batches.status", "active")
        .single();

      if (pError) console.log("Nota: No hay lote activo o error en batch", pError);
      setPondData(pData);

      // 2. Obtener inventarios de la finca
      const { data: invData, error: invError } = await supabase
        .from("inventory")
        .select("id, item_name, quantity, unit, is_satellite")
        .eq("farm_id", fincaId)
        .gt("quantity", 0) 
        .order("is_satellite", { ascending: false });
      
      if (invError) throw invError;
      setInventory(invData || []);

      // Seleccionar por defecto el alimento específico del estanque si existe
      if (pData?.current_food_id) {
        setSelectedItem(pData.current_food_id);
      } else if (pData?.inventory_id) {
        setSelectedItem(pData.inventory_id);
      }
    } catch  {
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

  // --- LÓGICA DE CÁLCULO ---
  const batch = pondData?.fish_batches?.[0];
  const biomasaKg = batch ? (batch.current_quantity * batch.average_weight) / 1000 : 0;
  
  // Determinamos el % según el nombre del item seleccionado
  const selectedProduct = inventory.find(i => i.id === selectedItem);
  const isHighProtein = selectedProduct?.item_name?.includes("45");
  const feedPercent = isHighProtein ? 0.05 : 0.03; // 5% para iniciación, 3% para el resto
  
  const dailyGoal = biomasaKg * feedPercent;
  const rationSuggestion = dailyGoal / 3;

  const handleSave = async () => {
    const qtyToSubtract = parseFloat(amount.replace(',', '.'));
    
    if (!selectedItem) return Alert.alert("Error", "Selecciona una bodega");
    if (isNaN(qtyToSubtract) || qtyToSubtract <= 0) return Alert.alert("Error", "Cantidad inválida");

    const item = inventory.find(i => i.id === selectedItem);
    if (!item || qtyToSubtract > item.quantity) {
      return Alert.alert("Stock Insuficiente", "No hay suficiente alimento.");
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
          // Si tu tabla pide farm_id obligatoriamente, descomenta la línea de abajo:
          // farm_id: farm_id 
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

    } catch (error: any) {
      // ESTO TE DIRÁ EXACTAMENTE QUÉ PASA
      console.error("Error detallado:", error);
      Alert.alert(
        "Error al registrar",
        `Mensaje: ${error.message}\nDetalle: ${error.details || 'n/a'}\nSugerencia: ${error.hint || 'n/a'}`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#003366" />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#F2F5F7' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Alimentar {name}</Text>
            {batch && (
              <Text style={styles.subtitle}>
                Biomasa: {biomasaKg.toFixed(1)} Kg | Meta: {dailyGoal.toFixed(1)} Kg/día
              </Text>
            )}
        </View>

        <View style={styles.form}>
          {/* TARJETA DE CÁLCULO SUGERIDO */}
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionTitle}>Sugerencia Ración (1 de 3)</Text>
            <Text style={styles.suggestionValue}>{rationSuggestion.toFixed(2)} Kg</Text>
            <TouchableOpacity 
              onPress={() => setAmount(rationSuggestion.toFixed(2).toString())}
              style={styles.applyButton}
            >
              <Text style={styles.applyButtonText}>Usar sugerencia</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Alimento / Bodega</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedItem} onValueChange={(val) => setSelectedItem(val)}>
              <Picker.Item label="-- Seleccione alimento --" value="" color="#999" />
              {inventory.map((inv) => (
                <Picker.Item key={inv.id} label={`${inv.item_name} (Stock: ${inv.quantity} ${inv.unit})`} value={inv.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Cantidad a suministrar (Kg)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" />

          <Text style={styles.label}>Observaciones</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={3} value={notes} onChangeText={setNotes} placeholder="..." />

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={saving || !selectedItem}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Confirmar Entrega</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  header: { backgroundColor: "#003366", paddingTop: 50, paddingBottom: 20, paddingHorizontal: 25 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 14, color: "#E2E8F0", marginTop: 5 },
  form: { padding: 20, gap: 15 },
  suggestionCard: { backgroundColor: "#EBF8FF", padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "#BEE3F8", alignItems: 'center' },
  suggestionTitle: { color: "#2B6CB0", fontSize: 13, fontWeight: 'bold' },
  suggestionValue: { fontSize: 28, fontWeight: 'bold', color: "#2C5282", marginVertical: 5 },
  applyButton: { backgroundColor: "#3182CE", paddingVertical: 5, paddingHorizontal: 15, borderRadius: 20 },
  applyButtonText: { color: "white", fontSize: 12, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: "bold", color: "#4A5568" },
  pickerContainer: { backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  input: { backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, fontSize: 16 },
  textArea: { height: 80 },
  buttonGroup: { marginTop: 10 },
  button: { padding: 18, borderRadius: 15, alignItems: 'center' },
  saveButton: { backgroundColor: "#003366" },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 }
});