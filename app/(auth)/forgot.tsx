import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email) {
      Alert.alert("Error", "Por favor ingresa tu correo.");
      return;
    }

    setLoading(true);

    // Llama a la función de Supabase para enviar el correo de recuperación
    // Nota: resetPasswordForEmail es la función documentada en supabase-js
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // Éxito
    Alert.alert(
      "Correo enviado",
      "Si ese correo existe, recibirás un email con instrucciones para restablecer tu contraseña. Revisa tu bandeja y spam.",
      [
        {
          text: "OK",
          onPress: () => router.push("/(auth)/login"),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>
          Escribe el correo asociado a tu cuenta. Te enviaremos un enlace para restablecerla.
        </Text>

        <TextInput
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSendReset}>
            <Text style={styles.buttonText}>Enviar correo de recuperación</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={{ marginTop: 16 }}>
          <Text style={styles.link}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbff", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "white", padding: 22, borderRadius: 12, elevation: 6 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 6, color: "#0a67c7" },
  subtitle: { color: "#666", marginBottom: 16 },
  input: { backgroundColor: "#f1f1f1", padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: "#0a67c7", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "bold" },
  link: { color: "#0a67c7", textAlign: "center", fontWeight: "bold" },
});
