import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing! VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
