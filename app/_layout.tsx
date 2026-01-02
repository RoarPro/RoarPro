import { supabase } from "@/lib/supabase";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Función centralizada para manejar la navegación
    const handleNavigation = (session: any) => {
      const firstSegment = segments[0] as string;
      const inAuthGroup = firstSegment === "(auth)";

      // Lógica de redirección
      if (!session) {
        // Si no hay sesión y no estamos en login, redirigir a login
        if (!inAuthGroup) {
          router.replace("/(auth)/login");
        }
      } else {
        // Si hay sesión y estamos en login o raíz, redirigir al panel principal
        if (inAuthGroup || firstSegment === "index" || !firstSegment) {
          router.replace("/(owner)");
        }
      }

      // Una vez procesada la navegación, marcamos la app como lista
      if (!isReady) {
        setIsReady(true);
      }
    };

    // 1. Verificar sesión actual inmediatamente al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleNavigation(session);
    });

    // 2. Suscribirse a cambios de autenticación (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleNavigation(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
    // Se agregan todas las dependencias para limpiar las advertencias de ESLint
  }, [segments, router, isReady]);

  // Pantalla de carga profesional mientras se decide el destino del usuario
  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: "#F2F5F7" 
      }}>
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