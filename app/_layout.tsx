import { initLocalDb } from "@/lib/localDb";
import { supabase } from "@/lib/supabase";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

// Bloqueamos el ocultado automático para evitar el flash blanco
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Cargamos lo básico (DB y verificar que Supabase responda)
        await initLocalDb();
        await supabase.auth.getSession();
        // Delay técnico de 500ms para asegurar estabilidad
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.warn("Error en carga inicial:", e);
      } finally {
        setIsAppReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      // Soltamos el splash nativo solo cuando el View azul ya está renderizado
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  if (!isAppReady) {
    return <View style={{ flex: 1, backgroundColor: "#0A3D62" }} />;
  }

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          // contentStyle es vital para que no haya parpadeos al navegar
          contentStyle: { backgroundColor: "#0A3D62" },
          animation: "fade",
        }}
      >
        {/* El Stack busca automáticamente el index.tsx como primera pantalla */}
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(owner)" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A3D62" },
});
