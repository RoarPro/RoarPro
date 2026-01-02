import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function MortalityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [quantity, setQuantity] = useState("");
  const [cause, setCause] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  // Cargar el stock actual para validar
  useEffect(() => {
    async function getStock() {
      const { data } = await supabase
        .from("ponds")
        .select("current_stock")
        .eq("id", id)
        .single();
      if (data) setCurrentStock(data.current_stock);
    }
    if (id) getStock();
  }, [id]);

  const handleSave = async () => {
    const qtyInt = parseInt(quantity);

    if (!quantity || isNaN(qtyInt) || qtyInt <= 0) {
      return Alert.alert("Error", "Ingresa una cantidad válida de peces.");
    }

    if (currentStock !== null && qtyInt > currentStock) {
      return Alert.alert("Error", `No puedes registrar más bajas de las que hay en el estanque (${currentStock} peces).`);
    }

    setLoading(true);
    try {
      // 1. Insertar en el log de mortalidad
      const { error: logError } = await supabase.from("mortality_logs").insert([
        { 
          pond_id: id, 
          quantity: qtyInt, 
          cause: cause || "No especificada",
          created_at: new Date().toISOString() 
        }
      ]);
      if (logError) throw logError;

      // 2. ACTUALIZAR EL STOCK EN LA TABLA PONDS (Crucial)
      const { error: updateError } = await supabase.rpc('decrement_pond_stock', {
        pond_id_param: id,
        amount_to_subtract: qtyInt
      });

      // Nota: Si no tienes configurada la función RPC todavía, puedes usar un update normal:
      /*
      const { error: updateError } = await supabase
        .from("ponds")
        .update({ current_stock: currentStock! - qtyInt })
        .eq("id", id);
      */

      if (updateError) throw updateError;

      Alert.alert("Éxito", "Mortalidad registrada y stock actualizado.");
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo actualizar el stock del estanque.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1, backgroundColor: '#F2F5F7' }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Reportar Bajas</Text>
          <Text style={styles.subtitle}>Registro de mortalidad de peces</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#718096" />
            <Text style={styles.infoText}>
              Stock actual: <Text style={{fontWeight: 'bold'}}>{currentStock ?? '--'} peces</Text>
            </Text>
          </View>

          <Text style={styles.label}>¿Cuántos peces murieron?</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            value={quantity} 
            onChangeText={setQuantity} 
            placeholder="Ej: 15"
            placeholderTextColor="#A0AEC0"
          />

          <Text style={styles.label}>Causa o síntoma (Opcional)</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={cause} 
            onChangeText={setCause} 
            placeholder="Ej: Falta de oxígeno, hongos, etc."
            placeholderTextColor="#A0AEC0"
            multiline
          />

          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleSave} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" style={{marginRight: 10}} />
                <Text style={styles.btnText}>CONFIRMAR REGISTRO</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  header: { backgroundColor: '#E53E3E', paddingTop: 60, paddingBottom: 30, paddingHorizontal: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: '#FFDADA' },
  card: { backgroundColor: 'white', margin: 20, borderRadius: 25, padding: 25, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', padding: 12, borderRadius: 10, marginBottom: 20 },
  infoText: { marginLeft: 8, color: '#4A5568', fontSize: 14 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4A5568', marginBottom: 10, marginLeft: 5 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#E53E3E', padding: 18, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});