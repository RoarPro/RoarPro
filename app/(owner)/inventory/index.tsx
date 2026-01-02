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
    
    // Bodegas Satélite
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
        // Validaciones Críticas
        if (!itemName.trim() || !quantity) {
            Alert.alert("Error", "El nombre y la cantidad son obligatorios");
            return;
        }

        if (!farmId) {
            Alert.alert("Error", "ID de finca no encontrado. Intente recargar.");
            return;
        }

        try {
            const parsedQuantity = parseFloat(quantity) || 0;
            
            // Construimos el objeto de datos
            const itemData: any = {
                farm_id: farmId,
                item_name: itemName.trim(),
                quantity: parsedQuantity,
                unit: unit.trim(),
                is_satellite: isSatellite,
                parent_id: isSatellite ? parentId : null, 
            };

            if (editingId) {
                // ACTUALIZAR EXISTENTE
                const { error } = await supabase
                    .from("inventory")
                    .update(itemData)
                    .eq("id", editingId);
                if (error) throw error;
            } else {
                // INSERTAR NUEVO (Aseguramos que sea una fila nueva)
                const { error } = await supabase
                    .from("inventory")
                    .insert([itemData]); // Pasamos como array para mayor seguridad
                if (error) throw error;
            }

            Alert.alert("¡Éxito!", editingId ? "Actualizado correctamente" : "Bodega creada con éxito");
            closeModal();
            fetchInventory();
        } catch (error: any) {
            console.error("Error guardando:", error.message);
            Alert.alert("Error", "No se pudo guardar la bodega. Verifique los datos.");
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

    // Solo los ítems que NO son satélites pueden ser "Padres" (Productos Globales)
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
                    <Text style={styles.itemDate}>
                        Stock: {item.quantity} {item.unit}
                    </Text>
                    {item.is_satellite && (
                        <Text style={{fontSize: 10, color: '#38A169'}}>Bodega Satélite</Text>
                    )}
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
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#003366" />
                </View>
            ) : (
                <FlatList
                    data={inventory}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItemCard}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay bodegas o insumos registrados.</Text>}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingId ? "Editar Configuración" : "Añadir Bodega"}</Text>
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.label}>¿Es una Bodega Satélite?</Text>
                            <Switch value={isSatellite} onValueChange={setIsSatellite} />
                        </View>

                        <Text style={styles.label}>Nombre de la Bodega o Producto</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={isSatellite ? "Ej: Bodega Sector Norte" : "Ej: Concentrado Iniciación"}
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
                                <Text style={styles.label}>Stock Actual</Text>
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
                                <Text style={styles.cancelButtonText}>Cerrar</Text>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: "#003366", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
    listContent: { padding: 20 },
    card: { backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    cardInfo: { flexDirection: "row", alignItems: "center" },
    iconContainer: { backgroundColor: "#EDF2F7", padding: 10, borderRadius: 10 },
    satelliteIcon: { backgroundColor: "#C6F6D5" }, 
    itemName: { fontSize: 16, fontWeight: "bold", color: "#2D3748" },
    itemDate: { fontSize: 14, color: "#718096", marginTop: 2 },
    fab: { position: "absolute", bottom: 30, right: 30, backgroundColor: "#003366", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
    emptyText: { textAlign: "center", marginTop: 50, color: "#718096" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
    modalContent: { backgroundColor: "white", borderRadius: 20, padding: 25 },
    modalHeader: { marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: "bold", color: "#2D3748" },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: 10, backgroundColor: '#F7FAFC', borderRadius: 10 },
    label: { fontSize: 13, fontWeight: "bold", color: "#4A5568", marginBottom: 6 },
    input: { backgroundColor: "#F7FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15 },
    pickerWrapper: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, marginBottom: 15, backgroundColor: '#F7FAFC' },
    modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    modalButton: { flex: 0.48, paddingVertical: 15, borderRadius: 10, alignItems: "center" },
    cancelButton: { backgroundColor: "#EDF2F7" },
    saveButton: { backgroundColor: "#003366" },
    cancelButtonText: { color: "#4A5568", fontWeight: "bold" },
    saveButtonText: { color: "white", fontWeight: "bold" },
});