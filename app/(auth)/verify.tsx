import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Cuenta regresiva para reenviar correo
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timer === 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // Reenviar enlace de confirmación
  const resendEmail = async () => {
    if (!email) return;

    setLoading(true);
    setMessage("");
    setTimer(60);
    setCanResend(false);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Te hemos enviado nuevamente el enlace de confirmación.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Confirma tu correo</Text>

        <Text style={styles.subtitle}>
          Hemos enviado un enlace de confirmación a:
        </Text>

        <Text style={styles.email}>{email}</Text>

        <Text style={styles.info}>
          Revisa tu bandeja de entrada y sigue el enlace para activar tu cuenta.
        </Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {loading && (
          <ActivityIndicator
            size="large"
            color="#0066CC"
            style={{ marginTop: 15 }}
          />
        )}

        {!canResend ? (
          <Text style={styles.timer}>
            Puedes reenviar el correo en {timer}s
          </Text>
        ) : (
          <TouchableOpacity onPress={resendEmail}>
            <Text style={styles.resend}>Reenviar correo de confirmación</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{ marginTop: 30 }}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.login}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================== STYLES ================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F5F7",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#003366",
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginTop: 10,
  },
  email: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#003366",
    marginVertical: 10,
  },
  info: {
    textAlign: "center",
    color: "#666",
    marginBottom: 15,
  },
  message: {
    textAlign: "center",
    color: "#0066CC",
    marginBottom: 10,
  },
  timer: {
    textAlign: "center",
    marginTop: 15,
    color: "#666",
  },
  resend: {
    textAlign: "center",
    marginTop: 15,
    color: "#0066CC",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  login: {
    textAlign: "center",
    color: "#003366",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});