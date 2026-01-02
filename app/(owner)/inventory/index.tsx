import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
    
    // Nuevos campos para Bodegas Satélite
    const [isSatellite, setIsSatellite] = useState(false);
    const [parentId, setParentId] = useState<string | null>(null);

    const fetchInventory = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("inventory")
                .select("*")
                .eq("farm_id", farmId)
                .order("is_satellite", { ascending: true }) // Globales primero
                .order("item_name", { ascending: true });

            if (error) throw error;
            setInventory(data || []);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    }, [farmId]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleSaveItem = async () => {
        if (!itemName || !quantity) {
            Alert.alert("Error", "El nombre y la cantidad son obligatorios");
            return;
        }

        try {
            const itemData = {
                farm_id: farmId,
                item_name: itemName,
                quantity: parseFloat(quantity),
                unit: unit,
                is_satellite: isSatellite,
                parent_id: isSatellite ? parentId : null, // Solo tiene padre si es satélite
            };

            if (editingId) {
                const { error } = await supabase
                    .from("inventory")
                    .update(itemData)
                    .eq("id", editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("inventory").insert([itemData]);
                if (error) throw error;
            }

            Alert.alert("¡Éxito!", editingId ? "Configuración actualizada" : "Registro exitoso");
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

    // Filtramos los productos que pueden ser "Padres" (Globales)
    const globalItems = inventory.filter(i => !i.is_satellite);

    const renderItemCard = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
            <View style={styles.cardInfo}>
                <View style={[styles.iconContainer, item.is_satellite && styles.satelliteIcon]}>
                    <Ionicons 
                        name={item.is_satellite ? "location" : "cube"} 
                        size={24} 
                        color={item.is_satellite ? "#38A169" : "#003366"} 
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName}>
                        {item.item_name} {item.is_satellite && "(Satélite)"}
                    </Text>
                    <Text style={styles.itemDate}>
                        Stock: {item.quantity} {item.unit}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
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
                <ActivityIndicator size="large" color="#003366" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={inventory}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItemCard}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay insumos registrados.</Text>}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingId ? "Editar Bodega" : "Nueva Bodega"}</Text>
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.label}>¿Es una Bodega Satélite?</Text>
                            <Switch value={isSatellite} onValueChange={setIsSatellite} />
                        </View>

                        <Text style={styles.label}>Nombre de la Bodega / Producto</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={isSatellite ? "Ej: Bodega La Vega" : "Ej: Alimento Engorde 25%"}
                            value={itemName}
                            onChangeText={setItemName}
                        />

                        {isSatellite && (
                            <View>
                                <Text style={styles.label}>Vincular a Producto Global</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={parentId}
                                        onValueChange={(val) => setParentId(val)}
                                    >
                                        <Picker.Item label="-- Seleccione Producto --" value={null} />
                                        {globalItems.map(g => (
                                            <Picker.Item key={g.id} label={g.item_name} value={g.id} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ width: '60%' }}>
                                <Text style={styles.label}>Cantidad Actual</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                />
                            </View>
                            <View style={{ width: '35%' }}>
                                <Text style={styles.label}>Unidad</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="kg"
                                    value={unit}
                                    onChangeText={setUnit}
                                />
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeModal}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveItem}>
                                <Text style={styles.saveButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F7FAFC" },
    header: { backgroundColor: "#003366", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
    listContent: { padding: 20 },
    card: { backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    cardInfo: { flexDirection: "row", alignItems: "center" },
    iconContainer: { backgroundColor: "#EDF2F7", padding: 10, borderRadius: 10 },
    satelliteIcon: { backgroundColor: "#C6F6D5" }, // Fondo verde para satélites
    itemName: { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
    itemDate: { fontSize: 14, color: "#718096", marginTop: 2 },
    fab: { position: "absolute", bottom: 30, right: 30, backgroundColor: "#003366", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
    emptyText: { textAlign: "center", marginTop: 50, color: "#718096" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalContent: { backgroundColor: "white", borderRadius: 20, padding: 25 },
    modalHeader: { marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: "bold", color: "#2D3748" },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: 10, backgroundColor: '#F7FAFC', borderRadius: 10 },
    label: { fontSize: 14, fontWeight: "bold", color: "#4A5568", marginBottom: 8 },
    input: { backgroundColor: "#F7FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15 },
    pickerWrapper: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, marginBottom: 15, backgroundColor: '#F7FAFC' },
    modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    modalButton: { flex: 0.48, paddingVertical: 15, borderRadius: 10, alignItems: "center" },
    cancelButton: { backgroundColor: "#EDF2F7" },
    saveButton: { backgroundColor: "#003366" },
    cancelButtonText: { color: "#4A5568", fontWeight: "bold" },
    saveButtonText: { color: "white", fontWeight: "bold" },
});