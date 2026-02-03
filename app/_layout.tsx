import { supabase } from "@/lib/supabase";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
// 1. Importamos el inicializador local
import { initLocalDb } from "@/lib/localDb";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 2. Inicializamos la DB Local apenas arranca la App
    // Esto crea las tablas si no existen en el teléfono
    initLocalDb();

    const handleNavigation = (session: any) => {
      const firstSegment = segments[0] as string;
      const inAuthGroup = firstSegment === "(auth)";

      if (!session) {
        if (!inAuthGroup) {
          router.replace("/(auth)/login");
        }
      } else {
        if (inAuthGroup || firstSegment === "index" || !firstSegment) {
          router.replace("/(owner)");
        }
      }

      if (!isReady) {
        setIsReady(true);
      }
    };

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
          backgroundColor: "#F2F5F7",
        }}
      >
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(owner)" />
    </Stack>
  );
}
