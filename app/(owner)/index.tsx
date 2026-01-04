import { Redirect } from 'expo-router';

export default function Index() {
  // Esto redirige automáticamente a la nueva ubicación
  return <Redirect href="/(owner)/farms/" />;
}