import { supabase } from "@/lib/supabase";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
// Inicializador de la base de datos local para gestión offline de estanques
import { initLocalDb } from "@/lib/localDb";

export default function AquaVivaLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Inicialización del motor de persistencia local para AquaViva Manager
    initLocalDb();

    const handleNavigation = (session: any) => {
      const firstSegment = segments[0] as string;
      const inAuthGroup = firstSegment === "(auth)";

      if (!session) {
        // Redirección a acceso si no hay sesión activa
        if (!inAuthGroup) {
          router.replace("/(auth)/login");
        }
      } else {
        // Redirección al panel principal del dueño de la finca
        if (inAuthGroup || firstSegment === "index" || !firstSegment) {
          router.replace("/(owner)");
        }
      }

      if (!isReady) {
        setIsReady(true);
      }
    };

    // Verificación de estado de sesión con Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleNavigation(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleNavigation(session);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [segments, router, isReady]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F2F5F7", // Color corporativo de fondo
        }}
      >
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Definición de la jerarquía de navegación de la App */}
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(owner)" />
    </Stack>
  );
}
