import { supabase } from "@/lib/supabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

// 1. Definimos los tipos para las props del botón
interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  color?: string;
}

export default function EmployeeHomeScreen() {
  const [userData, setUserData] = useState({ name: "", role: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Eliminamos 'error' de la destructuración para que ESLint no se queje
      const { data } = await supabase
        .from("employees")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setUserData({ name: data.full_name, role: data.role });
      }
    } catch (err) {
      console.error("Error cargando usuario:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F2F5F7" }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 32, fontWeight: "900", color: "#003366" }}>
          Hola, {userData.name} 👋
        </Text>
        <Text style={{ fontSize: 16, color: "#6688AA", marginBottom: 20 }}>
          Rol: {userData.role.toUpperCase()}
        </Text>

        <ActionButton
          label="Registrar Alimentación"
          icon={<MaterialCommunityIcons name="plus-circle-outline" size={24} color="white" />}
        />

        <ActionButton
          label="Registrar Parámetros"
          icon={<MaterialCommunityIcons name="thermometer" size={24} color="white" />}
        />
      </View>
    </ScrollView>
  );
}

// 2. Aplicamos la interfaz aquí para quitar el error de 'any'
function ActionButton({ label, icon, color = "#0066CC" }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: color,
        padding: 15,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      {icon}
      <Text style={{ color: "white", fontSize: 18, marginLeft: 10 }}>{label}</Text>
    </TouchableOpacity>
  );
}