import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- SOLUCIÓN PARA EXPO SDK 54: Usamos la API Legacy ---
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";

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

export default function AnalyticsReportsScreen() {
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const defaultStart = useMemo(() => {
    const d = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [generatingCSV, setGeneratingCSV] = useState(false);
  const [loading, setLoading] = useState(true);

  const [farmId, setFarmId] = useState<string>("");
  const [pondId, setPondId] = useState<string>("");
  const [pondName, setPondName] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);
  const [availableFarms, setAvailableFarms] = useState<any[]>([]);

  const [stats, setStats] = useState({
    avgWeight: 0,
    tasksEfficiency: 0,
    totalStock: 0,
    recentDaily: [] as any[],
    chartData: [] as any[],
    inventoryList: [] as any[],
  });

  const loadDefaultFarm = useCallback(async () => {
    try {
      const { data: farms } = await supabase
        .from("farms")
        .select("id, name, created_at")
        .order("created_at", { ascending: true })
        .limit(5);

      if (farms) {
        setAvailableFarms(farms);
        if (!farmId && farms.length > 0) {
          setFarmId(String(farms[0].id));
        }
      }
    } catch (error) {
      console.error("Error cargando fincas:", error);
    }
  }, [farmId]);

  const fetchPondsDaily = useCallback(async () => {
    if (!farmId) return [];

    let query = supabase
      .from("ponds_daily")
      .select(
        "pond_id, pond_name, farm_id, date, feed_kg, mortality, avg_weight_g, biomass_kg",
      )
      .eq("farm_id", farmId);

    if (pondId.trim()) {
      query = query.eq("pond_id", pondId.trim());
    }
    if (pondName.trim()) {
      query = query.eq("pond_name", pondName.trim());
    }
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query.order("date", { ascending: true });
    if (error) {
      throw error;
    }
    return data || [];
  }, [farmId, pondId, startDate, endDate]);

  const fetchAnalyticsData = useCallback(async () => {
    if (!farmId) return;
    try {
      setLoading(true);

      const daily = await fetchPondsDaily();
      const recentDaily = daily.slice(-10).reverse();

      const { data: tasks } = await supabase.from("tasks").select("status");
      const totalTasks = tasks?.length || 0;
      const completed =
        tasks?.filter((t) => t.status === "completada").length || 0;
      const efficiency =
        totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

      const { data: inv } = await supabase.from("inventory").select("*");
      const stock =
        inv?.reduce((acc, curr) => acc + (Number(curr.stock_actual) || 0), 0) ||
        0;

      const formattedChart = (recentDaily || [])
        .slice(0, 6)
        .reverse()
        .map((s) => ({
          label: new Date(s.date).toLocaleDateString("es", {
            month: "short",
          }),
          value: s.avg_weight_g || 0,
          max: Math.max(s.avg_weight_g || 0, 500),
        }));

      setStats({
        avgWeight: recentDaily?.[0]?.avg_weight_g || 0,
        tasksEfficiency: efficiency,
        totalStock: stock,
        recentDaily: recentDaily || [],
        inventoryList: inv || [],
        chartData:
          formattedChart.length > 0
            ? formattedChart
            : [{ label: "N/A", value: 0, max: 100 }],
      });
    } catch (error) {
      console.error("Error cargando analítica:", error);
    } finally {
      setLoading(false);
    }
  }, [farmId, fetchPondsDaily]);

  useEffect(() => {
    loadDefaultFarm();
  }, [loadDefaultFarm]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const exportPondsDailyToExcel = async () => {
    const data = await fetchPondsDaily();
    if (!data.length) {
      throw new Error("No hay datos para exportar con los filtros actuales.");
    }

    const dailySheet = data.map((s) => ({
      Fecha: new Date(s.date).toLocaleDateString(),
      Estanque: s.pond_name || s.pond_id,
      Finca: s.farm_id,
      "Alimento (kg)": s.feed_kg ?? 0,
      Mortalidad: s.mortality ?? 0,
      "Peso Promedio (g)": s.avg_weight_g ?? 0,
      "Biomasa (kg)": s.biomass_kg ?? 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(dailySheet);
    XLSX.utils.book_append_sheet(wb, ws1, "Diario");

    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const uri = `${FileSystem.cacheDirectory}AquaViva_PondsDaily_${Date.now()}.xlsx`;

    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(uri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Enviar Reporte Excel",
    });
  };

  const exportPondsDailyToCSV = async () => {
    const data = await fetchPondsDaily();
    if (!data.length) {
      throw new Error("No hay datos para exportar con los filtros actuales.");
    }

    const header = [
      "date",
      "pond_id",
      "pond_name",
      "farm_id",
      "feed_kg",
      "mortality",
      "avg_weight_g",
      "biomass_kg",
    ];

    const rows = data.map((row) =>
      [
        row.date,
        row.pond_id,
        row.pond_name,
        row.farm_id,
        row.feed_kg ?? 0,
        row.mortality ?? 0,
        row.avg_weight_g ?? 0,
        row.biomass_kg ?? 0,
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );

    const csvContent = [header.join(","), ...rows].join("\n");
    const uri = `${FileSystem.cacheDirectory}AquaViva_PondsDaily_${Date.now()}.csv`;

    await FileSystem.writeAsStringAsync(uri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(uri, {
      mimeType: "text/csv",
      dialogTitle: "Enviar Reporte CSV",
    });
  };

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const htmlContent = `
        <html>
          <body style="font-family: Arial; padding: 40px;">
            <h1 style="color: #003366;">AquaViva Manager - Informe Ejecutivo</h1>
            <p>Fecha: ${new Date().toLocaleDateString()}</p>
            <hr/>
            <h3>Resumen Operativo</h3>
            <ul>
              <li><strong>Eficiencia de Tareas:</strong> ${stats.tasksEfficiency}%</li>
              <li><strong>Peso Promedio Actual:</strong> ${stats.avgWeight}g</li>
              <li><strong>Inventario Total:</strong> ${stats.totalStock}kg</li>
            </ul>
            <h3>Historial Diario</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #F1F5F9;">
                <th style="border: 1px solid #ddd; padding: 8px;">Fecha</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Estanque</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Peso (g)</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Alimento (kg)</th>
              </tr>
              ${stats.recentDaily
                .map(
                  (s) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(s.date).toLocaleDateString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${s.pond_name || s.pond_id}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${s.avg_weight_g ?? 0}g</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${s.feed_kg ?? 0}kg</td>
                </tr>
              `,
                )
                .join("")}
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    setGeneratingExcel(true);
    try {
      await exportPondsDailyToExcel();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo generar el Excel");
    } finally {
      setGeneratingExcel(false);
    }
  };

  const handleDownloadCSV = async () => {
    setGeneratingCSV(true);
    try {
      await exportPondsDailyToCSV();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo generar el CSV");
    } finally {
      setGeneratingCSV(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ textAlign: "center", marginTop: 10, color: "#64748b" }}>
          Calculando métricas...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Analítica y Descargas</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.filtersCard}>
          <Text style={styles.sectionLabel}>Filtros de exportación</Text>
          <Text style={styles.filterLabel}>Finca (farm_id) *</Text>
          <TextInput
            style={styles.input}
            placeholder="UUID de la finca"
            value={farmId}
            onChangeText={setFarmId}
            autoCapitalize="none"
          />
          {availableFarms.length > 0 && (
            <View style={styles.chipRow}>
              {availableFarms.map((farm) => (
                <TouchableOpacity
                  key={farm.id}
                  style={[
                    styles.chip,
                    farmId === String(farm.id) && styles.chipActive,
                  ]}
                  onPress={() => setFarmId(String(farm.id))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      farmId === String(farm.id) && styles.chipTextActive,
                    ]}
                  >
                    {farm.name || farm.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.filterLabel}>Estanque (pond_id)</Text>
          <TextInput
            style={styles.input}
            placeholder="Opcional"
            value={pondId}
            onChangeText={setPondId}
            autoCapitalize="none"
          />

          <View style={styles.dateRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.filterLabel}>Desde (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.filterLabel}>Hasta (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                autoCapitalize="none"
              />
            </View>
          </View>
          <Text style={styles.helperText}>
            La consulta usa ponds_daily con farm_id obligatorio, pond_id
            opcional y rango de fechas, ordenado por fecha ascendente.
          </Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Eficiencia</Text>
            <Text style={styles.kpiValue}>{stats.tasksEfficiency}%</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Peso Prom.</Text>
            <Text style={styles.kpiValue}>{stats.avgWeight}g</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Crecimiento Biomasa (g)</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartArea}>
            {stats.chartData.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${(item.value / item.max) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Exportación de Documentos</Text>

        <TouchableOpacity
          style={styles.exportCard}
          onPress={handleDownloadPDF}
          disabled={generatingPDF || generatingExcel || generatingCSV}
        >
          <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="document-text" size={28} color="#EF4444" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Informe Ejecutivo (PDF)</Text>
            <Text style={styles.exportSub}>
              Datos diarios consolidados de biomasa y eficiencia operativa.
            </Text>
          </View>
          {generatingPDF ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Ionicons name="download-outline" size={24} color="#64748B" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportCard}
          onPress={handleDownloadExcel}
          disabled={generatingPDF || generatingExcel || generatingCSV}
        >
          <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="grid" size={28} color="#10B981" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Histórico Operativo (Excel)</Text>
            <Text style={styles.exportSub}>
              Datos diarios por estanque desde ponds_daily.
            </Text>
          </View>
          {generatingExcel ? (
            <ActivityIndicator color="#10B981" />
          ) : (
            <Ionicons name="download-outline" size={24} color="#64748B" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportCard}
          onPress={handleDownloadCSV}
          disabled={generatingPDF || generatingExcel || generatingCSV}
        >
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="document-attach" size={28} color="#2563EB" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Histórico Operativo (CSV)</Text>
            <Text style={styles.exportSub}>
              Mismo filtrado, formato liviano para hojas de cálculo.
            </Text>
          </View>
          {generatingCSV ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Ionicons name="download-outline" size={24} color="#64748B" />
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#0F172A" },
  scrollContent: { padding: 20 },
  filtersCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
  },
  helperText: { fontSize: 12, color: "#94A3B8", marginTop: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 15,
    marginTop: 10,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  kpiBox: {
    backgroundColor: "white",
    width: "48%",
    padding: 15,
    borderRadius: 15,
    elevation: 2,
    alignItems: "center",
  },
  kpiLabel: { fontSize: 12, color: "#64748B", fontWeight: "bold" },
  kpiValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0066CC",
    marginTop: 5,
  },
  chartCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
  },
  chartArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 160,
    paddingHorizontal: 10,
  },
  dateRow: { flexDirection: "row", marginTop: 8 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginTop: 4,
  },
  chipActive: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
  chipText: { fontSize: 12, color: "#475569" },
  chipTextActive: { color: "#1D4ED8", fontWeight: "700" },
  barContainer: { alignItems: "center", width: 40 },
  barBackground: {
    width: 14,
    height: 120,
    backgroundColor: "#F1F5F9",
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", backgroundColor: "#0066CC", borderRadius: 7 },
  barLabel: { marginTop: 10, fontSize: 10, color: "#64748B" },
  exportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    elevation: 1,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  exportSub: { fontSize: 12, color: "#64748B" },
});
