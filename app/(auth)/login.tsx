import { supabase } from "@/lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
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

  const redirectUser = useCallback((role: string | null | undefined) => {
    if (role === 'owner') {
      router.replace("/(owner)" as any);
    } else {
      router.replace("/(employee)" as any);
    }
  }, [router]);

  const handleBiometricAuth = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Inicia sesión con tu huella o rostro',
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          redirectUser(profile?.role);
        } else {
          const savedEmail = await AsyncStorage.getItem('userEmail');
          const savedPass = await AsyncStorage.getItem('userPassword');

          if (savedEmail && savedPass) {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: savedEmail,
              password: savedPass,
            });

            if (!error && data.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
              redirectUser(profile?.role);
            } else {
              Alert.alert("Error", "No se pudo re-conectar. Ingresa manualmente.");
              setLoading(false);
            }
          } else {
            Alert.alert("Aviso", "Inicia sesión manualmente una vez para vincular tu huella.");
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
      const isActivated = await AsyncStorage.getItem('useBiometrics');
      if (isActivated === 'true') {
        setHasBiometrics(true);
        setTimeout(() => {
          handleBiometricAuth();
        }, 800);
      }
    };
    checkBiometrics();
  }, [handleBiometricAuth]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor, ingresa correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        Alert.alert("Acceso denegado", "Correo o contraseña incorrectos");
        setLoading(false);
        return;
      }

      if (data.user) {
        const isActivated = await AsyncStorage.getItem('useBiometrics');
        if (isActivated === 'true') {
          await AsyncStorage.setItem('userEmail', email);
          await AsyncStorage.setItem('userPassword', password);
        }

        let { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile) {
          const defaultName = data.user.email?.split('@')[0] || 'Usuario';
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, email: data.user.email, role: 'owner', name: defaultName }])
            .select('role')
            .single();
          profile = newProfile;
        }

        redirectUser(profile?.role);
      }
    } catch {
      Alert.alert("Error", "No se pudo conectar con el servidor.");
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
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Contraseña"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={(text) => setPassword(text.replace(/\s/g, ""))}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 10 }} />
        ) : (
          <View style={{ gap: 10 }}>
            <TouchableOpacity 
              style={[styles.mainButton, { backgroundColor: colors.primary }]} 
              onPress={handleLogin}
            >
              <Text style={styles.mainButtonText}>Iniciar sesión</Text>
            </TouchableOpacity>

            {hasBiometrics && (
              <TouchableOpacity 
                style={[styles.biometricButton, { borderColor: colors.primary }]} 
                onPress={handleBiometricAuth}
              >
                <Fingerprint size={24} color={colors.primary} />
                <Text style={[styles.biometricButtonText, { color: colors.primary }]}>Entrar con Huella</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity onPress={() => router.push("/(auth)/forgot" as any)} style={{ marginTop: 20 }}>
          <Text style={[styles.forgot, { color: colors.secondary }]}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register" as any)}>
            <Text style={[styles.link, { color: colors.primary }]}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", backgroundColor: "white", padding: 25, borderRadius: 20, elevation: 4 },
  title: { fontSize: 32, textAlign: "center", fontWeight: "bold", marginBottom: 5 },
  subtitle: { fontSize: 15, textAlign: "center", color: "#666", marginBottom: 25 },
  input: { backgroundColor: "#f1f1f1", padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#f1f1f1", borderRadius: 10, marginBottom: 15 },
  eyeIcon: { padding: 12 },
  mainButton: { padding: 15, borderRadius: 10, alignItems: "center", marginTop: 5 },
  mainButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  biometricButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1,
    marginTop: 5,
    gap: 10
  },
  biometricButtonText: { fontSize: 15, fontWeight: "600" },
  forgot: { textAlign: "center", fontSize: 14 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 25 },
  footerText: { color: "#666", fontSize: 14 },
  link: { fontSize: 14, fontWeight: "bold" },
});