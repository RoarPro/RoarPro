import { supabase } from "@/lib/supabase"; // Importante para verificar sesión
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 1. Iniciar Animaciones
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Lógica de Redirección Inteligente
    const checkSessionAndRedirect = async () => {
      // Esperamos un poco para que la animación se vea (mínimo 2 segundos)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Si hay sesión, vamos directo al panel de control
        router.replace("/(owner)");
      } else {
        // Si no hay sesión, vamos al login
        router.replace("/(auth)/login");
      }
    };

    checkSessionAndRedirect();
  }, [fadeAnim, scaleAnim, router]); // Añade [] para que solo se ejecute al montar

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/images/splash-icon.jpeg")}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />

      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        AquaViva Manager
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
        Gestión inteligente de cultivos acuícolas
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A3D62",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 20,
    borderRadius: 110, // Si quieres que la imagen se vea circular
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    color: "#E0F2FF",
    marginTop: 6,
  },
});