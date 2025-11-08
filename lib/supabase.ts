import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hmzgdfhicshfarelrahs.supabase.co'
const supabasePublishableKey = 'sb_publishable_N7Cl6HV_bQ2xkHhoudiu6Q_hQO4Wh-i'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})