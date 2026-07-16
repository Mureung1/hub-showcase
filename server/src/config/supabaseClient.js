const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kwmjnlwjuzdklvuztvsi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bWpubHdqdXpka2x2dXp0dnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MTU4MTEsImV4cCI6MjA5OTQ5MTgxMX0.ohvw2sS92v_3CXw-79QURH0G6CeicooglvgMEyD673c'
);

module.exports = supabase;