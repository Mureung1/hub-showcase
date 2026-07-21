// 냉장고 재료 선택 → 추천 리스트 → 레시피 상세 흐름 (Design Canvas "끼니픽 UI 톤앤매너 리디자인"에서 가져옴)
// 마스코트·요리 아이콘은 raster 이미지 대신 절차적 SVG로 그려서, 재료/색상 조합만 바꾸면 계속 늘어나는 레시피에도 바로 대응한다.

const C = { brown: '#5B4130', yellow: '#F0A93E', orange: '#E8823D', coral: '#E8735A', green: '#8BAF5E' };

const PRICE = {
  배추: 2500, 당근: 700, 무: 1000, 감자: 800, 양파: 600, 마늘: 1500, 대파: 800, 두부: 1500, 버섯: 2000, 애호박: 1200, 고추: 1000,
  돼지고기: 5000, 소고기: 4500, 닭고기: 4000, 계란: 3000, 새우: 3000, 참치: 2500,
  햄: 3500, 소세지: 3000, 어묵: 2500, 김치: 4000, 참치캔: 2000, 스팸: 4500,
  밥: 500, 빵: 2000, 면: 1500, 시리얼: 3000,
  소금: 500, 고추장: 3000, 된장: 2500, 간장: 2000, 참기름: 3500, 설탕: 1000, 후추: 2000, 식용유: 2500,
};

const TIPS = {
  계란볶음밥: '고소한 맛을 원하면 참기름을 조금 더 넣어보세요!',
  두부조림: '두부는 노릇하게 부치듯 구우면 더 든든해요!',
  김치볶음밥: '묵은지일수록 더 맛있어요!',
  된장찌개: '된장은 자작하게 끓여야 깊은 맛이 나요!',
  소고기무국: '무는 나박하게 썰어야 국물이 시원해요!',
  새우볶음밥: '새우는 먼저 볶아 향을 내면 더 좋아요!',
  감자채볶음: '감자는 채썬 후 물에 헹궈야 안 뭉쳐요!',
};

// youtubeId는 src/data/mockRecipes.js에 이미 큐레이션된 실제 영상 ID를 그대로 재사용 — 프로토타입이라고
// 임의의 영상 ID를 지어내면 엉뚱한 영상 썸네일이 뜰 수 있어서, 겹치는 레시피만 가져오고 나머지는 이모지로 대체.
const RECIPES = [
  { name: '계란볶음밥', timeMin: 10, ingredients: ['밥', '계란', '대파', '간장', '참기름'], variant: 'bowl', colors: ['yellow', 'coral'], emoji: '🍳', youtubeId: 'RUgH6TBDtsM' },
  { name: '두부조림', timeMin: 15, ingredients: ['두부', '대파', '마늘', '간장', '고추장'], variant: 'plate', colors: ['green', 'yellow'], emoji: '🧈', youtubeId: 'JTNzDDQCL0k' },
  { name: '김치볶음밥', timeMin: 15, ingredients: ['밥', '김치', '대파', '계란', '참기름', '간장'], variant: 'plate', colors: ['coral', 'yellow'], emoji: '🍚', youtubeId: 'tS7nKEMOJpw' },
  { name: '된장찌개', timeMin: 20, ingredients: ['두부', '애호박', '양파', '마늘', '된장'], variant: 'bowl', colors: ['orange', 'green'], emoji: '🍲', youtubeId: '1Cq894mgoG4' },
  { name: '소고기무국', timeMin: 25, ingredients: ['소고기', '무', '대파', '마늘', '간장'], variant: 'bowl', colors: ['orange', 'coral'], emoji: '🍖', youtubeId: null },
  { name: '새우볶음밥', timeMin: 15, ingredients: ['밥', '새우', '계란', '대파', '참기름', '소금'], variant: 'bowl', colors: ['coral', 'green'], emoji: '🍤', youtubeId: 'gx7GjyacUJg' },
  { name: '감자채볶음', timeMin: 15, ingredients: ['감자', '당근', '양파', '식용유', '소금'], variant: 'plate', colors: ['yellow', 'green'], emoji: '🥔', youtubeId: null },
];

