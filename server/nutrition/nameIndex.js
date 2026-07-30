// 자모 bi-gram 역색인 — "이름 하나 → 후보 여러 개"를 0ms에 회수하는 retrieval 레이어.
//
// ── 왜 필요한가 ──
// nameMatcher의 부분포함·편집거리 단계는 **답을 하나만** 돌려준다. 그 하나가 틀리면 끝이고, 실제로
// 자주 틀린다(실측: 치킨→제육, 파스타→토스트, 콩자반→간자장). 뒤의 유사도 게이트는 그 하나를
// 통과/탈락시킬 수만 있지 **더 나은 후보로 바꿔줄 수는 없어서**, 게이트를 강화할수록 매칭 실패가
// 늘어나는 구조였다.
//
// 여기서는 순서를 뒤집는다 — **먼저 넓게 회수(retrieval)하고, 그다음 게이트로 고른다(rank).**
// 게이트가 여러 후보 중 최선을 고를 수 있게 되면, 게이트를 엄격하게 만들어도 매칭률이 떨어지지 않는다.
//
// ── 왜 자모 bi-gram인가 ──
// 음절 bi-gram은 `꽁치김치조림`↔`꽁치조림`에서 겹치는 게 `꽁치` 하나뿐이라 recall이 낮다. 자모로
// 풀면 조리법 꼬리(`ㅈㅗㄹㅣㅁ`)까지 잘게 겹쳐 후보로 끌어온다. 한국어 음식명의 지배적 형태가
// "재료가 가운데 끼어드는 것"이라 이 차이가 크다. 정밀도는 뒤의 게이트가 책임지므로, 여기서는
// recall만 신경 쓰면 된다.
//
// 색인은 서버 기동 후 첫 조회 때 1회 만든다(11,347종 기준 수십 ms). 빌드 산출물로 커밋하지 않는
// 이유는 foodDB.json과 따로 놀 수 있어서다 — 데이터가 하나면 색인도 하나여야 한다.
import { jamoBigrams } from '../../src/lib/hangul.js'
import { normalizeFoodName } from './textNormalize.js'

// 흔한 bi-gram(`ㅇㅣ`, `ㄱㅡ`…)은 거의 모든 이름에 들어 있어 후보를 좁히지 못하면서 비용만 든다.
// 전체의 이 비율을 넘는 bi-gram은 조회 때 건너뛴다(색인에는 남겨둬 희귀 질의가 손해 보지 않게 한다).
const STOP_GRAM_DOC_RATIO = 0.25

// 질의 하나가 훑을 포스팅 상한 — 이걸 넘으면 희귀한 bi-gram부터 쓰고 멈춘다. 최악의 경우
// (한 글자짜리 질의 등)에도 조회 시간이 선형으로 튀지 않게 하는 안전판이다.
const MAX_POSTINGS_SCANNED = 20000

// items: 임의의 레코드 배열. getName/getAliases는 nameMatcher와 같은 계약.
// 반환: search(rawName, limit) -> [{ item, score }] (score 내림차순)
export function createNameIndex(items, { getName, getAliases = () => [] } = {}) {
  // 이름 하나 = 문서 하나. 별칭은 같은 item을 가리키는 추가 문서로 넣는다(별칭으로도 회수되게).
  const docs = []
  for (const item of items) {
    const names = [getName(item), ...(getAliases(item) ?? [])]
    for (const name of names) {
      const normalized = normalizeFoodName(name)
      if (!normalized) continue
      const grams = jamoBigrams(normalized)
      if (grams.length === 0) continue
      docs.push({ item, gramCount: grams.length, grams })
    }
  }

  const postings = new Map() // bigram -> docIndex[]
  for (const [docIndex, doc] of docs.entries()) {
    // 같은 bi-gram이 한 이름에 여러 번 나와도 문서는 한 번만 등록한다(중복 가산 방지).
    for (const gram of new Set(doc.grams)) {
      let list = postings.get(gram)
      if (!list) postings.set(gram, (list = []))
      list.push(docIndex)
    }
  }

  const stopThreshold = docs.length * STOP_GRAM_DOC_RATIO

  return function search(rawName, limit = 8) {
    const query = normalizeFoodName(rawName)
    if (!query) return []
    const queryGrams = [...new Set(jamoBigrams(query))]
    if (queryGrams.length === 0) return []

    // 희귀한(포스팅이 짧은) bi-gram부터 훑는다 — 같은 예산으로 더 많은 정보를 얻는다.
    const usable = queryGrams
      .map((gram) => ({ gram, list: postings.get(gram) }))
      .filter((g) => g.list && g.list.length <= stopThreshold)
      .sort((a, b) => a.list.length - b.list.length)

    const hits = new Map() // docIndex -> 겹친 bi-gram 수
    let scanned = 0
    for (const { list } of usable) {
      if (scanned >= MAX_POSTINGS_SCANNED) break
      scanned += list.length
      for (const docIndex of list) hits.set(docIndex, (hits.get(docIndex) ?? 0) + 1)
    }
    if (hits.size === 0) return []

    // Dice 계수 — 길이가 다른 이름끼리 공정하게 비교하려면 교집합 크기만으론 안 된다
    // ("김치"가 "김치"보다 "김치찌개양념장"과 더 많이 겹치는 착시를 막는다).
    const scored = []
    for (const [docIndex, shared] of hits) {
      const doc = docs[docIndex]
      scored.push({ item: doc.item, score: (2 * shared) / (queryGrams.length + doc.gramCount) })
    }
    scored.sort((a, b) => b.score - a.score)

    // 같은 item이 이름·별칭 양쪽으로 걸리면 한 번만 남긴다(가장 높은 점수 유지 — 이미 정렬돼 있다).
    const seen = new Set()
    const unique = []
    for (const entry of scored) {
      if (seen.has(entry.item)) continue
      seen.add(entry.item)
      unique.push(entry)
      if (unique.length >= limit) break
    }
    return unique
  }
}
