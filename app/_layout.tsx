import { initLocalDb } from "@/lib/localDb";
import { supabase } from "@/lib/supabase";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Bloqueamos el ocultado automático para evitar el flash blanco
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const ensureSamplingNotifications = useCallback(async () => {
    if (Constants.appOwnership === "expo") {
      // Expo Go no soporta push remotas; evitamos configurar para no mostrar warning.
      return;
    }

    const channelId = "sampling-reminders";
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: "Recordatorios de muestreo",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const request = await Notifications.requestPermissionsAsync();
      status = request.status;
    }
    if (status !== "granted") return;

    const existing =
      (await Notifications.getAllScheduledNotificationsAsync()) || [];
    const hasTag = (tag: string) =>
      existing.some((n) => n.content.data?.tag === tag);

    const scheduleReminder = async (
      day: number,
      hour: number,
      tag: string,
      body: string,
    ) => {
      if (hasTag(tag)) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Recordatorio de muestreo",
          body,
          data: { tag },
        },
        trigger: {
          day,
          hour,
          minute: 0,
          repeats: true,
          channelId,
        },
      });
    };

    await scheduleReminder(
      15,
      8,
      "sampling-15-am",
      "Hoy toca muestreo programado (día 15).",
    );
    await scheduleReminder(
      15,
      17,
      "sampling-15-pm",
      "¿Ya registraste el muestreo del día 15?",
    );
    await scheduleReminder(
      30,
      8,
      "sampling-30-am",
      "Hoy toca muestreo programado (día 30).",
    );
    await scheduleReminder(
      30,
      17,
      "sampling-30-pm",
      "Recuerda registrar el muestreo del día 30.",
    );
  }, []);

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

  useEffect(() => {
    if (isAppReady) {
      ensureSamplingNotifications();
    }
  }, [ensureSamplingNotifications, isAppReady]);

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
