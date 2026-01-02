import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importación necesaria
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from "expo-router";
import { Check, Eye, EyeOff, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Datos
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isBiometricActive, setIsBiometricActive] = useState(false);

  // Validaciones
  const validations = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = password === "" || (Object.values(validations).every(v => v === true) && password === confirmPassword);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setEmail(session.user.email || "");
        const { data } = await supabase.from("profiles").select("name").eq("id", session.user.id).single();
        if (data) setName(data.name);
      }

      // LEER PREFERENCIA GUARDADA
      const savedBiometric = await AsyncStorage.getItem('useBiometrics');
      setIsBiometricActive(savedBiometric === 'true');

    } catch (error) {
        console.error("Error al cargar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBiometrics = async (value: boolean) => {
    if (value) {
      // Verificar si el dispositivo tiene biometría configurada
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert("No disponible", "Tu dispositivo no tiene biometría configurada o no es compatible.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({ 
        promptMessage: 'Confirma tu identidad para activar' 
      });

      if (result.success) {
        setIsBiometricActive(true);
        await AsyncStorage.setItem('useBiometrics', 'true'); // PERSISTENCIA
        Alert.alert("Éxito", "Acceso biométrico activado correctamente.");
      }
    } else {
      setIsBiometricActive(false);
      await AsyncStorage.removeItem('useBiometrics'); // ELIMINAR PERSISTENCIA
    }
  };

  const handleUpdate = async () => {
    if (password !== "" && !Object.values(validations).every(v => v === true)) {
      Alert.alert("Error", "La contraseña no cumple los requisitos.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    // Actualizar Nombre
    await supabase.from("profiles").update({ name }).eq("id", session?.user.id);
    
    // Actualizar Contraseña si escribió algo
    if (password !== "") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return Alert.alert("Error", error.message);
    }
    
    Alert.alert("Éxito", "Perfil actualizado");
    setIsEditModalOpen(false);
    setPassword("");
    setConfirmPassword("");
  };

  const Requirement = ({ text, met }: { text: string; met: boolean }) => (
    <View style={styles.requirementItem}>
      {met ? <Check size={14} color="#00C853" /> : <X size={14} color="#D50000" />}
      <Text style={[styles.requirementText, { color: met ? "#00C853" : "#999" }]}>{text}</Text>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0066CC" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#003366" /></TouchableOpacity>
        <Text style={styles.topTitle}>Mi Perfil</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}><Ionicons name="person" size={50} color="white" /></View>
        <Text style={styles.mainName}>{name || "Usuario"}</Text>
        <Text style={styles.mainEmail}>{email}</Text>
        <TouchableOpacity style={styles.editBadge} onPress={() => setIsEditModalOpen(true)}>
          <Ionicons name="create-outline" size={16} color="#0066CC" /><Text style={styles.editBadgeText}>Editar Perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionLabel}>Seguridad</Text>
        <View style={styles.settingItem}>
          <Ionicons name="finger-print" size={22} color="#0066CC" />
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.settingText}>Acceso Biométrico</Text>
            <Text style={styles.settingSubtext}>Usar huella para entrar</Text>
          </View>
          <Switch value={isBiometricActive} onValueChange={toggleBiometrics} trackColor={{ false: "#CBD5E0", true: "#00C853" }} />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut().then(() => router.replace("/(auth)/login" as any))}>
        <Ionicons name="log-out-outline" size={22} color="#FF3B30" /><Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Modal visible={isEditModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput style={styles.modalInput} value={name} onChangeText={setName} />
            
            <Text style={[styles.inputLabel, { marginTop: 20 }]}>Nueva Contraseña (opcional)</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]} 
                value={password} 
                onChangeText={(t) => setPassword(t.replace(/\s/g, ""))} 
                secureTextEntry={!showPassword} 
                placeholder="Nueva contraseña" 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
              </TouchableOpacity>
            </View>

            {password.length > 0 && (
              <View style={styles.requirementsBox}>
                <Requirement text="Mínimo 8 caracteres" met={validations.length} />
                <Requirement text="Una mayúscula" met={validations.upper} />
                <Requirement text="Un número" met={validations.number} />
                <Requirement text="Un símbolo (!@#...)" met={validations.symbol} />
              </View>
            )}

            <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
            <TextInput 
              style={[styles.modalInput, password !== confirmPassword && confirmPassword.length > 0 ? { borderColor: '#D50000', borderWidth: 1 } : null]} 
              value={confirmPassword} 
              onChangeText={(t) => setConfirmPassword(t.replace(/\s/g, ""))} 
              secureTextEntry={!showPassword} 
              placeholder="Confirmar contraseña" 
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, !isPasswordValid && { backgroundColor: '#A7C7E7' }]} 
                onPress={handleUpdate}
                disabled={!isPasswordValid}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Estilos se mantienen iguales a los tuyos...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  topTitle: { fontSize: 18, fontWeight: "bold", color: "#003366" },
  profileCard: { backgroundColor: "white", marginHorizontal: 20, borderRadius: 24, padding: 30, alignItems: "center", elevation: 4 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#0066CC", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  mainName: { fontSize: 22, fontWeight: "bold", color: "#003366" },
  mainEmail: { fontSize: 14, color: "#64748B", marginTop: 4 },
  editBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#E6F0FA", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 20 },
  editBadgeText: { color: "#0066CC", fontWeight: "bold", marginLeft: 6, fontSize: 13 },
  settingsSection: { marginTop: 30, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, color: "#64748B", fontWeight: "bold", textTransform: "uppercase", marginBottom: 12 },
  settingItem: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 15, borderRadius: 16, elevation: 1 },
  settingText: { fontSize: 16, color: "#1E293B", fontWeight: "600" },
  settingSubtext: { fontSize: 12, color: "#64748B" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 40, padding: 20 },
  logoutBtnText: { color: "#FF3B30", fontWeight: "bold", fontSize: 16, marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#003366", marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: "bold", color: "#64748B", marginBottom: 5 },
  modalInput: { backgroundColor: "#F1F5F9", padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 10 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#F1F5F9", borderRadius: 12, marginBottom: 10 },
  requirementsBox: { marginBottom: 15, paddingHorizontal: 5 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  requirementText: { fontSize: 12, marginLeft: 8 },
  modalButtons: { flexDirection: "row", marginTop: 30, justifyContent: "space-between", alignItems: 'center' },
  cancelBtn: { flex: 1, padding: 15, alignItems: "center" },
  cancelBtnText: { color: "#64748B", fontWeight: "bold" },
  saveBtn: { flex: 2, backgroundColor: "#0066CC", padding: 15, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "white", fontWeight: "bold" }
});