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

// CKG_MTRL_CN 원문에서 "재료명 + 계량" 쌍만 뽑는다. 표준 id 매핑(KNOWN_INGREDIENTS)은 별도
// 단계(resolveIngredients)에서 한다 — 여기서 바로 id로 바꿔버리면 isSimpleRecipe()의
// KNOWN_PATTERNS 매칭이(한글 텍스트 대상 정규식이라) 깨진다.
function parseIngredientParts(str) {
  if (!str) return [];
  const cleanStr = str.replace(/\[.*?\]/g, '|');
  const parts = cleanStr.split('|').map(s => s.trim()).filter(Boolean);

  return parts.map(part => {
    // ex: "소고기 100 g", "소금 약간", "물 1.5 L"
    const match = part.match(/^(.*?)\s+([0-9./~]+\s*[a-zA-Z가-힣]*|약간|조금|적당량|소량|한줌|반줌|약간씩)$/);
    if (match) {
      return { name: match[1].trim(), amt: match[2].trim() };
    }
    return { name: part, amt: '' };
  });
}

// fetchRecipes.js의 KNOWN_INGREDIENTS/UNTRACKED_INGREDIENTS와 동일한 목록 — 원문 재료명을
// 앱의 표준 재료 id(냉장고 재고와 대조 가능한 id)로 매핑한다. seedCsv.cjs는 이 매핑 단계가
// 아예 빠져 있어서, CSV로 들어간 레시피 66,444개는 재료 id가 전부 원문 한글 텍스트("두부")로
// 저장돼 있었다 — 냉장고는 표준 id("tofu")로 저장되므로 절대 매칭이 안 되는 버그였다.
const KNOWN_INGREDIENTS = [
  { id: 'pork', pattern: /돼지고기|앞다리|목살|항정살/ },
  { id: 'porkBelly', pattern: /삼겹살/ },
  { id: 'beef', pattern: /소고기|국거리|안심|등심/ },
  { id: 'beefMinced', pattern: /다진 소고기|다진소고기/ },
  { id: 'chicken', pattern: /닭고기|생닭/ },
  { id: 'chickenBreast', pattern: /닭가슴살|닭 가슴살/ },
  { id: 'bacon', pattern: /베이컨/ },
  { id: 'tofu', pattern: /두부/ },
  { id: 'onion', pattern: /양파/ },
  { id: 'pa', pattern: /대파|실파/ },
  { id: 'scallion', pattern: /쪽파/ },
  { id: 'kimchi', pattern: /배추김치|묵은지|김치/ },
  { id: 'egg', pattern: /계란|달걀|노른자|흰자/ },
  { id: 'soy', pattern: /간장|진간장|국간장/ },
  { id: 'spam', pattern: /스팸|통조림햄/ },
  { id: 'ramen', pattern: /라면|면사리/ },
  { id: 'garlic', pattern: /통마늘|마늘/ },
  { id: 'garlicMinced', pattern: /다진마늘|다진 마늘/ },
  { id: 'potato', pattern: /감자/ },
  { id: 'carrot', pattern: /당근/ },
  { id: 'cabbage', pattern: /양배추/ },
  { id: 'pepper', pattern: /풋고추|꽈리고추/ },
  { id: 'chili', pattern: /청양고추/ },
  { id: 'mushroom', pattern: /표고버섯|송이버섯|버섯/ },
  { id: 'enoki', pattern: /팽이버섯/ },
  { id: 'oysterMushroom', pattern: /느타리버섯/ },
  { id: 'cucumber', pattern: /오이/ },
  { id: 'zucchini', pattern: /애호박/ },
  { id: 'beanSprouts', pattern: /콩나물/ },
  { id: 'spinach', pattern: /시금치/ },
  { id: 'radish', pattern: /무|무우/ },
  { id: 'lettuce', pattern: /상추/ },
  { id: 'sesameLeaf', pattern: /깻잎/ },
  { id: 'ginger', pattern: /생강/ },
  { id: 'broccoli', pattern: /브로콜리/ },
  { id: 'eggplant', pattern: /가지/ },
  { id: 'bellPepper', pattern: /파프리카|피망/ },
  { id: 'sweetPotato', pattern: /고구마/ },
  { id: 'chives', pattern: /부추/ },
  { id: 'squid', pattern: /오징어/ },
  { id: 'seafoodMix', pattern: /해물믹스/ },
  { id: 'shrimp', pattern: /새우/ },
  { id: 'clam', pattern: /조개|바지락/ },
  { id: 'anchovy', pattern: /멸치/ },
  { id: 'pollack', pattern: /황태채|북어/ },
  { id: 'kelp', pattern: /다시마/ },
  { id: 'milk', pattern: /우유/ },
  { id: 'butter', pattern: /버터/ },
  { id: 'cheese', pattern: /슬라이스 치즈|치즈/ },
  { id: 'mozzarella', pattern: /모짜렐라/ },
  { id: 'rice', pattern: /즉석밥|밥|쌀/ },
  { id: 'somyeon', pattern: /소면/ },
  { id: 'ricecake', pattern: /떡볶이 떡|떡국떡|떡/ },
  { id: 'glassNoodle', pattern: /당면/ },
  { id: 'salt', pattern: /소금/ },
  { id: 'sugar', pattern: /설탕/ },
  { id: 'sesameOil', pattern: /참기름/ },
  { id: 'gochugaru', pattern: /고춧가루/ },
  { id: 'gochujang', pattern: /고추장/ },
  { id: 'doenjang', pattern: /된장/ },
  { id: 'oil', pattern: /식용유|식물성오일|기름/ },
  { id: 'vinegar', pattern: /식초/ },
  { id: 'pepperPowder', pattern: /후춧가루|후추/ },
  { id: 'cookingWine', pattern: /맛술|청주/ },
  { id: 'oysterSauce', pattern: /굴소스/ },
  { id: 'plumSyrup', pattern: /매실액|매실청/ },
  { id: 'cornSyrup', pattern: /물엿|올리고당/ },
  { id: 'honey', pattern: /꿀/ },
  { id: 'mayonnaise', pattern: /마요네즈/ },
  { id: 'ketchup', pattern: /케첩|케찹/ },
  { id: 'ssamjang', pattern: /쌈장/ },
  { id: 'mustard', pattern: /머스타드|겨자/ },
  { id: 'sausage', pattern: /비엔나|소시지/ },
  { id: 'dumpling', pattern: /만두/ },
  { id: 'pancakeMix', pattern: /부침가루|밀가루/ },
  { id: 'curryPowder', pattern: /카레가루|카레/ },
  { id: 'seaweed', pattern: /조미김/ },
  { id: 'driedLaver', pattern: /건김|마른김/ },
  { id: 'crabStick', pattern: /맛살/ },
  { id: 'fishCake', pattern: /어묵/ },
  { id: 'cheeseStick', pattern: /치즈스틱/ },
  { id: 'udong', pattern: /우동/ },
  { id: 'pastaNoodle', pattern: /스파게티/ },
  { id: 'porkCutlet', pattern: /돈까스/ },
  { id: 'spicyPork', pattern: /제육/ },
  { id: 'tokkboki', pattern: /떡볶이 밀키트/ },
  { id: 'soupPack', pattern: /사골/ },
  { id: 'chickenNugget', pattern: /너겟/ },
  { id: 'bread', pattern: /식빵/ },
];

