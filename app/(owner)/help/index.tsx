import { StyleSheet, Text, View } from "react-native";

export default function HelpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ayuda</Text>
      <Text style={styles.subtitle}>Soporte y guía de uso</Text>
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
