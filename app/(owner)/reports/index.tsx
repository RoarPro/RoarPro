import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";

// --- SOLUCIÓN PARA EXPO SDK 54: Usamos la API Legacy ---
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AnalyticsReportsScreen() {
  const router = useRouter();
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados para datos reales
  const [stats, setStats] = useState({
    avgWeight: 0,
    tasksEfficiency: 0,
    totalStock: 0,
    recentSamplings: [] as any[],
    chartData: [] as any[],
    inventoryList: [] as any[],
  });

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: samplings } = await supabase
        .from("sampling_records")
        .select("average_weight_g, created_at, ponds(name)")
        .order("created_at", { ascending: false })
        .limit(10);

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

      const formattedChart = (samplings || [])
        .slice(0, 6)
        .reverse()
        .map((s) => ({
          label: new Date(s.created_at).toLocaleDateString("es", {
            month: "short",
          }),
          value: s.average_weight_g,
          max: 500,
        }));

      setStats({
        avgWeight: samplings?.[0]?.average_weight_g || 0,
        tasksEfficiency: efficiency,
        totalStock: stock,
        recentSamplings: samplings || [],
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
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // --- 2. GENERACIÓN DE PDF ---
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
            <h3>Historial de Muestreos</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #F1F5F9;">
                <th style="border: 1px solid #ddd; padding: 8px;">Fecha</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Estanque</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Peso (g)</th>
              </tr>
              ${stats.recentSamplings
                .map(
                  (s) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(s.created_at).toLocaleDateString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${s.ponds?.name || "N/A"}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${s.average_weight_g}g</td>
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

  // --- 3. GENERACIÓN DE EXCEL REAL ---
  const handleDownloadExcel = async () => {
    setGeneratingExcel(true);
    try {
      const samplingsSheet = stats.recentSamplings.map((s) => ({
        Fecha: new Date(s.created_at).toLocaleDateString(),
        Estanque: s.ponds?.name || "N/A",
        "Peso Promedio (g)": s.average_weight_g,
      }));

      const inventorySheet = stats.inventoryList.map((i) => ({
        Insumo: i.item_name,
        Stock: i.stock_actual,
        Unidad: i.unit,
      }));

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(samplingsSheet);
      const ws2 = XLSX.utils.json_to_sheet(inventorySheet);
      XLSX.utils.book_append_sheet(wb, ws1, "Muestreos");
      XLSX.utils.book_append_sheet(wb, ws2, "Inventario");

      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      // Como usamos 'legacy', esto ya funciona perfecto de forma nativa
      const uri = `${FileSystem.cacheDirectory}AquaViva_Reporte_${Date.now()}.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Enviar Reporte Excel",
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo generar el Excel");
    } finally {
      setGeneratingExcel(false);
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
          disabled={generatingPDF || generatingExcel}
        >
          <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="document-text" size={28} color="#EF4444" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Informe Ejecutivo (PDF)</Text>
            <Text style={styles.exportSub}>
              Datos reales de biomasa y eficiencia operativa.
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
          disabled={generatingPDF || generatingExcel}
        >
          <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="grid" size={28} color="#10B981" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Histórico Operativo (Excel)</Text>
            <Text style={styles.exportSub}>
              Tabla detallada de inventario y muestreos.
            </Text>
          </View>
          {generatingExcel ? (
            <ActivityIndicator color="#10B981" />
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
