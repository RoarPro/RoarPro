import { db } from "@/lib/localDb";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

  // Campos del Formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [isSatellite, setIsSatellite] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);

  // ---------------------------------------------------------
  // 1. FUNCIÓN PURA: SOLO LEER DE LOCAL
  // ---------------------------------------------------------
  const loadFromLocal = useCallback(() => {
    if (!farmId) return;
    try {
      const localRows = db.getAllSync(
        `SELECT * FROM local_inventory WHERE farm_id = ? ORDER BY is_satellite ASC, item_name ASC`,
        [String(farmId)],
      );

      const formattedLocal = localRows.map((item: any) => ({
        ...item,
        is_satellite: Boolean(item.is_satellite),
      }));

      setInventory(formattedLocal);
    } catch (error) {
      console.error("Error leyendo local:", error);
    }
  }, [farmId]);

  // ---------------------------------------------------------
  // 2. SINCRONIZACIÓN: NUBE -> LOCAL -> REFRESCO
  // ---------------------------------------------------------
  const syncData = useCallback(async () => {
    if (!farmId) return;
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("farm_id", farmId);

      if (!error && data) {
        // Escribimos en SQLite (SIN borrar lo que ya hay, solo actualizando)
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

        // ¡IMPORTANTE! Una vez actualizado SQLite, volvemos a leer de ahí
        loadFromLocal();
      }
    } catch (error) {
      console.log("Error sincronizando (usando data local):", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId, loadFromLocal]);

  // Al cargar, leemos local y luego intentamos sincronizar
  useEffect(() => {
    loadFromLocal(); // Carga instantánea
    syncData(); // Actualización silenciosa
  }, [loadFromLocal, syncData]);

  const onRefresh = () => {
    setRefreshing(true);
    syncData();
  };

  // ---------------------------------------------------------
  // 3. GUARDADO (IGUAL QUE ANTES)
  // ---------------------------------------------------------
  const handleSaveItem = async () => {
    if (!itemName.trim() || !quantity) {
      Alert.alert("Error", "El nombre y la cantidad son obligatorios");
      return;
    }

    try {
      const stockNum = parseFloat(quantity.replace(",", "."));
      const tempId =
        editingId ||
        Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);

      // A. GUARDAR EN SQLITE (Esto es lo que verás inmediatamente)
      db.runSync(
        `INSERT OR REPLACE INTO local_inventory (id, farm_id, item_name, stock_actual, unit, is_satellite) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tempId,
          String(farmId),
          itemName.trim(),
          stockNum,
          unit.trim() || "kg",
          isSatellite ? 1 : 0,
        ],
      );

      Alert.alert("Éxito", "Guardado en el dispositivo");
      closeModal();

      // RECARGAMOS LA VISTA DESDE LOCAL INMEDIATAMENTE
      loadFromLocal();

      // B. ENVIAR A NUBE (Segundo plano)
      const itemData = {
        id: tempId,
        farm_id: farmId,
        item_name: itemName.trim(),
        stock_actual: stockNum,
        unit: unit.trim() || "kg",
        is_satellite: isSatellite,
        parent_id: isSatellite ? parentId : null,
      };

      const { error } = await supabase.from("inventory").upsert([itemData]);
      if (error) console.log("Pendiente subir a nube:", error.message);
    } catch (error: any) {
      Alert.alert("Error Local", error.message);
    }
  };

  // ... (El resto de tus funciones auxiliares y renderizado se mantienen igual)
  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setItemName(item.item_name);
    setQuantity(item.stock_actual.toString());
    setUnit(item.unit);
    setIsSatellite(!!item.is_satellite);
    setParentId(item.parent_id || null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setItemName("");
    setQuantity("");
    setUnit("kg");
    setIsSatellite(false);
    setParentId(null);
  };

  const globalItems = inventory.filter((i) => !i.is_satellite);

  const renderItemCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View
          style={[
            styles.iconContainer,
            item.is_satellite ? styles.satelliteIcon : styles.mainIcon,
          ]}
        >
          <Ionicons
            name={item.is_satellite ? "location" : "business"}
            size={22}
            color={item.is_satellite ? "#059669" : "#1E40AF"}
          />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.item_name}
          </Text>
          <Text style={styles.itemStock}>
            Saldo:{" "}
            <Text style={styles.boldText}>
              {item.stock_actual} {item.unit}
            </Text>
          </Text>
          {Boolean(item.is_satellite) && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Bodega Satélite</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Bodegas</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing && inventory.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#003366" />
          <Text style={styles.loadingText}>Cargando inventario...</Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id}
          renderItem={renderItemCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#003366"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color="#CBD5E0" />
              <Text style={styles.emptyText}>No hay bodegas locales.</Text>
            </View>
          }
        />
      )}

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.transferBtn}
          onPress={() =>
            router.push({
              pathname: "/inventory/transfer",
              params: { id: farmId },
            } as any)
          }
        >
          <Ionicons name="swap-horizontal" size={22} color="white" />
          <Text style={styles.btnText}>Transferir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={26} color="white" />
          <Text style={styles.btnText}>Nueva Bodega</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>
              {editingId ? "Actualizar Datos" : "Nueva Bodega / Insumo"}
            </Text>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Tipo Satélite</Text>
                <Text style={styles.switchSub}>
                  Para uso directo en estanque
                </Text>
              </View>
              <Switch
                value={isSatellite}
                onValueChange={setIsSatellite}
                trackColor={{ false: "#CBD5E0", true: "#93C5FD" }}
                thumbColor={isSatellite ? "#1E40AF" : "#F4F4F5"}
              />
            </View>

            <Text style={styles.label}>Nombre de la Bodega</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Bodega Norte 01"
              value={itemName}
              onChangeText={setItemName}
            />

            {isSatellite && (
              <>
                <Text style={styles.label}>Vincular a Insumo Principal</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={parentId}
                    onValueChange={(val) => setParentId(val)}
                  >
                    <Picker.Item label="-- Seleccione Origen --" value={null} />
                    {globalItems.map((g) => (
                      <Picker.Item
                        key={g.id}
                        label={g.item_name}
                        value={g.id}
                      />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Cantidad Inicial</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.label}>Unidad</Text>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={closeModal}
              >
                <Text style={styles.cancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveItem}
              >
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
// Los estilos se mantienen igual...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 14 },
  header: {
    backgroundColor: "#003366",
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "800" },
  backBtn: { padding: 5 },
  refreshBtn: { padding: 5 },
  listContent: { padding: 20, paddingBottom: 120 },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  iconContainer: { padding: 12, borderRadius: 15 },
  mainIcon: { backgroundColor: "#EBF8FF" },
  satelliteIcon: { backgroundColor: "#ECFDF5" },
  cardTextContainer: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  itemStock: { fontSize: 14, color: "#64748B", marginTop: 2 },
  boldText: { fontWeight: "800", color: "#0F172A" },
  tag: {
    backgroundColor: "#D1FAE5",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 5,
  },
  tagText: {
    fontSize: 10,
    color: "#065F46",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  actionContainer: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transferBtn: {
    flex: 0.48,
    backgroundColor: "#475569",
    height: 60,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  addBtn: {
    flex: 0.48,
    backgroundColor: "#003366",
    height: 60,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  btnText: { color: "white", fontWeight: "bold", marginLeft: 8, fontSize: 15 },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: {
    textAlign: "center",
    marginTop: 15,
    color: "#94A3B8",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 25,
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#F1F5F9",
    borderRadius: 15,
  },
  switchLabel: { fontSize: 14, fontWeight: "bold", color: "#1E293B" },
  switchSub: { fontSize: 12, color: "#64748B" },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    color: "#1E293B",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  modalBtn: {
    flex: 0.48,
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#F1F5F9" },
  saveBtn: { backgroundColor: "#003366" },
  cancelText: { color: "#64748B", fontWeight: "bold" },
  saveText: { color: "white", fontWeight: "bold" },
});
