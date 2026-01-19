import { supabase } from "@/lib/supabase";
import { Stack, useRouter, useSegments } from "expo-router"; // Cambiamos Slot por Stack
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function OwnerLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/(auth)/login");
        return;
      }

      // Redirigir a la lista de fincas si el usuario entra a la raíz de (owner)
      const isAtRoot = segments.length === 1 && segments[0] === "(owner)";
      if (isAtRoot) {
        router.replace("/(owner)/farms/");
      }

      setLoading(false);
    } catch (err) {
      console.error("Error validando sesión:", err);
      router.replace("/(auth)/login");
    }
  }, [router, segments]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  // Usar Stack da una mejor experiencia de navegación que Slot
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="farms/index" />
      <Stack.Screen name="farms/[id]/index" />
      <Stack.Screen name="inventory/index" />
      <Stack.Screen name="inventory/transfer" />
      {/* Definimos la ruta de biometría explícitamente */}
      <Stack.Screen
        name="farms/[id]/ponds/[pondId]/biometry"
        options={{ presentation: "modal" }} // Opcional: que suba como una hoja desde abajo
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F5F7",
  },
});
