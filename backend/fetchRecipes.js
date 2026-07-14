import { supabase } from './src/supabaseClient.js';
import { ingredients as MASTER_INGREDIENTS } from './src/data/ingredients.js';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.MAFRA_API_KEY;

if (!API_KEY) {
  console.error("❌ MAFRA_API_KEY is not defined in .env");
  process.exit(1);
}

// 100종의 식재료에 매핑하기 위한 패턴 정의
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
  { id: 'bread', pattern: /식빵/ }
];

// 조미료 및 기본 제외 대상
const UNTRACKED_INGREDIENTS = [
  'soy', 'salt', 'sugar', 'sesameOil', 'gochugaru', 'gochujang', 'doenjang', 
  'garlicMinced', 'oil', 'vinegar', 'pepperPowder', 'cookingWine', 'oysterSauce',
  'plumSyrup', 'cornSyrup', 'honey', 'mayonnaise', 'ketchup', 'ssamjang', 'mustard',
  '물', '소금', '설탕', '참기름', '식용유', '후추', '통깨', '맛술', '청주', '식초', '고추장', '된장', '간장', '다진마늘', '다진 마늘'
];

// 음식 분류명을 프론트 카테고리 칩에 맞게 매핑
function mapCategory(tyNm) {
  if (!tyNm) return '기타';
  if (tyNm.includes('밥') || tyNm.includes('죽') || tyNm.includes('스프')) return '밥/죽/스프';
  if (tyNm.includes('국') || tyNm.includes('찌개') || tyNm.includes('전골') || tyNm.includes('탕')) return '국&찌개';
  if (tyNm.includes('후식') || tyNm.includes('디저트') || tyNm.includes('차') || tyNm.includes('음료')) return '후식';
  if (tyNm.includes('일품') || tyNm.includes('양식') || tyNm.includes('중식') || tyNm.includes('일식') || tyNm.includes('퓨전')) return '일품';
  return '반찬';
}

// 난이도 매핑
function mapLevel(levelNm) {
  if (!levelNm) return 'mid';
  if (levelNm.includes('초보') || levelNm.includes('쉬움') || levelNm.includes('하')) return 'beginner';
  if (levelNm.includes('보통') || levelNm.includes('중')) return 'mid';
  return 'high';
}

// 대표적인 고화질 Unsplash 이미지 매핑 (카테고리별)
const CATEGORY_IMAGES = {
  '밥/죽/스프': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=60',
  '국&찌개': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=60',
  '일품': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60',
  '반찬': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=60',
  '후식': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=60',
  '기타': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=60'
};

async function fetchInChunks(serviceId, totalRows, chunkSize = 1000) {
  const allRows = [];
  const promises = [];
  for (let start = 1; start <= totalRows; start += chunkSize) {
    const end = start + chunkSize - 1;
    const url = `http://211.237.50.150:7080/openapi/${API_KEY}/json/${serviceId}/${start}/${end}`;
    promises.push(
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (data[serviceId] && data[serviceId].row) {
            allRows.push(...data[serviceId].row);
          } else {
            console.warn(`⚠️ Warning fetching chunk ${start}~${end} for ${serviceId}:`, data.result || data);
          }
        })
        .catch(err => {
          console.error(`❌ Network error fetching chunk ${start}~${end} for ${serviceId}:`, err);
        })
    );
  }
  await Promise.all(promises);
  return allRows;
}

