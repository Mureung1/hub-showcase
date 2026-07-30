const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase Client] Connected successfully to Supabase DB.');
  } catch (err) {
    console.error('[Supabase Client] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[Supabase Client] Running with in-memory persistence fallback (Supabase credentials pending).');
}

module.exports = supabase;
