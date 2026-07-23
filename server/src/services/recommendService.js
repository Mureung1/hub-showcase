// 자동 추천받기: 몇 곳/꼭 넣고 싶은 곳/좋아하는 빵/커피 페어링 조건으로 빵집을 고른다.
// 조건에 맞는 곳이 부족하면 순서대로 완화한다: 빵 스타일 해제 → 커피 조건 해제 → 있는 만큼만 사용.
// (꼭 넣고 싶은 곳은 완화 대상이 아니라 항상 그대로 포함한다.)

// signature_menu는 자유 텍스트라 카테고리명을 그대로 부분일치하면 놓치는 경우가 있다
// (예: "팥빵"이라 적힌 곳은 "단팥빵"으로 검색하면 안 걸림 — 포함 관계가 반대 방향).
// 카테고리 하나당 키워드를 여러 개 매핑해서 매칭한다. 데이터가 늘어날 때마다 같이 다듬어야 하는 항목.
const STYLE_KEYWORDS = {
  크루아상: ['크루아상'],
  식빵: ['식빵'],
  단팥빵: ['단팥빵', '팥빵'],
  스콘: ['스콘'],
  바게트: ['바게트'],
};

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// styles: 선택된 카테고리 배열(다중 선택) — 그중 하나라도 매칭되면 통과(OR 조건).
function matchesAnyStyle(bakery, styles) {
  if (!bakery.signature_menu) return false;
  return styles.some((style) => (STYLE_KEYWORDS[style] || []).some((k) => bakery.signature_menu.includes(k)));
}

// bakeries: [{id, lat, lng, signature_menu, has_coffee, ...}]
// styles: string[] (다중 선택, 빈 배열이면 조건 없음)
// 반환: { picked, styleApplied, coffeeApplied }
export function selectRecommendedBakeries(bakeries, { count, mustIncludeId, styles, wantsCoffee }) {
  const must = mustIncludeId != null ? bakeries.find((b) => b.id === mustIncludeId) : null;
  const rest = bakeries.filter((b) => b.id !== mustIncludeId);
  const need = count - (must ? 1 : 0);

  let pool = rest;
  let styleApplied = false;
  let coffeeApplied = false;

  if (styles?.length) {
    const matched = rest.filter((b) => matchesAnyStyle(b, styles));
    if (matched.length >= need) {
      pool = matched;
      styleApplied = true;
    }
  }

  if (wantsCoffee) {
    const matched = pool.filter((b) => b.has_coffee);
    if (matched.length >= need) {
      pool = matched;
      coffeeApplied = true;
    } else if (styleApplied) {
      // 스타일 조건까지 걸어서 부족했던 거라면, 스타일을 풀고 커피 조건만으로 다시 시도
      const withoutStyle = rest.filter((b) => b.has_coffee);
      if (withoutStyle.length >= need) {
        pool = withoutStyle;
        styleApplied = false;
        coffeeApplied = true;
      } else {
        pool = rest;
        styleApplied = false;
      }
    } else {
      pool = rest;
    }
  }

  const picked = shuffle(pool).slice(0, Math.min(need, pool.length));
  return { picked: must ? [must, ...picked] : picked, styleApplied, coffeeApplied };
}
