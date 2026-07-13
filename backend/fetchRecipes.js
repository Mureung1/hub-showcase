import { supabase } from './src/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

// 식품안전나라 API 키 (없으면 sample 사용하지만 5개만 나옴)
const API_KEY = process.env.FOOD_SAFETY_API_KEY || 'sample';
const API_URL = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/COOKRCP01/json/1/100`;

// 정규식을 이용해 원본 텍스트에서 우리 DB의 표준 재료 ID를 추출하는 함수
function parseIngredients(rawText) {
  const ids = new Set();
  if (!rawText) return [];

  // 키워드 기반 매칭 (매우 단순한 형태)
  if (/돼지고기|목살|삼겹살|앞다리|항정살/.test(rawText)) ids.add('pork');
  if (/두부/.test(rawText)) ids.add('tofu');
  if (/양파/.test(rawText)) ids.add('onion');
  if (/대파|파|쪽파/.test(rawText)) ids.add('pa');
  if (/김치|배추김치|묵은지/.test(rawText)) ids.add('kimchi');
  if (/계란|달걀|노른자|흰자/.test(rawText)) ids.add('egg');
  if (/간장/.test(rawText)) ids.add('soy');
  if (/스팸|햄|통조림햄/.test(rawText)) ids.add('spam');
  if (/라면|면사리/.test(rawText)) ids.add('ramen');

  return Array.from(ids);
}

async function fetchAndSeed() {
  console.log(`Fetching recipes from API... (${API_URL})`);
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.COOKRCP01 || !data.COOKRCP01.row) {
      console.error("Failed to fetch recipes:", data);
      return;
    }

    const rows = data.COOKRCP01.row;
    console.log(`Fetched ${rows.length} recipes.`);

    const inserts = [];

    for (const r of rows) {
      // 단계별 파싱 (MANUAL01 ~ MANUAL20)
      const steps = [];
      for (let i = 1; i <= 20; i++) {
        const iStr = i.toString().padStart(2, '0');
        const desc = r[`MANUAL${iStr}`];
        const img = r[`MANUAL_IMG${iStr}`];
        if (desc && desc.trim()) {
          steps.push({
            step: i,
            desc: desc.replace(/^\d+\.\s*/, '').trim(), // "1. 설명" 에서 "1. " 제거
            img: img || null
          });
        }
      }

      // 난이도는 INFO_ENG, INFO_CAR 등 영양소나 다른 항목 기반으로 임의 설정, 혹은 전체 'normal'
      const level = 'normal';
      
      inserts.push({
        api_rcp_seq: r.RCP_SEQ,
        title: r.RCP_NM,
        image_url: r.ATT_FILE_NO_MAIN || r.ATT_FILE_NO_MK || null,
        ingredients_json: parseIngredients(r.RCP_PARTS_DTLS),
        steps_json: steps,
        level: level,
        time: '30min', // API에 조리시간이 명확하지 않아 일괄 30분
        category: r.RCP_PAT2 || '기타' // 카테고리 (반찬, 국&찌개 등)
      });
    }

    console.log("Upserting into Supabase...");
    
    // api_rcp_seq를 기준으로 충돌 시 업데이트(upsert)
    const { error } = await supabase
      .from('recipes')
      .upsert(inserts, { onConflict: 'api_rcp_seq' });

    if (error) {
      console.error("Error inserting data:", error);
    } else {
      console.log(`Successfully saved ${inserts.length} recipes to Supabase!`);
    }

  } catch (err) {
    console.error("Script error:", err);
  }
}

fetchAndSeed();
