import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// 🔐 Usa tus valores reales
const supabaseUrl: string = 'https://kgrbynlnouowuyfcpfne.supabase.co'
const supabaseAnonKey: string =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncmJ5bmxub3Vvd3V5ZmNwZm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODk5ODgsImV4cCI6MjA4MDI2NTk4OH0.hum9kgPZqv9rICeMfFX8el8-p2v49O1yNQ77ndgBRSg'

// 🧠 Creamos el cliente de Supabase con opciones de autenticación
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

