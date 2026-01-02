import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Check, Eye, EyeOff, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Validaciones de seguridad
  const validations = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const allValid = Object.values(validations).every(v => v === true);

  // Función para limpiar el texto de espacios y caracteres no permitidos
  const cleanPasswordInput = (text: string) => {
    // Eliminamos espacios y solo permitimos caracteres estándar y símbolos comunes
    const cleaned = text.replace(/\s/g, ""); 
    setPassword(cleaned);
  };

  const handleRegister = async () => {
    setMessage("");

    if (!allValid || password !== confirmPassword) {
      setMessage("Asegúrate de cumplir todos los requisitos.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage("Registro exitoso. Revisa tu correo.");
    setTimeout(() => router.replace("/(auth)/login"), 3000);
  };

  // Componente pequeño para mostrar cada requisito
  const Requirement = ({ text, met }: { text: string; met: boolean }) => (
    <View style={styles.requirementItem}>
      {met ? <Check size={14} color="#00C853" /> : <X size={14} color="#D50000" />}
      <Text style={[styles.requirementText, { color: met ? "#00C853" : "#999" }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Crear cuenta</Text>

        <TextInput
          placeholder="Nombre completo"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Correo electrónico"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Campo Contraseña */}
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Contraseña"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={cleanPasswordInput} // Filtra espacios
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
          </TouchableOpacity>
        </View>

        {/* Lista de Requisitos Visuales */}
        {password.length > 0 && (
          <View style={styles.requirementsBox}>
            <Requirement text="Mínimo 8 caracteres" met={validations.length} />
            <Requirement text="Al menos una mayúscula" met={validations.upper} />
            <Requirement text="Al menos un número" met={validations.number} />
            <Requirement text="Al menos un símbolo (!@#$%...)" met={validations.symbol} />
          </View>
        )}

        {/* Confirmar Contraseña */}
        <TextInput
          placeholder="Confirmar contraseña"
          style={[styles.input, password !== confirmPassword && confirmPassword.length > 0 ? styles.inputError : null]}
          value={confirmPassword}
          onChangeText={(text) => setConfirmPassword(text.replace(/\s/g, ""))}
          secureTextEntry={!showPassword}
        />

        {confirmPassword.length > 0 && password !== confirmPassword && (
          <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
        )}

        {message ? (
          <Text style={[styles.message, { color: message.includes("exitoso") ? "#00C853" : "#D50000" }]}>
            {message}
          </Text>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color="#0066CC" />
        ) : (
          <TouchableOpacity 
            style={[styles.button, (!allValid || password !== confirmPassword) && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={!allValid || password !== confirmPassword}
          >
            <Text style={styles.buttonText}>Registrarme</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F2F5F7", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "white", padding: 25, borderRadius: 20, elevation: 5 },
  title: { fontSize: 28, textAlign: "center", marginBottom: 20, fontWeight: "bold", color: "#003366" },
  input: { backgroundColor: "#E8ECF1", padding: 15, borderRadius: 10, marginBottom: 12 },
  inputError: { borderWidth: 1, borderColor: "#D50000" },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#E8ECF1", borderRadius: 10, marginBottom: 12 },
  eyeIcon: { padding: 10 },
  requirementsBox: { marginBottom: 15, paddingHorizontal: 5 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  requirementText: { fontSize: 12, marginLeft: 8 },
  errorText: { color: "#D50000", fontSize: 12, marginBottom: 10, marginTop: -8, marginLeft: 5 },
  message: { textAlign: "center", marginBottom: 15, fontSize: 14 },
  button: { backgroundColor: "#0066CC", padding: 15, borderRadius: 12, marginTop: 10 },
  buttonDisabled: { backgroundColor: "#A7C7E7" },
  buttonText: { textAlign: "center", color: "white", fontSize: 16, fontWeight: "bold" },
});