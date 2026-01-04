import { supabase } from "@/lib/supabase";
import { Slot, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function OwnerLayout() {
  const router = useRouter();
  const segments = useSegments(); // Nos dice en qué carpeta estamos
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/(auth)/login" as any);
        return;
      }

      // Lógica de Redirección Inicial:
      // 1. Verificamos si el usuario está justo en la entrada de la carpeta (owner)
      // Si el último segmento es "(owner)", significa que no ha entrado a ninguna sub-ruta
      const isAtRoot = segments[segments.length - 1] === "(owner)";

      if (isAtRoot) {
     router.replace("/(owner)/farms/" as any);
    }

      setLoading(false);
    } catch (err) {
      console.error("Error validando sesión en Layout:", err);
      router.replace("/(auth)/login" as any);
    }
  }, [router, segments]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  // Slot renderizará farms/index, farms/[id], etc.
  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#F2F5F7" 
  },
});