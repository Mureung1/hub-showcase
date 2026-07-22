// 원본 CSV(TARGET_CSV)에서 같은 요리(제목 정규화 기준)로 묶이는 행들 중, 재료 가짓수가
// 가장 적은 대표 1건만 남긴 새 CSV를 만든다. seedCsv.cjs가 그대로 읽을 수 있도록 원본과
// 동일한 컬럼 스키마를 유지하되 인코딩만 UTF-8로 바꾼다(출력은 새로 만드는 파일이므로).
//
// isSimpleRecipe/PANTRY_PATTERN/parseIngredientParts는 seedCsv.cjs와 의도적으로 중복 —
// 이 프로젝트는 이미 fetchRecipes.js·seedCsv.cjs 사이에 KNOWN_INGREDIENTS 전체를 중복해서
// 유지하는 컨벤션이 있고(모노레포 공유 패키지 부재), 시딩 스크립트 하나를 리팩터해서 모듈화하는
// 리스크보다 이쪽이 안전하다.
const fs = require('fs');
const iconv = require('iconv-lite');
const csv = require('csv-parser');
const path = require('path');

const TARGET_CSV = 'TB_RECIPE_SEARCH-231130.csv';
const OUTPUT_CSV = 'TB_RECIPE_SEARCH-231130-clean.csv';

function parseIngredientParts(str) {
  if (!str) return [];
  const cleanStr = str.replace(/\[.*?\]/g, '|');
  const parts = cleanStr.split('|').map((s) => s.trim()).filter(Boolean);
  return parts.map((part) => {
    const match = part.match(/^(.*?)\s+([0-9./~]+\s*[a-zA-Z가-힣]*|약간|조금|적당량|소량|한줌|반줌|약간씩)$/);
    if (match) return { name: match[1].trim(), amt: match[2].trim() };
    return { name: part, amt: '' };
  });
}

// seedCsv.cjs의 KNOWN_INGREDIENTS와 완전히 동일해야 한다 — isSimpleRecipe 판정이 갈리면
// "지금 DB에 실제로 들어간 것"과 다른 집합을 대상으로 정리하게 된다.
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

const PANTRY_PATTERN = /^(물|소금|설탕|후춧가루|후추|흰후추|식용유|참기름|들기름|올리브오일|올리브유|다진마늘|다진 마늘|맛술|청주|통깨|참깨|식초|간장|진간장|국간장|고추장|된장|고춧가루)$/;

function isSimpleRecipe(ingredientNames) {
  const nonPantry = ingredientNames.filter((n) => !PANTRY_PATTERN.test(n.replace(/\s+/g, '')));
  const knownCount = ingredientNames.filter((n) => KNOWN_INGREDIENTS.some(({ pattern }) => pattern.test(n))).length;
  const knownRatio = ingredientNames.length ? knownCount / ingredientNames.length : 0;
  return nonPantry.length <= 5 && knownRatio >= 0.5;
}

// 대표 선정 기준: 재료 가짓수(조미료 제외, isSimpleRecipe와 동일한 정의)가 적은 쪽을 남긴다.
function nonPantryCount(ingredientNames) {
  return ingredientNames.filter((n) => !PANTRY_PATTERN.test(n.replace(/\s+/g, ''))).length;
}

function normalizeTitle(title) {
  return title.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

// RCP_TTL(제목 문장)은 "짜지 않게 즐길 수 있는 오이지무침"처럼 홍보 문구가 섞여 있어 정규화만으론
// 같은 요리를 잘 못 잡는다(문장 자체가 다르니까). CKG_NM(요리명) 컬럼은 원본 CSV가 이미 그런
// 문구 없이 "오이지무침"만 담아둔 필드라 훨씬 신뢰할 수 있는 그룹핑 키다. 극소수(20건) 비어있는
// 행만 RCP_TTL로 폴백한다.
function titleKeyOf(row) {
  const ckg = (row.CKG_NM || '').trim();
  return ckg || row.RCP_TTL.trim();
}

function csvField(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const dirPath = path.join(__dirname, '../../../만개의 레시피 CSV');
  const filePath = path.join(dirPath, TARGET_CSV);
  const outPath = path.join(dirPath, OUTPUT_CSV);

  const passingRows = [];
  let totalRows = 0;

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('euc-kr'))
      .pipe(csv())
      .on('data', (data) => {
        totalRows++;
        if (!data.RCP_SNO || !data.RCP_TTL || !data.CKG_MTRL_CN) return;
        const parts = parseIngredientParts(data.CKG_MTRL_CN);
        const names = parts.map((p) => p.name);
        if (!isSimpleRecipe(names)) return;
        passingRows.push({ row: data, nonPantry: nonPantryCount(names) });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`원본 총 행 수: ${totalRows}`);
  console.log(`isSimpleRecipe 통과(= 지금까지 시딩 대상): ${passingRows.length}`);

  const groups = new Map();
  for (const item of passingRows) {
    // 요리명(또는 폴백한 제목)이 특수문자뿐이라 정규화하면 빈 문자열이 되는 극소수 행도 원문을
    // 키로 써서 반드시 그룹(단독 그룹이라도)에 들어가게 한다 — 아니면 winners에서 통째로 누락된다.
    const key = normalizeTitle(titleKeyOf(item.row)) || titleKeyOf(item.row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const winners = [];
  let removedCount = 0;
  for (const [, items] of groups) {
    if (items.length === 1) {
      winners.push(items[0].row);
      continue;
    }

    // 내용(재료·조리법 등)은 재료 가짓수가 가장 적은 레시피에서 가져온다.
    const byIngredientCount = [...items].sort((a, b) => {
      if (a.nonPantry !== b.nonPantry) return a.nonPantry - b.nonPantry;
      return Number(a.row.RCP_SNO) - Number(b.row.RCP_SNO); // 동률이면 RCP_SNO 작은 쪽(결정적)
    });
    const contentWinner = byIngredientCount[0];

    // 제목은 별도로: 그룹 내에서 가장 많이 등장한 CKG_NM 표기(최빈) 우선, 동률이면 짧은 쪽(최단).
    // 같은 요리여도 "소고기 미역국"/"소고기미역국"처럼 띄어쓰기가 갈릴 수 있어 빈도로 고른다.
    const titleFreq = new Map();
    for (const item of items) {
      const t = titleKeyOf(item.row);
      const cur = titleFreq.get(t);
      if (cur) cur.count++;
      else titleFreq.set(t, { count: 1, firstSno: Number(item.row.RCP_SNO) });
    }
    const titleWinner = [...titleFreq.entries()].sort((a, b) => {
      if (a[1].count !== b[1].count) return b[1].count - a[1].count; // 많이 등장한 쪽 우선
      if (a[0].length !== b[0].length) return a[0].length - b[0].length; // 동률이면 짧은 쪽
      return a[1].firstSno - b[1].firstSno; // 그래도 동률이면 결정적으로
    })[0][0];

    winners.push({ ...contentWinner.row, RCP_TTL: titleWinner });
    removedCount += items.length - 1;
  }

  console.log(`중복 그룹 수: ${[...groups.values()].filter((g) => g.length > 1).length}`);
  console.log(`제거되는 중복 행 수: ${removedCount}`);
  console.log(`정리 후 남는 행 수: ${winners.length}`);

  const headers = Object.keys(winners[0]);
  const lines = [headers.map(csvField).join(',')];
  for (const row of winners) {
    lines.push(headers.map((h) => csvField(row[h])).join(','));
  }
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`저장 완료(UTF-8): ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
