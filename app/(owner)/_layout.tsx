import { supabase } from "@/lib/supabase";
import { Slot, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function OwnerLayout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Si no hay sesión, mandamos al login
      if (!session) {
        router.replace("/(auth)/login" as any);
        return;
      }

      // Si hay sesión, permitimos el paso al Slot (index.tsx u otras pantallas)
      setLoading(false);
    } catch (err) {
      console.error("Error validando sesión en Layout:", err);
      router.replace("/(auth)/login" as any);
    }
  }, [router]);

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