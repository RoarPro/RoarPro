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
  View
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

  const allValid = Object.values(validations).every((v) => v === true);

  const cleanPasswordInput = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    setPassword(cleaned);
  };

  // --- LÓGICA DE REGISTRO OPTIMIZADA ---
  const handleRegister = async () => {
    setMessage("");

    if (!allValid || password !== confirmPassword) {
      setMessage("Asegúrate de cumplir todos los requisitos.");
      return;
    }

    setLoading(true);

    try {
      // 1. Registro en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }, // Guardamos el nombre en los metadatos de Auth
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Registro en nuestra tabla 'profiles' (Crucial para el RLS)
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authData.user.id,
            name: name,
            email: email.toLowerCase().trim(),
            role: "owner", // El que se registra por la app siempre es Dueño
          },
        ]);

        if (profileError) {
          // Si falla el perfil, registramos el error pero el usuario ya existe en Auth
          console.error("Error al crear perfil:", profileError.message);
        }

        setMessage("¡Registro exitoso! Revisa tu email para confirmar cuenta.");

        // Pequeña pausa para que el usuario lea el mensaje antes de redirigir
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 3000);
      }
    } catch (error: any) {
      setMessage(error.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const Requirement = ({ text, met }: { text: string; met: boolean }) => (
    <View style={styles.requirementItem}>
      {met ? (
        <Check size={14} color="#00C853" />
      ) : (
        <X size={14} color="#D50000" />
      )}
      <Text
        style={[styles.requirementText, { color: met ? "#00C853" : "#999" }]}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AquaViva Manager</Text>
        <Text style={styles.subtitle}>Crea tu cuenta de Propietario</Text>

        <TextInput
          placeholder="Nombre completo"
          placeholderTextColor="#999"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor="#999"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor="#999"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={cleanPasswordInput}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword ? (
              <EyeOff size={20} color="#666" />
            ) : (
              <Eye size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <View style={styles.requirementsBox}>
            <Requirement text="Mínimo 8 caracteres" met={validations.length} />
            <Requirement
              text="Al menos una mayúscula"
              met={validations.upper}
            />
            <Requirement text="Al menos un número" met={validations.number} />
            <Requirement
              text="Al menos un símbolo (!@#$%...)"
              met={validations.symbol}
            />
          </View>
        )}

        <TextInput
          placeholder="Confirmar contraseña"
          placeholderTextColor="#999"
          style={[
            styles.input,
            password !== confirmPassword && confirmPassword.length > 0
              ? styles.inputError
              : null,
          ]}
          value={confirmPassword}
          onChangeText={(text) => setConfirmPassword(text.replace(/\s/g, ""))}
          secureTextEntry={!showPassword}
        />

        {confirmPassword.length > 0 && password !== confirmPassword && (
          <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
        )}

        {message ? (
          <Text
            style={[
              styles.message,
              { color: message.includes("exitoso") ? "#00C853" : "#D50000" },
            ]}
          >
            {message}
          </Text>
        ) : null}

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#0066CC"
            style={{ marginTop: 10 }}
          />
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              (!allValid || password !== confirmPassword || !name || !email) &&
                styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={
              !allValid || password !== confirmPassword || !name || !email
            }
          >
            <Text style={styles.buttonText}>Registrarme</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{ marginTop: 20 }}
        >
          <Text style={{ textAlign: "center", color: "#0066CC" }}>
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F2F5F7",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 25,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 26,
    textAlign: "center",
    fontWeight: "bold",
    color: "#0066CC",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
    color: "#666",
  },
  input: {
    backgroundColor: "#F0F3F7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#D50000",
    backgroundColor: "#FFF5F5",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F3F7",
    borderRadius: 12,
    marginBottom: 14,
  },
  eyeIcon: { padding: 12 },
  requirementsBox: {
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: "#F9F9F9",
    padding: 10,
    borderRadius: 10,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  requirementText: { fontSize: 13, marginLeft: 10 },
  errorText: {
    color: "#D50000",
    fontSize: 13,
    marginBottom: 15,
    marginTop: -10,
    marginLeft: 5,
  },
  message: {
    textAlign: "center",
    marginBottom: 15,
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#0066CC",
    padding: 18,
    borderRadius: 15,
    marginTop: 5,
  },
  buttonDisabled: { backgroundColor: "#A7C7E7" },
  buttonText: {
    textAlign: "center",
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
});
