import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // 1. Iniciamos la "Fina Coquetería" visual
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Lógica de Redirección sincronizada
    const checkSession = async () => {
      // Esperamos 3 segundos para que disfruten tu diseño
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/(owner)");
      } else {
        router.replace("/(auth)/login");
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0A3D62", "#051F32", "#000000"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Animated.Image
            source={require("../assets/images/splash-icon.jpeg")}
            style={styles.logo}
            resizeMode="cover"
          />
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideUp }],
            alignItems: "center",
          }}
        >
          <Text style={styles.title}>
            AQUA<Text style={styles.titleLight}>VIVA</Text>
          </Text>
          <View style={styles.decorator} />
          <Text style={styles.subtitle}>MANAGER</Text>
          <Text style={styles.footerText}>
            Gestión inteligente de cultivos acuícolas
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
    shadowColor: "#00E5FF",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 6,
  },
  titleLight: { fontWeight: "300", color: "#00E5FF" },
  decorator: {
    width: 40,
    height: 3,
    backgroundColor: "#00E5FF",
    marginVertical: 10,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 10,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 40,
    textAlign: "center",
    fontStyle: "italic",
  },
});
