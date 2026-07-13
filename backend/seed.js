import { supabase } from './src/supabaseClient.js';
import { initialFridge } from './src/data/initialFridge.js';

async function seed() {
  console.log("Deleting all records...");
  const { error: delErr } = await supabase.from('fridge_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error("Delete error:", delErr);
    return;
  }

  const inserts = [];
  for (const [ingredientId, stock] of Object.entries(initialFridge)) {
    if (stock.items) {
      for (const item of stock.items) {
        inserts.push({
          ingredient_id: ingredientId,
          qty_amount: item.qtyAmount || null,
          qty_unit: item.qtyUnit || null,
          qty_label: item.qtyLabel || null,
          purchased: item.purchased || null,
          expiry: item.expiry || null,
          imminent: item.imminent || false,
        });
      }
    }
  }

  console.log("Inserting correct seed data...", inserts);
  const { error: insErr } = await supabase.from('fridge_items').insert(inserts);
  if (insErr) {
    console.error("Insert error:", insErr);
  } else {
    console.log("Seed successful!");
  }
}

seed();
