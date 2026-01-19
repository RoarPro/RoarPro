import { StyleSheet, Text, View } from "react-native";

export default function WaterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parámetros de Agua</Text>
      <Text>Aquí irá el formulario del Módulo 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold" },
});
