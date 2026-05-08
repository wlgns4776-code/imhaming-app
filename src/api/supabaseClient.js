import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const COLLECTIONS = {
  CALENDAR: 'calendar_events',
  SONG: 'songs',
  LEDGER_USER: 'ledger_users',
  LEDGER_CONFIG: 'ledger_configs',
  ADMIN_USER: 'admin_users',
  PART_DISTRIBUTOR: 'part_distributors',
  MUSIC_STATE: 'music_states',
};
