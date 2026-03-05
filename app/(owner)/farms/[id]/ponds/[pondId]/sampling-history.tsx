import { supabase } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function SamplingHistory() {
  const { pondId } = useLocalSearchParams();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("sampling_records")
      .select("*")
      .eq("pond_id", pondId)
      .order("created_at", { ascending: false });
    setHistory(data || []);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.historyCard}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>PESO PROMEDIO</Text>
          <Text style={styles.statValue}>{item.average_weight_g} g</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>ALIMENTO ETAPA</Text>
          <Text style={[styles.statValue, { color: "#0284C7" }]}>
            {item.feed_consumed_since_last_sampling} kg
          </Text>
        </View>
      </View>

      {item.notes && <Text style={styles.notesText}>📝 {item.notes}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial de Crecimiento</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingTop: 60 },
  title: { fontSize: 22, fontWeight: "bold", marginLeft: 20, color: "#0F172A" },
  historyCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },
  dateBadge: {
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 15,
  },
  dateText: { fontSize: 12, fontWeight: "bold", color: "#64748B" },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1 },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "bold",
    marginBottom: 5,
  },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  notesText: {
    marginTop: 15,
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
});
