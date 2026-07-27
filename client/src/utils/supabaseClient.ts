import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jfkikhiwuvlpvqisolku.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lPKI52LrlCTtvQYVSB-QQQ_JcTkFqWx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