// 카드 썸네일 뒤에 깔리는 파스텔 배경 — 사진 로드 전/이모지 대체 시에도 빈 카드처럼 안 보이게. 카드 순서대로 순환
const CARD_PALETTE = ['#FBEBDD', '#E5F3E9', '#F1E9F7', '#FBE7EE'];

const CATEGORIES = ['채소', '육류·해산물', '가공식품', '곡류', '양념'];
const INGREDIENTS_BY_CAT = {
  '채소': ['배추', '당근', '무', '감자', '양파', '마늘', '대파', '두부', '버섯', '애호박', '고추'],
  '육류·해산물': ['돼지고기', '소고기', '닭고기', '계란', '새우', '참치'],
  '가공식품': ['햄', '소세지', '어묵', '김치', '참치캔', '스팸'],
  '곡류': ['밥', '빵', '면', '시리얼'],
  '양념': ['소금', '고추장', '된장', '간장', '참기름', '설탕', '후추', '식용유'],
};
const FOOD_TYPES = ['전체', '한식', '양식', '퓨전', '간단요리'];
const COOK_TIMES = ['전체', '10분 이내', '20분 이내', '30분 이내'];
const SORT_OPTIONS = ['전체', '가격 낮은순', '가격 높은순'];

// ---- SVG 아이콘 ----

function svgDoodle(kind, size) {
  const b = C.brown;
  if (kind === 'carrot') return `<svg viewBox="0 0 40 50" width="${size}" height="${size}">
    <path d="M20 14 L28 46 Q20 50 12 46 Z" fill="${C.orange}" stroke="${b}" stroke-width="2"/>
    <path d="M20 14 Q14 4 8 8 M20 14 Q20 2 20 8 M20 14 Q26 4 32 8" stroke="${C.green}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`;
  if (kind === 'chili') return `<svg viewBox="0 0 50 30" width="${size}" height="${size}">
    <path d="M6 10 Q20 -4 44 8 Q46 20 30 24 Q10 28 6 10 Z" fill="${C.coral}" stroke="${b}" stroke-width="2"/>
    <path d="M6 10 Q0 4 4 0" stroke="${C.green}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`;
  if (kind === 'mushroom') return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
    <path d="M4 20 Q4 4 20 4 Q36 4 36 20 Z" fill="${C.coral}" stroke="${b}" stroke-width="2"/>
    <rect x="13" y="20" width="14" height="16" rx="5" fill="#FFFBF2" stroke="${b}" stroke-width="2"/>
  </svg>`;
  if (kind === 'tomato') return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
    <circle cx="20" cy="22" r="15" fill="${C.coral}" stroke="${b}" stroke-width="2"/>
    <path d="M20 7 Q16 2 12 4 M20 7 Q20 1 20 4 M20 7 Q24 2 28 4" stroke="${C.green}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </svg>`;
  if (kind === 'potato') return `<svg viewBox="0 0 40 32" width="${size}" height="${size}">
    <ellipse cx="20" cy="18" rx="18" ry="12" fill="#D9A868" stroke="${b}" stroke-width="2"/>
    <circle cx="14" cy="16" r="1.6" fill="${b}"/>
    <circle cx="24" cy="21" r="1.6" fill="${b}"/>
    <circle cx="27" cy="13" r="1.6" fill="${b}"/>
  </svg>`;
  if (kind === 'jar') return `<svg viewBox="0 0 32 40" width="${size}" height="${size}">
    <rect x="6" y="12" width="20" height="24" rx="4" fill="${C.green}" stroke="${b}" stroke-width="2"/>
    <rect x="10" y="4" width="12" height="10" rx="2" fill="#FFFBF2" stroke="${b}" stroke-width="2"/>
  </svg>`;
  return `<svg viewBox="0 0 40 46" width="${size}" height="${size}">
    <ellipse cx="20" cy="26" rx="16" ry="18" fill="#FFFBF2" stroke="${b}" stroke-width="2"/>
    <path d="M20 8 Q20 2 24 -2 M14 10 Q12 4 8 2 M26 10 Q28 4 32 2" stroke="${b}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M20 10 L20 42 M12 14 L12 40 M28 14 L28 40" stroke="#C9A574" stroke-width="1.6" fill="none"/>
  </svg>`;
}

