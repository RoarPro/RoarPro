import { db } from "@/lib/localDb";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type InventoryItem = {
  id: string;
  farm_id: string;
  item_name: string;
  stock_actual: number;
  unit: string;
  is_satellite: boolean | number;
};

type GroupedInventoryItem = InventoryItem & {
  insumoName: string;
};

type InventoryGroup = {
  bodegaName: string;
  is_satellite: boolean;
  items: GroupedInventoryItem[];
};

export default function InventoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const farmId = useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos de formulario
  const [bodegaName, setBodegaName] = useState("");
  const [insumoName, setInsumoName] = useState("");
  const [kgQuantity, setKgQuantity] = useState("");
  const [bultosQuantity, setBultosQuantity] = useState("");
  const [isSatellite, setIsSatellite] = useState(false);

  const PESO_BULTO = 40;
  const parseNumber = (value: string) => Number.parseFloat(value);
  const isInvalidNumber = (value: string) => {
    const parsed = parseNumber(value);
    return Number.isNaN(parsed) || parsed <= 0;
  };
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Error desconocido";

  // --- NUEVA LÓGICA DE AGRUPACIÓN ---
  // Agrupamos el inventario plano en un objeto estructurado por Bodegas
  const groupedInventory = useMemo(() => {
    const groups: Record<string, InventoryGroup> = {};

    inventory.forEach((item) => {
      // Separamos "Bodega - Producto"
      const parts = item.item_name.split(" - ");
      const bodega = parts[0]?.trim() || "Sin Bodega";
      const insumo = parts[1]?.trim() || item.item_name;

      // Si la bodega no existe en nuestro grupo, la creamos
      if (!groups[bodega]) {
        groups[bodega] = {
          bodegaName: bodega,
          is_satellite: Boolean(item.is_satellite),
          items: [],
        };
      }

      // Metemos el producto dentro de su bodega
      groups[bodega].items.push({
        ...item,
        insumoName: insumo,
      });
    });

    // Convertimos el objeto en un array para el FlatList
    return Object.values(groups).sort((a, b) => {
      // Ordenamos: Principales primero, Satélites después
      if (a.is_satellite === b.is_satellite)
        return a.bodegaName.localeCompare(b.bodegaName);
      return a.is_satellite ? 1 : -1;
    });
  }, [inventory]);

  // Lógica de conversión de peso
  const handleKgChange = (val: string) => {
    const text = val.replace(",", ".");
    setKgQuantity(text);
    if (text === "" || Number.isNaN(parseNumber(text))) {
      setBultosQuantity("");
    } else {
      const bultos = parseNumber(text) / PESO_BULTO;
      setBultosQuantity(
        bultos % 1 === 0 ? bultos.toString() : bultos.toFixed(2),
      );
    }
  };

  const handleBultosChange = (val: string) => {
    const text = val.replace(",", ".");
    setBultosQuantity(text);
    if (text === "" || Number.isNaN(parseNumber(text))) {
      setKgQuantity("");
    } else {
      const kg = parseNumber(text) * PESO_BULTO;
      setKgQuantity(kg.toString());
    }
  };

  // Carga de datos local (SQLite)
  const loadFromLocal = useCallback(() => {
    if (!farmId) {
      setLoading(false);
      return;
    }
    try {
      const localRows = db.getAllSync(
        `SELECT * FROM local_inventory WHERE farm_id = ? ORDER BY item_name ASC`,
        [farmId],
      );
      const normalizedRows = localRows as InventoryItem[];
      setInventory(
        normalizedRows.map((item) => ({
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

  // Sincronización con Supabase (Nube a Local)
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
      console.log("Modo offline activo o error de red.");
    } finally {
      setRefreshing(false);
    }
  }, [farmId, loadFromLocal]);

  useEffect(() => {
    loadFromLocal();
    syncData();
  }, [loadFromLocal, syncData]);

  // Guardar Item (Crear, Sumar o Actualizar)
  const handleSaveItem = async () => {
    if (!bodegaName.trim() || !insumoName.trim() || !kgQuantity || !farmId) {
      Alert.alert(
        "Campos incompletos",
        "Bodega, Insumo y Cantidad son necesarios.",
      );
      return;
    }
    if (isInvalidNumber(kgQuantity)) {
      Alert.alert("Cantidad inválida", "Ingresa una cantidad mayor que 0.");
      return;
    }

    const fullName = `${bodegaName.trim()} - ${insumoName.trim()}`;
    const stockNum = parseNumber(kgQuantity);

    try {
      let officialId = editingId;
      let finalStock = stockNum;
      let isAddition = false;

      if (editingId) {
        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            item_name: fullName,
            stock_actual: stockNum,
            unit: "kg",
            is_satellite: isSatellite,
          })
          .eq("id", editingId);

        if (updateError) throw updateError;
      } else {
        const { data: existingItem, error: searchError } = await supabase
          .from("inventory")
          .select("id, stock_actual")
          .eq("farm_id", farmId)
          .eq("item_name", fullName)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingItem) {
          finalStock = existingItem.stock_actual + stockNum;
          officialId = existingItem.id;
          isAddition = true;

          const { error: updateError } = await supabase
            .from("inventory")
            .update({
              stock_actual: finalStock,
            })
            .eq("id", officialId);

          if (updateError) throw updateError;
        } else {
          const { data: newItems, error: insertError } = await supabase
            .from("inventory")
            .insert([
              {
                farm_id: farmId,
                item_name: fullName,
                stock_actual: stockNum,
                unit: "kg",
                is_satellite: isSatellite,
              },
            ])
            .select();

          if (insertError) throw insertError;
          officialId = newItems[0].id;
        }
      }

      db.runSync(
        `INSERT OR REPLACE INTO local_inventory (id, farm_id, item_name, stock_actual, unit, is_satellite) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          officialId,
          farmId,
          fullName,
          finalStock,
          "kg",
          isSatellite ? 1 : 0,
        ],
      );

      loadFromLocal();
      setModalVisible(false);
      resetForm();

      if (editingId) {
        Alert.alert("¡Éxito!", "Insumo editado correctamente.");
      } else if (isAddition) {
        Alert.alert(
          "¡Stock Actualizado!",
          `Se sumaron los kilos a: ${fullName}`,
        );
      } else {
        Alert.alert("¡Éxito!", "Nuevo insumo guardado en la bodega.");
      }
    } catch (err: unknown) {
      console.error("Error al guardar:", getErrorMessage(err));
      Alert.alert("Error de red", "No se pudo sincronizar con la nube.");
    }
  };

  const handleDeleteItem = () => {
    if (!editingId) return;

    Alert.alert(
      "Eliminar Insumo",
      "¿Estás seguro de que deseas eliminar este insumo? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error: deleteError } = await supabase
                .from("inventory")
                .delete()
                .eq("id", editingId);

              if (
                deleteError &&
                !deleteError.message.includes(
                  "invalid input syntax for type uuid",
                )
              ) {
                throw deleteError;
              }

              db.runSync(`DELETE FROM local_inventory WHERE id = ?`, [
                editingId,
              ]);

              loadFromLocal();
              setModalVisible(false);
              resetForm();

              Alert.alert(
                "Eliminado",
                "El insumo ha sido retirado del inventario.",
              );
            } catch (err: unknown) {
              console.error("Error al eliminar:", getErrorMessage(err));
              Alert.alert("Error", "No se pudo eliminar el insumo.");
            }
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setBodegaName("");
    setInsumoName("");
    setKgQuantity("");
    setBultosQuantity("");
    setIsSatellite(false);
  };

  // Función para abrir el modal al tocar un producto específico
  const handleEditProduct = (bodega: string, product: GroupedInventoryItem) => {
    setEditingId(product.id);
    setBodegaName(bodega);
    setInsumoName(product.insumoName);
    handleKgChange(product.stock_actual.toString());
    setIsSatellite(!!product.is_satellite);
    setModalVisible(true);
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

      <FlatList<InventoryGroup>
        data={groupedInventory}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        keyExtractor={(item) => item.bodegaName}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Cabecera de la Bodega */}
            <View style={styles.bodegaHeader}>
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
                <Text style={styles.bodegaName}>{item.bodegaName}</Text>
                <Text style={styles.bodegaType}>
                  {item.is_satellite ? "Bodega Satélite" : "Bodega Principal"}
                </Text>
              </View>
            </View>

            {/* Lista de Productos dentro de esta Bodega */}
            <View style={styles.productsContainer}>
              {item.items.map((prod, index: number) => (
                <TouchableOpacity
                  key={prod.id}
                  style={[
                    styles.productRow,
                    index < item.items.length - 1 && styles.productDivider,
                  ]}
                  onPress={() => handleEditProduct(item.bodegaName, prod)}
                >
                  <Text style={styles.productName}>{prod.insumoName}</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.productStock}>
                      {prod.stock_actual} kg
                    </Text>
                    <Text style={styles.productBultos}>
                      {(prod.stock_actual / PESO_BULTO).toFixed(1)} bultos
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Editar Insumo" : "Nueva Entrada"}
              </Text>

              {editingId && (
                <TouchableOpacity
                  onPress={handleDeleteItem}
                  style={{ padding: 5 }}
                >
                  <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Nombre de la Bodega</Text>
            <TextInput
              style={styles.input}
              value={bodegaName}
              onChangeText={setBodegaName}
              placeholder="Ej: Bodega Principal"
            />

            <Text style={styles.label}>Insumo (Alimento)</Text>
            <TextInput
              style={styles.input}
              value={insumoName}
              onChangeText={setInsumoName}
              placeholder="Ej: Inicio 45%"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>
                  {editingId ? "Kilos exactos" : "Kilos a sumar"}
                </Text>
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
    marginBottom: 16,
    elevation: 2,
  },
  bodegaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  bodegaName: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  bodegaType: { fontSize: 13, color: "#64748B", marginTop: 2 },
  iconBox: { padding: 12, borderRadius: 15 },
  mainBg: { backgroundColor: "#DBEAFE" },
  satBg: { backgroundColor: "#D1FAE5" },

  // Estilos para la lista de productos dentro de la tarjeta
  productsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  productDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  productName: { fontSize: 15, fontWeight: "600", color: "#334155", flex: 1 },
  productStock: { fontSize: 15, fontWeight: "bold", color: "#0F172A" },
  productBultos: { fontSize: 12, color: "#94A3B8" },

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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
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