async function fetchAndSeed() {
  console.log("🚀 Starting Mafra API Recipe Seeding...");

  try {
    console.log("Fetching data from Agricultural Ministry API in parallel chunks...");
    
    // 1단계: 각 API의 totalCnt를 먼저 조회하여 실제 전체 건수를 파악
    const [basicMeta, ingMeta, stepMeta] = await Promise.all([
      fetch(`http://211.237.50.150:7080/openapi/${API_KEY}/json/Grid_20150827000000000226_1/1/1`).then(r => r.json()),
      fetch(`http://211.237.50.150:7080/openapi/${API_KEY}/json/Grid_20150827000000000227_1/1/1`).then(r => r.json()),
      fetch(`http://211.237.50.150:7080/openapi/${API_KEY}/json/Grid_20150827000000000228_1/1/1`).then(r => r.json()),
    ]);

    const basicTotal = basicMeta.Grid_20150827000000000226_1?.totalCnt ?? 0;
    const ingTotal   = ingMeta.Grid_20150827000000000227_1?.totalCnt ?? 0;
    const stepTotal  = stepMeta.Grid_20150827000000000228_1?.totalCnt ?? 0;

    if (basicTotal === 0) {
      console.error("❌ totalCnt fetch failed. Check API Key.");
      return;
    }
    console.log(`API totalCnt — 기본정보: ${basicTotal}개, 재료: ${ingTotal}개, 과정: ${stepTotal}개`);

    // 2단계: 실제 전체 건수 기준으로 병렬 청크 다운로드
    const [basicRows, ingRows, stepRows] = await Promise.all([
      fetchInChunks('Grid_20150827000000000226_1', basicTotal, 1000),
      fetchInChunks('Grid_20150827000000000227_1', ingTotal, 1000),
      fetchInChunks('Grid_20150827000000000228_1', stepTotal, 1000)
    ]);

    if (basicRows.length === 0 || ingRows.length === 0 || stepRows.length === 0) {
      console.error("❌ Failed to fetch one or more APIs. Check API Key or traffic limit.");
      return;
    }

    console.log(`Fetched ${basicRows.length} basic recipes, ${ingRows.length} ingredients, and ${stepRows.length} steps.`);

    // 1. 재료 그룹화
    const ingMap = {};
    ingRows.forEach(row => {
      const rid = row.RECIPE_ID;
      if (!ingMap[rid]) ingMap[rid] = [];
      ingMap[rid].push(row);
    });

    // 2. 조리 단계 그룹화
    const stepMap = {};
    stepRows.forEach(row => {
      const rid = row.RECIPE_ID;
      if (!stepMap[rid]) stepMap[rid] = [];
      stepMap[rid].push(row);
    });

    // 3. 레시피 병합 가공
    const inserts = [];
    basicRows.forEach(row => {
      const rid = row.RECIPE_ID;
      const ings = ingMap[rid] || [];
      const steps = stepMap[rid] || [];

      if (ings.length === 0 || steps.length === 0) {
        // 재료나 단계 정보가 조회가 안 되는 유효하지 않은 레시피는 건너뜀
        return;
      }

      // 재료 파싱
      const parsedIngredients = [];
      const seenIds = new Set();

      ings.forEach(i => {
        const name = i.IRDNT_NM.trim();
        const amt = i.IRDNT_CPCTY ? i.IRDNT_CPCTY.trim() : '';
        if (!name) return;

        const known = KNOWN_INGREDIENTS.find(({ pattern }) => pattern.test(name));
        const isUntracked = (known && UNTRACKED_INGREDIENTS.includes(known.id)) || UNTRACKED_INGREDIENTS.includes(name);

        if (known) {
          if (seenIds.has(known.id)) return;
          seenIds.add(known.id);
          parsedIngredients.push({ id: known.id, amt, untracked: isUntracked || undefined });
        } else {
          parsedIngredients.push({ name, amt, untracked: isUntracked || undefined });
        }
      });

      // 조리 순서 정렬 및 파싱
      const parsedSteps = steps
        .sort((a, b) => Number(a.COOKING_NO) - Number(b.COOKING_NO))
        .map(s => ({
          step: Number(s.COOKING_NO),
          desc: s.COOKING_DC ? s.COOKING_DC.trim() : '',
          img: null
        }));

      const category = mapCategory(row.TY_NM);
      const imgUrl = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['기타'];

      inserts.push({
        api_rcp_seq: rid.toString(),
        title: row.RECIPE_NM_KO,
        image_url: imgUrl,
        ingredients_json: parsedIngredients,
        steps_json: parsedSteps,
        level: mapLevel(row.LEVEL_NM),
        time: row.COOKING_TIME ? row.COOKING_TIME.replace('분', 'min') : '30min',
        category: category
      });
    });

    console.log(`Processed ${inserts.length} valid everyday recipes.`);

    // 4. Supabase DB 갱신
    console.log("Clearing old recipes from Supabase...");
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .neq('api_rcp_seq', '0'); // 모든 레시피 삭제 효과

    if (deleteError) {
      console.error("❌ Error deleting old recipes:", deleteError);
      return;
    }

    console.log("Upserting new Mafra everyday recipes into Supabase...");
    const { error: insertError } = await supabase
      .from('recipes')
      .upsert(inserts, { onConflict: 'api_rcp_seq' });

    if (insertError) {
      console.error("❌ Error inserting new recipes:", insertError);
    } else {
      console.log(`✨ Successfully seeded ${inserts.length} standard home-cooking recipes to Supabase!`);
    }

  } catch (err) {
    console.error("❌ Script execution error:", err);
  }
}

fetchAndSeed();
