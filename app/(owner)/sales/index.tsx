import { StyleSheet, Text, View } from "react-native";

export default function SalesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ventas</Text>
      <Text style={styles.subtitle}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F5F7",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#003366",
  },
  subtitle: {
    marginTop: 8,
    color: "#666",
  },
});