const UNTRACKED_INGREDIENTS = [
  'soy', 'salt', 'sugar', 'sesameOil', 'gochugaru', 'gochujang', 'doenjang',
  'garlicMinced', 'oil', 'vinegar', 'pepperPowder', 'cookingWine', 'oysterSauce',
  'plumSyrup', 'cornSyrup', 'honey', 'mayonnaise', 'ketchup', 'ssamjang', 'mustard',
  '물', '소금', '설탕', '참기름', '식용유', '후추', '통깨', '맛술', '청주', '식초', '고추장', '된장', '간장', '다진마늘', '다진 마늘',
];

// {name, amt} 목록을 fetchRecipes.js와 동일한 규칙으로 {id 또는 name, amt, untracked} 목록으로
// 바꾼다 — 표준 id에 매핑되는 재료는 id로, 안 되는 건 원문 이름 그대로 남긴다(냉장고 대조는
// 안 되지만 화면 표시·장보기 목록엔 여전히 쓸 수 있음). 같은 id로 두 번 매핑되는 경우(예:
// "저염간장"이 두 줄) 중복 추가하지 않는다.
function resolveIngredients(parts) {
  const seenIds = new Set();
  const result = [];
  parts.forEach(({ name, amt }) => {
    const known = KNOWN_INGREDIENTS.find(({ pattern }) => pattern.test(name));
    const isUntracked = (known && UNTRACKED_INGREDIENTS.includes(known.id)) || UNTRACKED_INGREDIENTS.includes(name);
    if (known) {
      if (seenIds.has(known.id)) return;
      seenIds.add(known.id);
      result.push({ id: known.id, amt, untracked: isUntracked || undefined });
    } else {
      result.push({ name, amt, untracked: isUntracked || undefined });
    }
  });
  return result;
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

// 조미료/상비재료는 있어도 가짓수(재료 수급 난이도)에는 안 친다.
const PANTRY_PATTERN = /^(물|소금|설탕|후춧가루|후추|흰후추|식용유|참기름|들기름|올리브오일|올리브유|다진마늘|다진 마늘|맛술|청주|통깨|참깨|식초|간장|진간장|국간장|고추장|된장|고춧가루)$/;

// 조미료 제외 재료 5가지 이하 + 재료 절반 이상이 흔한 재료(KNOWN_INGREDIENTS 매칭) →
// "자취생이 바로 만들기 쉬운 레시피"로 판정. ingredientNames는 원문 한글 이름 목록이어야 한다.
function isSimpleRecipe(ingredientNames) {
  const nonPantry = ingredientNames.filter((n) => !PANTRY_PATTERN.test(n.replace(/\s+/g, '')));
  const knownCount = ingredientNames.filter((n) => KNOWN_INGREDIENTS.some(({ pattern }) => pattern.test(n))).length;
  const knownRatio = ingredientNames.length ? knownCount / ingredientNames.length : 0;
  return nonPantry.length <= 5 && knownRatio >= 0.5;
}

// 2026-07-16 분석 결과 하드코딩: 만개의 레시피 CSV 4개 연도 스냅샷 중 "간단+재료 흔함" 기준을
// 만족하는 레시피가 가장 많은 게 2023-11-30 스냅샷이었다(66,444개, 2위 2022는 44,735개,
// 2024/2025는 각각 2,800개대로 급감 — 최신 스냅샷일수록 오히려 재료 가짓수가 늘고 복잡해짐).
// 스냅샷이 다시 갱신되면 이 선택도 재검토해야 한다 — backend/src/scripts/_analyzeCsvSimplicity.cjs로
// 재분석 가능.
const TARGET_CSV = 'TB_RECIPE_SEARCH-231130.csv';

async function seed() {
  const dirPath = path.join(__dirname, '../../../만개의 레시피 CSV');
  const files = [TARGET_CSV];

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

          const parts = parseIngredientParts(data.CKG_MTRL_CN);
          if (!isSimpleRecipe(parts.map((p) => p.name))) return;

          const recipe = {
            api_rcp_seq: data.RCP_SNO,
            title: data.RCP_TTL,
            category: data.CKG_KND_ACTO_NM || '기타',
            image_url: null,
            ingredients_json: resolveIngredients(parts),
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
