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
  View,
} from "react-native";

export default function AddEmployeeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(""); // <-- NUEVO ESTADO PARA EL TELÉFONO
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("operario");
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: "operario",
      title: "Nivel 1: Operario",
      desc: "Registros diarios (pH, Alimento, Mortalidad)",
    },
    {
      id: "admin",
      title: "Nivel 2: Administrador",
      desc: "Gestión de estanques, lotes e inventario",
    },
    {
      id: "socio",
      title: "Nivel 3: Socio",
      desc: "Acceso total (Ventas y Reportes económicos)",
    },
  ];

  const handleCreateEmployee = async () => {
    if (!fullName || !username || !password) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios");
      return;
    }

    setLoading(true);
    try {
      // 1. Convertimos el nombre de usuario en un formato aceptado por Supabase
      const virtualEmail = username.includes("@")
        ? username.toLowerCase()
        : `${username.toLowerCase()}@aquaviva.local`;

      // 2. Registrar al empleado en Auth (Supabase iniciará sesión con él automáticamente)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: virtualEmail,
        password: password,
        options: {
          data: { full_name: fullName, role: selectedRoleId },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Insertar en la tabla 'employees' con el número de teléfono
        const { error: employeeError } = await supabase
          .from("employees")
          .insert([
            {
              id: authData.user.id,
              auth_id: authData.user.id,
              farm_id: id,
              full_name: fullName,
              role: selectedRoleId,
              phone: phone, // <-- GUARDAMOS EL TELÉFONO EN LA BASE DE DATOS
              is_active: true,
            },
          ]);

        if (employeeError) throw employeeError;

        // 🛑 EL PASO CLAVE: Cerramos la sesión del nuevo empleado
        // para que no robe el acceso del dueño en este dispositivo.
        await supabase.auth.signOut();

        Alert.alert(
          "¡Acceso Creado!",
          `Se ha registrado a ${fullName}. Por seguridad, ingresa de nuevo con tu cuenta de Dueño.`,
          [
            {
              text: "Entendido",
              onPress: () => {
                // Compartimos credenciales (Ahora incluye el teléfono registrado)
                const msg = `*Acceso AquaViva*\n👤 Usuario: ${username}\n🔑 Clave: ${password}\n📱 Celular registrado: ${phone || "Ninguno"}`;
                Share.share({ message: msg });
                router.replace("/(auth)/login");
              },
            },
          ],
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#003366" />
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo Acceso Personal</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre del Trabajador</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Pedro Pérez"
          placeholderTextColor="#94A3B8"
          value={fullName}
          onChangeText={setFullName}
        />

        {/* <-- NUEVO CAMPO DE TELÉFONO --> */}
        <Text style={styles.label}>Número de Celular / WhatsApp</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 3201234567"
          placeholderTextColor="#94A3B8"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10} // Límite estándar para números en Colombia
        />

        <Text style={styles.label}>Nombre de Usuario</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: pedro2026"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <Text style={styles.label}>Contraseña Temporal</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={[styles.label, { marginBottom: 12, marginTop: 10 }]}>
          Nivel de Permisos
        </Text>
        {roles.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.levelCard,
              selectedRoleId === item.id && styles.levelCardSelected,
            ]}
            onPress={() => setSelectedRoleId(item.id)}
          >
            <View style={styles.levelRow}>
              <Ionicons
                name={
                  selectedRoleId === item.id
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={selectedRoleId === item.id ? "#0066CC" : "#718096"}
              />
              <Text
                style={[
                  styles.levelTitle,
                  selectedRoleId === item.id && styles.levelTitleSelected,
                ]}
              >
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
            <Text style={styles.buttonText}>Crear Acceso</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#003366" },
  form: { padding: 25 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4A5568",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: "#0F172A",
  },
  levelCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  levelCardSelected: { borderColor: "#0066CC", backgroundColor: "#E6F0FA" },
  levelRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  levelTitle: { marginLeft: 10, fontWeight: "bold", color: "#4A5568" },
  levelTitleSelected: { color: "#0066CC" },
  levelDesc: { fontSize: 12, color: "#718096", marginLeft: 30 },
  button: {
    backgroundColor: "#0066CC",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: { backgroundColor: "#A0AEC0" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
