import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Fingerprint } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  const colors = {
    primary: "#0066CC",
    secondary: "#003366",
    background: "#F2F5F7",
  };

  // --- LÓGICA DE REDIRECCIÓN BASADA EN ROLES ---
  const redirectUser = useCallback(
    (role: string | null | undefined) => {
      if (role === "owner") {
        router.replace("/(owner)/farms"); // Redirigimos a la lista de fincas del dueño
      } else if (role === "employee") {
        router.replace("/(employee)/home"); // Redirigimos al panel operativo
      } else {
        Alert.alert("Error", "Rol de usuario no identificado.");
      }
    },
    [router],
  );

  // --- AUTENTICACIÓN BIOMÉTRICA ---
  const handleBiometricAuth = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Inicia sesión con tu huella o rostro",
        fallbackLabel: "Usar contraseña",
      });

      if (result.success) {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          redirectUser(profile?.role);
        } else {
          // Si no hay sesión activa, intentamos usar credenciales guardadas
          const savedEmail = await AsyncStorage.getItem("userEmail");
          const savedPass = await AsyncStorage.getItem("userPassword");

          if (savedEmail && savedPass) {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: savedEmail,
              password: savedPass,
            });

            if (!error && data.user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", data.user.id)
                .single();
              redirectUser(profile?.role);
            }
          } else {
            Alert.alert(
              "Aviso",
              "Inicia sesión manualmente una vez para activar la biometría.",
            );
            setLoading(false);
          }
        }
      }
    } catch (e) {
      console.error("Biometric Error:", e);
      setLoading(false);
    }
  }, [redirectUser]);

  useEffect(() => {
    const checkBiometrics = async () => {
      const isActivated = await AsyncStorage.getItem("useBiometrics");
      if (isActivated === "true") {
        setHasBiometrics(true);
        // Pequeño delay para que la UI cargue antes del prompt
        setTimeout(() => handleBiometricAuth(), 800);
      }
    };
    checkBiometrics();
  }, [handleBiometricAuth]);

  // --- LÓGICA DE LOGIN MANUAL ---
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor, ingresa correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email.toLowerCase().trim(),
          password,
        },
      );

      if (authError) {
        Alert.alert("Acceso denegado", "Correo o contraseña incorrectos");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Guardamos credenciales para futuros ingresos biométricos (si está activado)
        const isActivated = await AsyncStorage.getItem("useBiometrics");
        if (isActivated === "true") {
          await AsyncStorage.setItem("userEmail", email);
          await AsyncStorage.setItem("userPassword", password);
        }

        // Buscamos el perfil en la tabla 'profiles'
        let { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        // Si por alguna razón el perfil no existe (ej. error en registro), lo creamos
        if (!profile) {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert([
              {
                id: data.user.id,
                email: data.user.email,
                role: "owner",
                name: data.user.email?.split("@")[0] || "Usuario",
              },
            ])
            .select("role")
            .single();

          if (createError) throw createError;
          profile = newProfile;
        }

        redirectUser(profile?.role);
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message || "No se pudo conectar con el servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.primary }]}>AquaViva</Text>
        <Text style={styles.subtitle}>Gestión Acuícola Inteligente</Text>

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
            onChangeText={(text) => setPassword(text.replace(/\s/g, ""))}
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

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginVertical: 10 }}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
            >
              <Text style={styles.mainButtonText}>Iniciar sesión</Text>
            </TouchableOpacity>

            {hasBiometrics && (
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  { borderColor: colors.primary },
                ]}
                onPress={handleBiometricAuth}
              >
                <Fingerprint size={22} color={colors.primary} />
                <Text
                  style={[
                    styles.biometricButtonText,
                    { color: colors.primary },
                  ]}
                >
                  Acceso Biométrico
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot" as any)}
          style={{ marginTop: 25 }}
        >
          <Text style={[styles.forgot, { color: colors.secondary }]}>
            ¿Olvidaste tu contraseña?
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Eres nuevo aquí? </Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register" as any)}
          >
            <Text style={[styles.link, { color: colors.primary }]}>
              Crea una cuenta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "white",
    padding: 30,
    borderRadius: 25,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 34,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#F5F7F9",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7F9",
    borderRadius: 12,
    marginBottom: 15,
  },
  eyeIcon: { padding: 12 },
  mainButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  mainButtonText: { color: "white", fontSize: 17, fontWeight: "bold" },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  biometricButtonText: { fontSize: 16, fontWeight: "600" },
  forgot: { textAlign: "center", fontSize: 14, fontWeight: "500" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  footerText: { color: "#666", fontSize: 15 },
  link: { fontSize: 15, fontWeight: "bold" },
});
