import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
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
  View,
} from "react-native";

export default function SamplingScreen() {
  const { id: farmId, pondId } = useLocalSearchParams();
  const router = useRouter();

  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [consumptionLoading, setConsumptionLoading] = useState(true);
  const [consumptionInfo, setConsumptionInfo] = useState({
    total: 0,
    avg: 0,
    fromLabel: "",
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const calculateFeedBetweenSamplings = useCallback(async () => {
    const { data: lastSampling } = await supabase
      .from("sampling_records")
      .select("created_at")
      .eq("pond_id", pondId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let startDateIso: string | null = lastSampling?.created_at || null;
    let fromLabel = "Último muestreo";

    if (!startDateIso) {
      const { data: batch } = await supabase
        .from("fish_batches")
        .select("start_date")
        .eq("pond_id", pondId)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1)
        .single();

      startDateIso = batch?.start_date || todayStr;
      fromLabel = "Siembra inicial";
    }

    const startDateStr = new Date(startDateIso).toISOString().slice(0, 10);

    const { data: feedRows, error: feedError } = await supabase
      .from("ponds_daily")
      .select("feed_kg, date")
      .eq("pond_id", pondId)
      .gte("date", startDateStr)
      .lte("date", todayStr);

    if (feedError) throw feedError;

    const total =
      feedRows?.reduce((sum, row) => sum + (Number(row.feed_kg) || 0), 0) || 0;
    const uniqueDays = new Set(feedRows?.map((r) => r.date));
    const daysDivisor =
      uniqueDays.size > 0
        ? uniqueDays.size
        : Math.max(
            1,
            Math.ceil(
              (new Date(todayStr).getTime() -
                new Date(startDateStr).getTime()) /
                (24 * 60 * 60 * 1000),
            ) + 1,
          );
    const avg = total / daysDivisor;

    return { total, avg, fromLabel };
  }, [pondId, todayStr]);

  useEffect(() => {
    const loadConsumptionPreview = async () => {
      try {
        setConsumptionLoading(true);
        const info = await calculateFeedBetweenSamplings();
        setConsumptionInfo({
          total: Number(info.total.toFixed(2)),
          avg: Number(info.avg.toFixed(2)),
          fromLabel: info.fromLabel,
        });
      } catch (error) {
        console.error("Error calculando consumo entre muestreos:", error);
      } finally {
        setConsumptionLoading(false);
      }
    };
    loadConsumptionPreview();
  }, [calculateFeedBetweenSamplings]);

  const handleRecordSampling = async () => {
    if (!weight) return Alert.alert("Error", "Ingresa el peso promedio.");

    const weightNum = parseFloat(weight.replace(",", "."));
    setLoading(true);

    try {
      const { total, avg } = await calculateFeedBetweenSamplings();

      const { error: historyError } = await supabase
        .from("sampling_records")
        .insert({
          farm_id: farmId,
          pond_id: pondId,
          average_weight_g: weightNum,
          notes: notes.trim(),
          feed_consumed_since_last_sampling: total,
        });

      if (historyError) throw historyError;

      const { error: batchUpdateError } = await supabase
        .from("fish_batches")
        .update({
          average_weight_g: weightNum,
        })
        .eq("pond_id", pondId)
        .eq("status", "active");

      if (batchUpdateError) throw batchUpdateError;

      Alert.alert(
        "¡Éxito!",
        `Muestreo guardado.\nAlimento consumido en este periodo: ${total.toFixed(
          2,
        )} Kg.\nPromedio diario: ${avg.toFixed(2)} Kg/día.`,
      );
      setConsumptionInfo({
        total: Number(total.toFixed(2)),
        avg: Number(avg.toFixed(2)),
        fromLabel: consumptionInfo.fromLabel,
      });
      router.back();
    } catch (error: any) {
      Alert.alert("Error", "No se pudo sincronizar el pesaje.");
      console.error("Error en DB:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={28} color="#003366" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo Muestreo</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="git-commit-outline" size={40} color="#00C853" />
          </View>

          <Text style={styles.label}>Peso Promedio Actual (Gramos)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.weightInput}
              keyboardType="decimal-pad"
              placeholder="0.0"
              value={weight}
              onChangeText={setWeight}
              autoFocus
            />
            <Text style={styles.unitText}>g</Text>
          </View>

          <Text style={styles.label}>Notas u Observaciones (Opcional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Ej: Peces sanos, buena respuesta al alimento..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.consumptionCard}>
            <View style={styles.consumptionHeader}>
              <Ionicons name="fast-food-outline" size={20} color="#0EA5E9" />
              <Text style={styles.consumptionTitle}>
                Consumo entre muestreos
              </Text>
            </View>
            {consumptionLoading ? (
              <ActivityIndicator color="#0EA5E9" />
            ) : (
              <>
                <Text style={styles.consumptionLine}>
                  Total alimento consumido:{" "}
                  <Text style={styles.boldText}>
                    {consumptionInfo.total.toFixed(2)} kg
                  </Text>
                </Text>
                <Text style={styles.consumptionLine}>
                  Promedio diario:{" "}
                  <Text style={styles.boldText}>
                    {consumptionInfo.avg.toFixed(2)} kg/día
                  </Text>
                </Text>
                {consumptionInfo.fromLabel ? (
                  <Text style={styles.consumptionHelper}>
                    Desde: {consumptionInfo.fromLabel}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#059669"
            />
            <Text style={styles.infoText}>
              Este dato actualizará automáticamente el cálculo de biomasa y
              crecimiento en el panel del Owner.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRecordSampling}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>Confirmar Muestreo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#003366" },
  card: {
    backgroundColor: "white",
    margin: 20,
    padding: 25,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconContainer: {
    alignSelf: "center",
    backgroundColor: "#F0FDF4",
    padding: 20,
    borderRadius: 25,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 10,
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  weightInput: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#00C853",
    textAlign: "center",
  },
  unitText: {
    fontSize: 20,
    color: "#94A3B8",
    marginLeft: 8,
    marginTop: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 20,
    color: "#0F172A",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF3",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    color: "#166534",
    fontSize: 12,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#00C853",
    padding: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  consumptionCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  consumptionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  consumptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 6,
  },
  consumptionLine: { fontSize: 13, color: "#0F172A", marginTop: 6 },
  consumptionHelper: { fontSize: 12, color: "#475569", marginTop: 4 },
  boldText: { fontWeight: "bold", color: "#0F172A" },
});