function svgMascot(size, opts) {
  opts = opts || {};
  const b = C.brown;
  let extra = '';
  if (opts.hat) {
    extra += `<path d="M40 22 Q40 6 60 6 Q80 6 80 22 Z" fill="#fff" stroke="${b}" stroke-width="2.5"/>`;
    extra += `<rect x="38" y="20" width="44" height="8" rx="3" fill="#fff" stroke="${b}" stroke-width="2.5"/>`;
  }
  if (opts.spoon) {
    extra += `<rect x="57" y="78" width="6" height="26" rx="3" fill="#C89050" stroke="${b}" stroke-width="2"/>`;
    extra += `<ellipse cx="60" cy="74" rx="9" ry="6" fill="#C89050" stroke="${b}" stroke-width="2"/>`;
  }
  return `<svg viewBox="0 0 120 130" width="${size}" height="${size}" style="display:block;flex-shrink:0">
    <ellipse cx="60" cy="88" rx="34" ry="30" fill="#FDE7B8" stroke="${b}" stroke-width="3"/>
    <circle cx="32" cy="30" r="12" fill="${C.yellow}" stroke="${b}" stroke-width="3"/>
    <circle cx="88" cy="30" r="12" fill="${C.yellow}" stroke="${b}" stroke-width="3"/>
    <circle cx="32" cy="30" r="5" fill="#FBC8B8"/>
    <circle cx="88" cy="30" r="5" fill="#FBC8B8"/>
    <circle cx="60" cy="52" r="30" fill="${C.yellow}" stroke="${b}" stroke-width="3"/>
    <ellipse cx="60" cy="60" rx="20" ry="16" fill="#FDE7B8" stroke="${b}" stroke-width="2.5"/>
    <circle cx="42" cy="60" r="5" fill="${C.coral}" opacity="0.5"/>
    <circle cx="78" cy="60" r="5" fill="${C.coral}" opacity="0.5"/>
    <circle cx="50" cy="46" r="2.6" fill="${b}"/>
    <circle cx="70" cy="46" r="2.6" fill="${b}"/>
    <path d="M55 58 Q60 62 65 58" stroke="${b}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${extra}
  </svg>`;
}

