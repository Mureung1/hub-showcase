require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL 또는 SUPABASE_ANON_KEY가 .env에 설정되어 있지 않습니다.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;