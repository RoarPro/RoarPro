import { supabase } from "@/lib/supabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Definimos una interfaz estricta para el resultado de la base de datos
interface EmployeeDataResponse {
  farm_id: string;
  farms:
    | {
        name: string;
      }
    | { name: string }[];
}

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  color?: string;
  onPress: () => void;
}

export default function EmployeeHomeScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState({ name: "", role: "" });
  const [farmData, setFarmData] = useState({
    name: "Cargando finca...",
    id: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

      // Consultamos la relación con la finca
      const { data: employeeRecord } = await supabase
        .from("employees")
        .select("farm_id, farms(name)")
        .eq("auth_id", user.id)
        .single();

      if (profile) {
        setUserData({ name: profile.name, role: profile.role });
      }

      // SOLUCIÓN AL ERROR 2339: Validación de tipo para la relación farms
      if (employeeRecord) {
        const record = employeeRecord as unknown as EmployeeDataResponse;
        let farmName = "Finca no encontrada";

        if (record.farms) {
          farmName = Array.isArray(record.farms)
            ? record.farms[0]?.name
            : record.farms.name;
        }

        setFarmData({
          name: farmName,
          id: record.farm_id,
        });
      } else {
        setFarmData({ name: "Sin finca asignada", id: "" });
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Hola, {userData.name} 👋</Text>
        <View style={styles.farmBadge}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#0066CC" />
          <Text style={styles.farmText}>{farmData.name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Tareas Diarias</Text>

        {/* SOLUCIÓN AL ERROR 2345: Forzamos el tipo a Href para que Expo Router lo acepte */}
        <ActionButton
          label="Registrar Alimentación"
          icon={
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={24}
              color="white"
            />
          }
          color="#0066CC"
          onPress={() => router.push("/(employee)/feeding" as any)}
        />

        <ActionButton
          label="Registrar Parámetros"
          icon={
            <MaterialCommunityIcons
              name="thermometer"
              size={24}
              color="white"
            />
          }
          color="#00CC99"
          onPress={() => router.push("/(employee)/water" as any)}
        />

        <ActionButton
          label="Reportar Mortalidad"
          icon={
            <MaterialCommunityIcons
              name="skull-outline"
              size={24}
              color="white"
            />
          }
          color="#CC3333"
          onPress={() => router.push("/(employee)/mortality" as any)}
        />
      </View>
    </ScrollView>
  );
}

function ActionButton({ label, icon, color, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { backgroundColor: color }]}
    >
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.buttonText}>{label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color="rgba(255,255,255,0.5)"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F5F7" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 25,
    backgroundColor: "white",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
  },
  welcome: { fontSize: 28, fontWeight: "900", color: "#003366" },
  farmBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#E1E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  farmText: {
    marginLeft: 6,
    color: "#0066CC",
    fontWeight: "600",
    fontSize: 14,
  },
  content: { padding: 20, marginTop: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#445566",
    marginBottom: 15,
    marginLeft: 5,
  },
  button: {
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    elevation: 3,
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    flex: 1,
  },
});
