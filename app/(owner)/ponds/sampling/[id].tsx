import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

export default function SamplingScreen() {
  const { id, name } = useLocalSearchParams<{ id: string, name: string }>();
  const router = useRouter();
  
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const weightNum = parseFloat(weight.replace(',', '.'));

    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      return Alert.alert("Error", "Ingresa un peso promedio válido.");
    }

    setLoading(true);
    try {
      // 1. Insertar el log (usamos biomass_logs para que aparezca en el historial del detalle)
      const { error: logError } = await supabase.from("biomass_logs").insert([
        { 
          pond_id: id, 
          avg_weight_gr: weightNum, 
          notes: notes.trim(),
          created_at: new Date().toISOString() 
        }
      ]);

      if (logError) throw logError;

      // Opcional: Si quieres actualizar el peso en la tabla principal para cálculos rápidos:
      /*
      await supabase.from("ponds").update({ last_weight: weightNum }).eq("id", id);
      */

      Alert.alert("¡Éxito!", "Pesaje registrado. La recomendación de alimento se ha actualizado.");
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar el muestreo.");
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
          <Text style={styles.title}>Nuevo Muestreo</Text>
          <Text style={styles.subtitle}>{name || "Control de Peso"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Peso promedio actual (gramos)</Text>
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.input} 
              keyboardType="decimal-pad" 
              value={weight} 
              onChangeText={setWeight} 
              placeholder="0.00"
              placeholderTextColor="#A0AEC0"
            />
            <Text style={styles.unitText}>gr</Text>
          </View>

          <Text style={styles.label}>Observaciones del lote</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={notes} 
            onChangeText={setNotes} 
            placeholder="Ej: Se ven sanos, crecimiento uniforme..."
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
                <Ionicons name="scale" size={20} color="white" style={{marginRight: 10}} />
                <Text style={styles.btnText}>REGISTRAR MUESTREO</Text>
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
  header: { backgroundColor: '#FFAB00', paddingTop: 60, paddingBottom: 30, paddingHorizontal: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: '#FFF3E0' },
  card: { backgroundColor: 'white', margin: 20, borderRadius: 25, padding: 25, elevation: 4 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4A5568', marginBottom: 10, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginBottom: 20 },
  input: { flex: 1, padding: 15, fontSize: 16, color: '#2D3748' },
  unitText: { paddingRight: 15, fontWeight: 'bold', color: '#A0AEC0' },
  textArea: { height: 90, textAlignVertical: 'top', backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, marginBottom: 20 },
  button: { backgroundColor: '#FFAB00', padding: 18, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});