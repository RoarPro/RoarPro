import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://ylpfbehxfwspzrnlsfbd.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscGZiZWh4ZndzcHpybmxzZmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzcxMDAsImV4cCI6MjA4NDM1MzEwMH0.D9TqhJuriDJs_tavN-SpS1mHBcUXnV4Tslf-Yvfk_Yo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // ⬅️ IMPORTANTE para que no pida login cada vez
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // ⬅️ IMPORTANTE para React Native/Expo
  },
});
