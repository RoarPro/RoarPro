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

  // Campos de formulario
  const [bodegaName, setBodegaName] = useState("");
  const [insumoName, setInsumoName] = useState("");
  const [kgQuantity, setKgQuantity] = useState("");
  const [bultosQuantity, setBultosQuantity] = useState("");
  const [isSatellite, setIsSatellite] = useState(false);

  const PESO_BULTO = 40;

  // Lógica de conversión de peso
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

  // Carga de datos local (SQLite)
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

  // Guardar Item (Crear o Actualizar)
  const handleSaveItem = async () => {
    if (!bodegaName.trim() || !insumoName.trim() || !kgQuantity || !farmId) {
      Alert.alert(
        "Campos incompletos",
        "Bodega, Insumo y Cantidad son necesarios.",
      );
      return;
    }

    const fullName = `${bodegaName.trim()} - ${insumoName.trim()}`;
    const stockNum = parseFloat(kgQuantity);

    try {
      let officialId = editingId;

      if (editingId) {
        // MODO EDICIÓN: Actualizamos en Supabase
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
        // MODO CREACIÓN: Insertamos nuevo en Supabase
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
        officialId = newItems[0].id; // Tomamos el nuevo ID generado
      }

      // GUARDADO LOCAL (Insert or Replace funciona para ambos casos)
      db.runSync(
        `INSERT OR REPLACE INTO local_inventory (id, farm_id, item_name, stock_actual, unit, is_satellite) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          officialId,
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

      Alert.alert(
        "¡Éxito!",
        editingId ? "Insumo actualizado." : "Insumo guardado correctamente.",
      );
    } catch (err: any) {
      console.error("Error al guardar:", err.message);
      Alert.alert("Error de red", "No se pudo sincronizar con la nube.");
    }
  };

  // Función para Eliminar con doble confirmación y limpieza de fantasmas
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
              // 1. Intentar borrar de la nube
              const { error: deleteError } = await supabase
                .from("inventory")
                .delete()
                .eq("id", editingId);

              // Si da error de UUID inválido, es un dato viejo de prueba. Lo ignoramos en la nube.
              if (
                deleteError &&
                !deleteError.message.includes(
                  "invalid input syntax for type uuid",
                )
              ) {
                throw deleteError; // Si es un error real de red, sí lo mostramos
              }

              // 2. Borrar localmente SIEMPRE (para limpiar tu pantalla)
              db.runSync(`DELETE FROM local_inventory WHERE id = ?`, [
                editingId,
              ]);

              // 3. Actualizar pantalla
              loadFromLocal();
              setModalVisible(false);
              resetForm();

              Alert.alert(
                "Eliminado",
                "El insumo ha sido retirado del inventario.",
              );
            } catch (err: any) {
              console.error("Error al eliminar:", err.message);
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
            {/* CABECERA DEL MODAL CON BOTÓN DE ELIMINAR OCULTO */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Editar Bodega" : "Nueva Bodega"}
              </Text>

              {/* Botón de papelera solo visible si se está editando */}
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
