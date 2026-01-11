import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function AddEmployeeScreen() {
  const router = useRouter();
  // Capturamos el ID de la finca desde la URL
  const { id } = useLocalSearchParams(); 
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("operario");
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'operario', title: 'Nivel 1: Operario', desc: 'Registros diarios (pH, Alimento, Mortalidad)' },
    { id: 'admin', title: 'Nivel 2: Administrador', desc: 'Gestión de estanques, lotes e inventario' },
    { id: 'socio', title: 'Nivel 3: Socio', desc: 'Acceso total (Ventas y Reportes económicos)' }
  ];

  const shareCredentials = async (name: string, mail: string, pass: string, roleName: string) => {
    try {
      const message = `*Bienvenido a AquaViva Manager*\n\nHola *${name}*, se ha creado tu cuenta de acceso.\n\n🛡️ *Nivel:* ${roleName}\n📧 *Usuario:* ${mail}\n🔑 *Clave:* ${pass}\n\nIngresa estos datos en la aplicación para comenzar.`;
      await Share.share({ message, title: 'Credenciales de Acceso' });
      router.back();
    } catch (error) {
      console.error("Error al compartir credenciales:", error);
      router.back();
    }
  };

  const handleCreateEmployee = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      // 1. Crear el usuario en Auth de Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName, 
            role: selectedRoleId 
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insertar en la tabla 'employees' usando el 'id' de la finca
        // Esto soluciona el error de "id is assigned a value but never used"
        const { error: employeeError } = await supabase
          .from("employees")
          .insert([
            { 
              id: authData.user.id,
              owner_id: session.user.id,
              farm_id: id, // <--- Aquí usamos la variable que daba el error de ESLint
              full_name: fullName,
              email: email,
              role: selectedRoleId
            }
          ]);

        if (employeeError) throw employeeError;

        const roleLabel = roles.find(r => r.id === selectedRoleId)?.title || "";
        
        Alert.alert(
          "¡Empleado Registrado!", 
          `¿Deseas enviar las credenciales a ${fullName}?`,
          [
            { text: "No", onPress: () => router.back() },
            { text: "Sí, Compartir", onPress: () => shareCredentials(fullName, email, password, roleLabel) }
          ]
        );
      }
    } catch (error: any) {
      const msg = error.message.includes("already registered") 
        ? "Este correo ya está registrado en el sistema."
        : error.message;
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo Empleado</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre Completo</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Nombre del trabajador" 
          value={fullName} 
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput 
          style={styles.input} 
          placeholder="correo@ejemplo.com" 
          autoCapitalize="none"
          keyboardType="email-address"
          value={email} 
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña Provisional</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Crea una clave fácil" 
          secureTextEntry
          value={password} 
          onChangeText={setPassword}
        />

        <Text style={[styles.label, { marginBottom: 12 }]}>Nivel de Acceso</Text>
        {roles.map((item) => (
          <TouchableOpacity 
            key={item.id}
            style={[styles.levelCard, selectedRoleId === item.id && styles.levelCardSelected]}
            onPress={() => setSelectedRoleId(item.id)}
          >
            <View style={styles.levelRow}>
              <Ionicons 
                name={selectedRoleId === item.id ? "radio-button-on" : "radio-button-off"} 
                size={20} 
                color={selectedRoleId === item.id ? "#0066CC" : "#718096"} 
              />
              <Text style={[styles.levelTitle, selectedRoleId === item.id && styles.levelTitleSelected]}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.levelDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleCreateEmployee}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Registrar e Invitar</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", color: "#003366" },
  form: { padding: 25 },
  label: { fontSize: 14, fontWeight: "bold", color: "#4A5568", marginBottom: 8 },
  input: { backgroundColor: "#F7FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 20 },
  levelCard: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10, backgroundColor: "#F8FAFC" },
  levelCardSelected: { borderColor: "#0066CC", backgroundColor: "#E6F0FA" },
  levelRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  levelTitle: { marginLeft: 10, fontWeight: "bold", color: "#4A5568" },
  levelTitleSelected: { color: "#0066CC" },
  levelDesc: { fontSize: 12, color: "#718096", marginLeft: 30 },
  button: { backgroundColor: "#0066CC", paddingVertical: 18, borderRadius: 12, alignItems: "center", marginTop: 20, elevation: 2 },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 }
});