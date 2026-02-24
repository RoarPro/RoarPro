import { db } from "@/lib/localDb";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function InventoryScreen() {
  const router = useRouter();
  const { id: farmId } = useLocalSearchParams();

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Nuevos campos separados
  const [bodegaName, setBodegaName] = useState("");
  const [insumoName, setInsumoName] = useState("");

  const [kgQuantity, setKgQuantity] = useState("");
  const [bultosQuantity, setBultosQuantity] = useState("");
  const [isSatellite, setIsSatellite] = useState(false);

  const PESO_BULTO = 40;

  const handleKgChange = (val: string) => {
    const text = val.replace(",", ".");
    setKgQuantity(text);
    if (text === "" || isNaN(parseFloat(text))) {
      setBultosQuantity("");
    } else {
      const bultos = parseFloat(text) / PESO_BULTO;
      setBultosQuantity(
        bultos % 1 === 0 ? bultos.toString() : bultos.toFixed(2),
      );
    }
  };

  const handleBultosChange = (val: string) => {
    const text = val.replace(",", ".");
    setBultosQuantity(text);
    if (text === "" || isNaN(parseFloat(text))) {
      setKgQuantity("");
    } else {
      const kg = parseFloat(text) * PESO_BULTO;
      setKgQuantity(kg.toString());
    }
  };

  const loadFromLocal = useCallback(() => {
    if (!farmId) return;
    try {
      const localRows = db.getAllSync(
        `SELECT * FROM local_inventory WHERE farm_id = ? ORDER BY is_satellite ASC, item_name ASC`,
        [String(farmId)],
      );
      setInventory(
        localRows.map((item: any) => ({
          ...item,
          is_satellite: Boolean(item.is_satellite),
        })),
      );
    } catch (error) {
      console.error("Error local:", error);
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  const syncData = useCallback(async () => {
    if (!farmId) return;
    try {
      const { data, error: syncError } = await supabase
        .from("inventory")
        .select("*")
        .eq("farm_id", farmId);

      if (syncError) throw syncError;

      if (data) {
        db.withTransactionSync(() => {
          data.forEach((item) => {
            db.runSync(
              `INSERT OR REPLACE INTO local_inventory (id, farm_id, item_name, stock_actual, unit, is_satellite) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                item.id,
                item.farm_id,
                item.item_name,
                item.stock_actual,
                item.unit,
                item.is_satellite ? 1 : 0,
              ],
            );
          });
        });
        loadFromLocal();
      }
    } catch {
      console.log("Offline mode activo.");
    } finally {
      setRefreshing(false);
    }
  }, [farmId, loadFromLocal]);

  useEffect(() => {
    loadFromLocal();
    syncData();
  }, [loadFromLocal, syncData]);

  const handleSaveItem = async () => {
    if (!bodegaName.trim() || !insumoName.trim() || !kgQuantity) {
      Alert.alert(
        "Campos incompletos",
        "Bodega, Insumo y Cantidad son necesarios.",
      );
      return;
    }

    // Unimos los nombres para guardarlos en item_name
    const fullName = `${bodegaName.trim()} - ${insumoName.trim()}`;
    const stockNum = parseFloat(kgQuantity);
    const finalId = editingId || Math.random().toString(36).substring(2, 15);

    try {
      db.runSync(
        `INSERT OR REPLACE INTO local_inventory (id, farm_id, item_name, stock_actual, unit, is_satellite) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          finalId,
          String(farmId),
          fullName,
          stockNum,
          "kg",
          isSatellite ? 1 : 0,
        ],
      );

      loadFromLocal();
      setModalVisible(false);
      resetForm();

      await supabase.from("inventory").upsert([
        {
          id: finalId,
          farm_id: farmId,
          item_name: fullName,
          stock_actual: stockNum,
          unit: "kg",
          is_satellite: isSatellite,
        },
      ]);
    } catch {
      console.log("Guardado local exitoso.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setBodegaName("");
    setInsumoName("");
    setKgQuantity("");
    setBultosQuantity("");
    setIsSatellite(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventario (40kg/Bulto)</Text>
        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            syncData();
          }}
        >
          <Ionicons name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={inventory}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setEditingId(item.id);
              // Intentamos separar el nombre si contiene el guión
              const parts = item.item_name.split(" - ");
              setBodegaName(parts[0] || "");
              setInsumoName(parts[1] || "");
              handleKgChange(item.stock_actual.toString());
              setIsSatellite(!!item.is_satellite);
              setModalVisible(true);
            }}
          >
            <View style={styles.cardRow}>
              <View
                style={[
                  styles.iconBox,
                  item.is_satellite ? styles.satBg : styles.mainBg,
                ]}
              >
                <Ionicons
                  name={item.is_satellite ? "cube" : "business"}
                  size={24}
                  color={item.is_satellite ? "#059669" : "#1E40AF"}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.stockText}>
                  {item.stock_actual} kg{" "}
                  <Text style={{ color: "#94A3B8" }}>
                    — {(item.stock_actual / PESO_BULTO).toFixed(1)} bultos
                  </Text>
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={syncData} />
        }
        ListEmptyComponent={
          <View style={{ marginTop: 50, alignItems: "center" }}>
            <Text style={{ color: "#64748B" }}>
              {loading ? "Buscando datos..." : "No hay insumos registrados."}
            </Text>
          </View>
        }
      />

      {/* BOTONES DE ACCIÓN INFERIORES */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#475569" }]}
          onPress={() =>
            router.push({
              pathname: "/inventory/transfer",
              params: { id: farmId },
            } as any)
          }
        >
          <Ionicons name="swap-horizontal" size={24} color="white" />
          <Text style={styles.actionBtnText}>Transferir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#003366" }]}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.actionBtnText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modal}
          >
            <Text style={styles.modalTitle}>
              {editingId ? "Editar Bodega" : "Nueva Bodega"}
            </Text>

            <Text style={styles.label}>Nombre de la Bodega</Text>
            <TextInput
              style={styles.input}
              value={bodegaName}
              onChangeText={setBodegaName}
              placeholder="Ej: Bodega Norte"
            />

            <Text style={styles.label}>Insumo (Alimento)</Text>
            <TextInput
              style={styles.input}
              value={insumoName}
              onChangeText={setInsumoName}
              placeholder="Ej: Engorde 40%"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Kilos</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={kgQuantity}
                  onChangeText={handleKgChange}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Bultos</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={bultosQuantity}
                  onChangeText={handleBultosChange}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>¿Es Bodega Satélite?</Text>
              <Switch value={isSatellite} onValueChange={setIsSatellite} />
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSec]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPri]}
                onPress={handleSaveItem}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    backgroundColor: "#003366",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  iconBox: { padding: 12, borderRadius: 15 },
  mainBg: { backgroundColor: "#DBEAFE" },
  satBg: { backgroundColor: "#D1FAE5" },
  itemName: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  stockText: { fontSize: 14, color: "#64748B" },
  bottomActions: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 0.48,
    height: 55,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  actionBtnText: { color: "white", fontWeight: "bold", marginLeft: 10 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modal: { backgroundColor: "white", borderRadius: 25, padding: 25 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingRight: 5,
  },
  btn: { flex: 0.48, padding: 15, borderRadius: 12, alignItems: "center" },
  btnPri: { backgroundColor: "#003366" },
  btnSec: { backgroundColor: "#E2E8F0" },
});
