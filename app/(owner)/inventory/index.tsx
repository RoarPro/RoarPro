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
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function InventoryScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams();

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Campos del Formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [isSatellite, setIsSatellite] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!farmId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("farm_id", farmId)
        .order("is_satellite", { ascending: true }) 
        .order("item_name", { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      console.error("Error fetch:", error.message);
      Alert.alert("Error", "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSaveItem = async () => {
    if (!itemName.trim() || !quantity) {
      Alert.alert("Error", "El nombre y la cantidad son obligatorios");
      return;
    }

    try {
      const itemData = {
        farm_id: farmId,
        item_name: itemName.trim(),
        quantity: parseFloat(quantity) || 0,
        unit: unit.trim() || "kg",
        is_satellite: isSatellite,
        parent_id: isSatellite ? parentId : null, 
      };

      if (editingId) {
        const { error } = await supabase.from("inventory").update(itemData).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory").insert([itemData]);
        if (error) throw error;
      }

      Alert.alert("Éxito", "Registro guardado correctamente");
      closeModal();
      fetchInventory();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setItemName(item.item_name);
    setQuantity(item.quantity.toString());
    setUnit(item.unit);
    setIsSatellite(item.is_satellite || false);
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

  const globalItems = inventory.filter(i => !i.is_satellite);

  const renderItemCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
      <View style={styles.cardInfo}>
        <View style={[styles.iconContainer, item.is_satellite && styles.satelliteIcon]}>
          <Ionicons 
            name={item.is_satellite ? "location" : "business"} 
            size={24} 
            color={item.is_satellite ? "#38A169" : "#003366"} 
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.itemName}>
            {item.item_name} {item.is_satellite && "📍"}
          </Text>
          <Text style={styles.itemStock}>
            En existencia: {item.quantity} {item.unit}
          </Text>
          {item.is_satellite && (
            <Text style={styles.satelliteLabel}>Bodega Satélite vinculada</Text>
          )}
        </View>
        <Ionicons name="create-outline" size={20} color="#CBD5E0" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventario & Bodegas</Text>
        <TouchableOpacity onPress={fetchInventory}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#003366" />
        </View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id}
          renderItem={renderItemCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay bodegas registradas.</Text>}
        />
      )}

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.transferBtn} 
          onPress={() => router.push({ pathname: "/(owner)/inventory/transfer", params: { farmId } } as any)}
        >
          <Ionicons name="swap-horizontal" size={24} color="white" />
          <Text style={styles.btnText}>Transferir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.btnText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? "Editar Bodega" : "Nueva Bodega / Insumo"}</Text>

            <View style={styles.switchRow}>
              <Text style={styles.label}>¿Es una Bodega Satélite?</Text>
              <Switch value={isSatellite} onValueChange={setIsSatellite} />
            </View>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Concentrado Engorde"
              value={itemName}
              onChangeText={setItemName}
            />

            {isSatellite && (
              <>
                <Text style={styles.label}>Vincular a Insumo Global</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={parentId}
                    onValueChange={(val) => setParentId(val)}
                  >
                    <Picker.Item label="-- Seleccione Insumo --" value={null} />
                    {globalItems.map(g => (
                      <Picker.Item key={g.id} label={g.item_name} value={g.id} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '60%' }}>
                <Text style={styles.label}>Cantidad Actual</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ width: '35%' }}>
                <Text style={styles.label}>Unidad</Text>
                <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveItem}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7FAFC" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: "#003366", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  listContent: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: "white", borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 },
  cardInfo: { flexDirection: "row", alignItems: "center" },
  iconContainer: { backgroundColor: "#E6F0FA", padding: 10, borderRadius: 12 },
  satelliteIcon: { backgroundColor: "#C6F6D5" }, 
  itemName: { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
  itemStock: { fontSize: 14, color: "#718096" },
  satelliteLabel: { fontSize: 10, color: "#38A169", fontWeight: "bold", marginTop: 2 },
  actionContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  transferBtn: { flex: 0.48, backgroundColor: "#4A5568", height: 55, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  addBtn: { flex: 0.48, backgroundColor: "#003366", height: 55, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  emptyText: { textAlign: "center", marginTop: 50, color: "#718096" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "white", borderRadius: 25, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#2D3748", marginBottom: 20, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: 12, backgroundColor: '#F7FAFC', borderRadius: 12 },
  label: { fontSize: 12, fontWeight: "bold", color: "#4A5568", marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: "#F7FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 15 },
  pickerWrapper: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginBottom: 15, backgroundColor: '#F7FAFC', overflow: 'hidden' },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalBtn: { flex: 0.48, paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  cancelBtn: { backgroundColor: "#EDF2F7" },
  saveBtn: { backgroundColor: "#003366" },
  cancelText: { color: "#4A5568", fontWeight: "bold" },
  saveText: { color: "white", fontWeight: "bold" },
});