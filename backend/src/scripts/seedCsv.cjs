const fs = require('fs');
const iconv = require('iconv-lite');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars in backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseIngredients(str) {
  if (!str) return [];
  const cleanStr = str.replace(/\[.*?\]/g, '|');
  const parts = cleanStr.split('|').map(s => s.trim()).filter(Boolean);
  
  return parts.map(part => {
    // ex: "소고기 100 g", "소금 약간", "물 1.5 L"
    const match = part.match(/^(.*?)\s+([0-9./~]+\s*[a-zA-Z가-힣]*|약간|조금|적당량|소량|한줌|반줌|약간씩)$/);
    if (match) {
      return { id: match[1].trim(), amt: match[2].trim() };
    }
    return { id: part, amt: '' };
  });
}

function parseLevel(str) {
  if (str === '초급') return 'beginner';
  if (str === '중급') return 'mid';
  if (str === '고급') return 'expert';
  return 'beginner'; // fallback
}

function parseTime(str) {
  if (!str) return 30;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1]) : 30;
}

async function seed() {
  const dirPath = path.join(__dirname, '../../../만개의 레시피 CSV');
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log(`\n======================================`);
    console.log(`Reading CSV: ${file}`);
    
    const results = [];
    let count = 0;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(iconv.decodeStream('euc-kr'))
        .pipe(csv())
        .on('data', (data) => {
          if (!data.RCP_SNO || !data.RCP_TTL || !data.CKG_MTRL_CN) return;
          
          const recipe = {
            api_rcp_seq: data.RCP_SNO,
            title: data.RCP_TTL,
            category: data.CKG_KND_ACTO_NM || '기타',
            image_url: null,
            ingredients_json: parseIngredients(data.CKG_MTRL_CN),
            steps_json: [],
            level: parseLevel(data.CKG_DODF_NM),
            time: parseTime(data.CKG_TIME_NM),
          };
          
          results.push(recipe);
          count++;
        })
        .on('end', async () => {
          console.log(`Parsed ${count} recipes from ${file}. Starting DB insert...`);
          
          const chunkSize = 500;
          let inserted = 0;
          
          for (let i = 0; i < results.length; i += chunkSize) {
            const chunk = results.slice(i, i + chunkSize);
            
            const { error } = await supabase
              .from('recipes')
              .upsert(chunk, { onConflict: 'api_rcp_seq' });
              
            if (error) {
              console.error(`Error inserting chunk ${i}-${i + chunk.length} for ${file}:`, error);
            } else {
              inserted += chunk.length;
              if (inserted % 5000 === 0 || inserted === results.length) {
                console.log(`Inserted ${inserted} / ${results.length} recipes from ${file}.`);
              }
            }
          }
          
          console.log(`Finished processing ${file}`);
          resolve();
        })
        .on('error', reject);
    });
  }
  console.log('\nAll CSV seeding completed.');
}

seed();
