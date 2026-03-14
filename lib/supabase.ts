import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://ylpfbehxfwspzrnlsfbd.supabase.co";
const supabaseAnonKey = "sb_publishable_CB-VlQJc6mm-IGLaPrbrtg_YSpC7dmK";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // ⬅️ IMPORTANTE para que no pida login cada vez
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // ⬅️ IMPORTANTE para React Native/Expo
  },
});