function svgDish(variant, colorKeys) {
  const b = C.brown;
  const c1 = C[colorKeys[0]] || colorKeys[0];
  const c2 = C[colorKeys[1]] || colorKeys[1] || '#FFFBF2';
  let inner;
  if (variant === 'bowl') inner = `<path d="M16 50 a34 24 0 0 0 68 0 Z" fill="${c1}" stroke="${b}" stroke-width="2.5"/>`;
  else if (variant === 'wrap') inner = `<rect x="22" y="34" width="56" height="34" rx="14" fill="${c1}" stroke="${b}" stroke-width="2.5" transform="rotate(-8 50 50)"/>`;
  else if (variant === 'split') inner = `<path d="M50 20 A32 32 0 0 1 50 84 Z" fill="${c1}" stroke="${b}" stroke-width="2.5"/>`;
  else inner = `<circle cx="50" cy="52" r="26" fill="${c1}" stroke="${b}" stroke-width="2.5"/>`;
  const accentX = variant === 'split' ? 30 : 38;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" style="display:block">
    <circle cx="50" cy="52" r="38" fill="#fff" stroke="${b}" stroke-width="3"/>
    ${inner}
    <circle cx="${accentX}" cy="44" r="7" fill="${c2}" stroke="${b}" stroke-width="2"/>
    <path d="M40 12 q4 -7 0 -13 M52 10 q4 -7 0 -13 M64 12 q4 -7 0 -13" stroke="#C9A574" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
  </svg>`;
}

// ---- 상태 ----

const state = {
  screen: 'fridge', // fridge | home | detail
  category: '채소',
  selected: new Set(['배추', '양파', '마늘', '대파', '두부', '계란', '밥', '간장', '참기름', '고추장', '김치']),
  foodType: '전체',
  cookTime: '전체',
  sortOrder: '전체',
  selectedRecipe: null,
};

function computeRecipes() {
  return RECIPES.map(r => {
    const missing = r.ingredients.filter(i => !state.selected.has(i));
    const owned = r.ingredients.filter(i => state.selected.has(i));
    const totalPrice = r.ingredients.reduce((sum, i) => sum + (PRICE[i] || 0), 0);
    return { ...r, missing, owned, missingCount: missing.length, totalPrice };
  });
}

// ---- 화면 렌더 ----

const CATEGORY_ICONS = {
  '채소': '🥕',
  '육류·해산물': '🐟',
  '가공식품': '📦',
  '곡류': '🍚',
  '양념': '🌶️',
};

function renderTopNav() {
  const navLink = (label, action, activeWhen) => `<div class="nav-link${activeWhen.includes(state.screen) ? ' active' : ''}" data-action="${action}">${label}</div>`;
  return `
  <div class="topnav">
    <div class="brand"><img class="brand-mascot" src="assets/마스코트 끼니.png" alt="끼니픽"><span>끼니픽</span></div>
    <div class="nav-links">
      ${navLink('냉장고', 'go-fridge', ['fridge'])}
      ${navLink('홈', 'go-home', ['home'])}
      ${navLink('레시피', 'go-home', [])}
    </div>
    <div class="nav-search">🔍 레시피 검색</div>
  </div>`;
}

function renderFridgeScreen() {
  const chips = (INGREDIENTS_BY_CAT[state.category] || []).map(name => {
    const on = state.selected.has(name);
    return `<div class="ingredient-chip${on ? ' selected' : ''}" data-action="toggle-ingredient" data-value="${name}">${on ? '✓ ' : ''}${name}</div>`;
  }).join('');

  const tabs = CATEGORIES.map(cat => `
    <div class="category-tab${cat === state.category ? ' active' : ''}" data-action="set-category" data-value="${cat}">
      <span class="category-icon">${CATEGORY_ICONS[cat] || '🍽️'}</span>
      <span class="category-label">${cat}</span>
    </div>`).join('');

  return `
  <div class="fridge-scene">
    <div class="fridge-hero">
      <div class="fridge-photo-frame">
        <img class="fridge-photo" src="assets/냉장고-Photoroom.png" alt="열린 냉장고를 들여다보는 기니">
      </div>

      <div class="ingredient-panel">
        <div class="panel-header">
          <div class="panel-title">🧺 냉장고에 뭐가 있나요?</div>
          <div class="panel-search">🔍 재료 검색...</div>
        </div>
        <div class="category-tabs">${tabs}</div>
        <div class="ingredient-grid">
          ${chips}
          <div class="chip-more" title="추후 지원 예정">+ 더보기</div>
        </div>
        <div class="done-btn" data-action="go-home">완료 (${state.selected.size}) ✓</div>
      </div>
    </div>
  </div>`;
}

function recipeCard(r, showMissing, index) {
  const palette = CARD_PALETTE[index % CARD_PALETTE.length];
  const emojiFallback = `this.replaceWith(Object.assign(document.createElement('div'),{className:'recipe-thumb-emoji',textContent:'${r.emoji}'}))`;
  const thumbInner = r.youtubeId
    ? `<img class="recipe-thumb-photo" src="https://img.youtube.com/vi/${r.youtubeId}/hqdefault.jpg" alt="${r.name}" onerror="${emojiFallback}">`
    : `<div class="recipe-thumb-emoji">${r.emoji}</div>`;
  return `
  <div class="recipe-card" data-action="open-recipe" data-value="${r.name}">
    <div class="recipe-thumb" style="background:${palette}">
      ${thumbInner}
      <span class="time-badge">${r.timeMin}분</span>
    </div>
    <div class="recipe-name">${r.name}</div>
    ${showMissing ? `<div class="missing-badge">${r.missingCount}개만 더 있으면</div>` : ''}
    <div class="recipe-foot">
      <span class="recipe-price">${r.totalPrice.toLocaleString()}원</span>
      <span class="recipe-clock" aria-hidden="true">🕐</span>
    </div>
  </div>`;
}

function renderHomeScreen() {
  const computed = computeRecipes();
  const priceSort = state.sortOrder === '가격 높은순' ? (a, b) => b.totalPrice - a.totalPrice : (a, b) => a.totalPrice - b.totalPrice;
  const sectionA = computed.filter(r => r.missingCount === 0).sort(priceSort);
  const sectionB = computed.filter(r => r.missingCount >= 1 && r.missingCount <= 2).sort(priceSort);
  const sectionAll = [...computed].sort(priceSort);

  const foodTypeChips = FOOD_TYPES.map(f => `<div class="filter-chip${f === state.foodType ? ' active' : ''}" data-action="set-foodtype" data-value="${f}">${f}</div>`).join('');
  const cookTimeChips = COOK_TIMES.map(t => `<div class="filter-chip${t === state.cookTime ? ' active' : ''}" data-action="set-cooktime" data-value="${t}">${t}</div>`).join('');
  const sortChips = SORT_OPTIONS.map(s => `<div class="filter-chip${s === state.sortOrder ? ' active' : ''}" data-action="set-sort" data-value="${s}">${s}</div>`).join('');

  return `
  <div class="home-wrap">
  <div class="promo-carousel">
    <div class="carousel-arrow" data-action="noop" aria-label="이전 슬라이드">‹</div>
    <div class="home-top">
      <div class="promo-banner">
        <div class="veggie" style="top:6px;left:118px"><span class="pct-badge">-20%</span>${svgDoodle('carrot', 32)}</div>
        <div class="veggie" style="top:0px;left:172px"><span class="pct-badge">-30%</span>${svgDoodle('garlic', 28)}</div>
        <div class="veggie" style="top:10px;left:222px"><span class="pct-badge">30%</span>${svgDoodle('tomato', 30)}</div>
        <div class="veggie" style="bottom:16px;left:132px"><span class="pct-badge">-30%</span>${svgDoodle('jar', 26)}</div>
        <div class="veggie" style="bottom:10px;left:198px"><span class="pct-badge">90%</span>${svgDoodle('mushroom', 28)}</div>
        <div class="veggie" style="bottom:2px;left:12px">${svgDoodle('potato', 26)}</div>
        <h2>끼니픽 주간 특가!<br>신선 재료 최대 30%↓</h2>
        <span class="promo-cta">쇼핑하기</span>
      </div>
      <div class="promo-card">
        ${svgMascot(56, { hat: true, spoon: true })}
        <p>혼자 만들기 좋은<br>신메뉴!</p>
      </div>
    </div>
    <div class="carousel-arrow" data-action="noop" aria-label="다음 슬라이드">›</div>
  </div>
  <div class="promo-dots"><span class="dot active"></span><span class="dot"></span></div>

  <div class="filter-row">
    <div class="filter-col">
      <span class="filter-label">음식 종류</span>
      <div class="filter-group">${foodTypeChips}</div>
    </div>
    <div class="filter-col">
      <span class="filter-label">조리 시간</span>
      <div class="filter-group">${cookTimeChips}</div>
    </div>
    <div class="filter-col">
      <span class="filter-label">정렬</span>
      <div class="filter-group">${sortChips}</div>
    </div>
    <div class="filter-edit" title="필터 더보기">✏️</div>
  </div>

  <div class="section-heading">
    <div class="section-title">지금 바로 만들 수 있어요<span class="dot"></span></div>
    <span class="section-link">전체보기</span>
  </div>
  <div class="recipe-grid">${sectionA.map((r, i) => recipeCard(r, false, i)).join('') || '<p>조건에 맞는 요리가 없어요.</p>'}</div>

  <div class="section-heading">
    <div class="section-title">재료 조금만 사면 돼요 🛒</div>
    <span class="section-link">더 보기</span>
  </div>
  <div class="recipe-grid">${sectionB.map((r, i) => recipeCard(r, true, i)).join('') || '<p>조건에 맞는 요리가 없어요.</p>'}</div>

  <div class="section-heading">
    <div class="section-title">전체 둘러보기 (가격순)</div>
  </div>
  <div class="recipe-grid">${sectionAll.map((r, i) => recipeCard(r, false, i)).join('')}</div>
  </div>
  `;
}

function renderDetailScreen() {
  const computed = computeRecipes();
  const detail = computed.find(r => r.name === state.selectedRecipe) || computed[0];
  const bannerText = detail.missingCount === 0 ? '지금 있는 재료로 완성돼요' : `재료 ${detail.missingCount}개만 더 있으면 완성돼요`;
  const bannerBg = detail.missingCount === 0 ? 'var(--banner-safe)' : 'var(--banner-warn)';

  const missingRows = detail.missing.map(name => `
    <div class="ingredient-row">
      <div>
        <div class="name">${name}</div>
        <div class="price">${(PRICE[name] || 0).toLocaleString()}원</div>
      </div>
      <a class="buy-link" href="https://search.shopping.naver.com/search/all?query=${encodeURIComponent(name)}" target="_blank" rel="noopener">네이버 구매</a>
    </div>`).join('') || `<div class="no-missing">구매할 재료가 없어요!</div>`;

  const ownedRows = detail.owned.map(name => `<div class="owned-row"><span class="check">✓</span>${name}</div>`).join('');

  const hasMissing = detail.missing.length > 0;
  const aggregateUrl = hasMissing ? `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(detail.missing.join(' '))}` : '';

  return `
  <div class="detail-wrap">
    <div class="detail-hero">
      <div class="deco" style="left:20px;top:18px">${svgDoodle('carrot', 32)}</div>
      <div class="deco" style="right:24px;top:16px">${svgDoodle('chili', 34)}</div>
      <div class="deco" style="left:30px;bottom:18px">${svgDoodle('mushroom', 30)}</div>
      <div class="deco" style="right:26px;bottom:16px">${svgDoodle('garlic', 30)}</div>
      <div class="dish">${svgDish(detail.variant, detail.colors)}</div>
    </div>

    <div class="detail-title-block">
      <div class="detail-title">${detail.name}</div>
      <div class="detail-banner" style="background:${bannerBg}">${bannerText}</div>
    </div>

    <div class="ingredients-grid">
      <div class="missing-panel">
        <div class="panel-title">구매 필요</div>
        ${missingRows}
      </div>
      <div class="owned-panel">
        <div class="panel-title">보유</div>
        ${ownedRows}
      </div>
    </div>

    <div class="tip-row">
      <div class="tip-bubble">Tip: ${TIPS[detail.name] || '재료를 신선하게 준비해두면 더 맛있어요!'}</div>
      ${svgMascot(56, { hat: true })}
    </div>

    <a class="youtube-link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(detail.name + ' 레시피')}" target="_blank" rel="noopener">▶ 유튜브에서 만드는 법 보기</a>

    <div class="price-bar">
      <div>
        <div class="label">1인분 총 재료비</div>
        <div class="amount">${detail.totalPrice.toLocaleString()}원</div>
      </div>
      ${hasMissing
        ? `<a class="buy-all" href="${aggregateUrl}" target="_blank" rel="noopener">네이버에서 재료 구매</a>`
        : `<div class="ready">재료 준비 완료!</div>`}
    </div>
  </div>`;
}

function render() {
  const body = state.screen === 'fridge' ? renderFridgeScreen()
    : state.screen === 'home' ? renderHomeScreen()
    : renderDetailScreen();

  document.getElementById('app').innerHTML = `
    ${renderTopNav()}
    <div class="screen">${body}</div>
  `;
}

document.getElementById('app').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const value = el.dataset.value;

  if (action === 'back') state.screen = state.screen === 'detail' ? 'home' : 'fridge';
  else if (action === 'go-fridge') state.screen = 'fridge';
  else if (action === 'noop') return;
  else if (action === 'set-category') state.category = value;
  else if (action === 'toggle-ingredient') {
    if (state.selected.has(value)) state.selected.delete(value); else state.selected.add(value);
  }
  else if (action === 'go-home') state.screen = 'home';
  else if (action === 'set-foodtype') state.foodType = value;
  else if (action === 'set-cooktime') state.cookTime = value;
  else if (action === 'set-sort') state.sortOrder = value;
  else if (action === 'open-recipe') { state.selectedRecipe = value; state.screen = 'detail'; }
  else return;

  render();
});

render();
