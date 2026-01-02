import { supabase } from "@/lib/supabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function EmployeeHomeScreen() {
  const [name, setName] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    if (data) setName(data.name);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F2F5F7" }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 32, fontWeight: "900", color: "#003366" }}>
          Hola, {name} 👋
        </Text>
        <Text style={{ fontSize: 18, color: "#003366", marginBottom: 20 }}>
          Actividades asignadas
        </Text>

        {/* ACCIONES PERMITIDAS */}
        <ActionButton
          label="Registrar Alimentación"
          icon={<MaterialCommunityIcons name="plus-circle-outline" size={24} color="white" />}
        />

        <ActionButton
          label="Registrar Parámetros"
          icon={<MaterialCommunityIcons name="thermometer" size={24} color="white" />}
        />

        <ActionButton
          label="Registrar Mortalidad"
          icon={<MaterialCommunityIcons name="skull" size={24} color="white" />}
        />
      </View>
    </ScrollView>
  );
}

function ActionButton({ label, icon }) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#0066CC",
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
