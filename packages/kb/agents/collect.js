// ============================================================
// agents/collect.js — 여기만 LLM. 그것도 "번역"만 시킨다.
//   스카우트: 웹검색 → 본문
//   추출자  : 본문 1개 → 카드 1개 (판단 아님, 구조화)
//   ★ 절대 KB(확률)를 LLM에게 만들게 하지 않는다.
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";

const client = new Anthropic();          // ANTHROPIC_API_KEY 환경변수
const MODEL = "claude-sonnet-4-6";

// ── 스카우트: 검색 + 본문 수집 (web_search 툴을 LLM에 붙임) ──
export async function scout(spec, { perQuery = 5 } = {}) {
  const docs = [];
  for (const q of spec.queries) {
    const r = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [{
        role: "user",
        content:
`"${q}" 를 검색해서, 실제로 원인과 해결책을 설명하는 글 ${perQuery}개를 찾아줘.
광고성 업체 홍보글, 제품 판매글은 제외. 커뮤니티 경험담/전문가 설명/청소업체 정보글 위주.

각 글마다 JSON으로:
{"url":"...","title":"...","body":"원인·증상·해결책이 담긴 본문 요약 (600자 이내, 원문 표현 유지하지 말고 요약)"}

배열만 출력. 설명/마크다운 금지.`
      }],
    });
    const txt = r.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    docs.push(...safeJSON(txt, []));
    process.stdout.write(`  🔎 ${q} → 누적 ${docs.length}건\n`);
  }
  // URL 중복 제거
  const seen = new Set();
  return docs.filter(d => d.url && !seen.has(d.url) && seen.add(d.url));
}

// ── 추출자: 본문 1개 → 카드 1개 ──
export async function extract(doc, spec) {
  const axisSpec = Object.entries(spec.axes)
    .map(([k, v]) => `  "${k}": ${JSON.stringify(v)}`).join(",\n");

  // ★ 가장 치명적인 실패 모드 방지: cause id가 문서마다 다르게 나오면
  //   (drain_smell / drain_organic / sink_drain_rot ...) 집계가 통째로 무너진다.
  //   → 허용 id를 enum으로 못박는다.
  const allowed = spec.causes.map(c => `"${c.id}" (${c.label})`).join(", ");

  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
`너는 문서를 구조화하는 추출기다. 추론하거나 지어내지 마라.
문서에 없는 내용은 "unspecified" 또는 빈 배열로 둔다.
확률·빈도 숫자는 절대 만들지 마라 (그건 다른 단계가 한다).`,
    messages: [{
      role: "user",
      content:
`[문서]
제목: ${doc.title}
본문: ${doc.body}

[작업] 이 문서에서 다음을 뽑아 JSON 하나로:
{
  "mentions": [
    { "cause": "아래 허용 목록 중 하나만",
      "rank": "primary" | "secondary",   // 이 글이 주원인으로 지목했는가
      "solution": "해결책 1~2문장 (문서에 있으면)",
      "verify": "자가 확인 방법 (문서에 있으면)" }
  ],
  "axes": {
${axisSpec}
  },
  "unlisted": ["허용 목록에 없지만 이 문서가 중요하게 다룬 원인 (있으면 자유롭게 적어라)"]
}

[규칙 — 반드시 지킬 것]
1. "cause"는 ★반드시 아래 허용 목록의 id 중 하나★. 임의로 만들지 마라:
   ${allowed}
2. 목록에 없는 원인은 mentions에 넣지 말고 "unlisted"에 자연어로 적어라.
3. axes는 위 목록의 값 중 하나만. 문서가 언급 안 했으면 "unspecified".
4. 문서가 원인을 안 다루면 {"mentions":[],"axes":{},"unlisted":[]} 반환.
5. JSON만 출력. 마크다운 코드펜스·설명 금지.`
    }],
  });

  const txt = r.content.filter(b => b.type === "text").map(b => b.text).join("");
  const card = safeJSON(txt, { mentions: [], axes: {}, unlisted: [] });

  // enum 위반 필터 + label 주입 (spec이 진실의 원천)
  const byId = Object.fromEntries(spec.causes.map(c => [c.id, c.label]));
  const violations = [];
  card.mentions = (card.mentions ?? []).filter(m => {
    if (byId[m.cause]) { m.label = byId[m.cause]; return true; }
    violations.push(m.cause);
    return false;
  });
  if (violations.length) card._violations = violations;   // 로그용

  return { url: doc.url, title: doc.title, ...card };
}

// ── 실행기 ──
export async function collect(spec, opts = {}) {
  console.log(`\n📋 [스카우트] ${spec.title} — 검색어 ${spec.queries.length}개`);
  const docs = await scout(spec, opts);
  fs.writeFileSync(`kb/raw/${spec.domain}.json`, JSON.stringify(docs, null, 2));
  console.log(`✅ 문서 ${docs.length}건 수집\n`);

  console.log(`📋 [추출자] 문서 → 카드`);
  const cards = [], allViolations = [], allUnlisted = [];
  let empty = 0;
  for (const [i, d] of docs.entries()) {
    try {
      const c = await extract(d, spec);
      allViolations.push(...(c._violations ?? []));
      allUnlisted.push(...(c.unlisted ?? []));
      if (c.mentions?.length) cards.push(c); else empty++;
      process.stdout.write(`  📄 ${i + 1}/${docs.length} 원인 ${c.mentions?.length ?? 0}개  ${(d.title ?? "").slice(0, 30)}\n`);
    } catch (e) { console.log(`  ⚠️  ${i + 1} 실패: ${e.message}`); }
  }
  fs.writeFileSync(`kb/cards/${spec.domain}.json`, JSON.stringify(cards, null, 2));

  // ── ★ 자기 진단: 무엇을 고쳐야 하는지 스스로 알려준다 ──
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊 수집 진단`);
  console.log(`   문서 ${docs.length}건 → 카드 ${cards.length}장 (원인 언급 없는 글 ${empty}건)`);

  const mentionCount = {};
  for (const c of cards) for (const m of c.mentions) mentionCount[m.cause] = (mentionCount[m.cause] ?? 0) + 1;
  console.log(`\n   원인별 언급 수:`);
  for (const { id, label } of spec.causes) {
    const n = mentionCount[id] ?? 0;
    console.log(`     ${String(n).padStart(3)}건  ${label}${n < 3 ? "  ⚠️ 근거 부족 (3건 미만)" : ""}`);
  }

  // 축별 응답률 — unspecified가 많으면 그 축은 집계 불가
  console.log(`\n   축별 응답률 (unspecified 아닌 비율):`);
  for (const axis of Object.keys(spec.axes)) {
    const got = cards.filter(c => c.axes?.[axis] && c.axes[axis] !== "unspecified").length;
    const rate = cards.length ? got / cards.length : 0;
    console.log(`     ${(rate * 100).toFixed(0).padStart(3)}%  ${axis}${rate < 0.3 ? "  ⚠️ 문서가 이 축을 거의 안 다룸" : ""}`);
  }

  if (allViolations.length) {
    const v = [...new Set(allViolations)];
    console.log(`\n   🔴 enum 위반 (버려짐) ${allViolations.length}건: ${v.slice(0, 8).join(", ")}`);
    console.log(`      → spec.js의 causes에 추가하거나, 무시해도 되는지 판단할 것`);
  }
  if (allUnlisted.length) {
    console.log(`\n   💡 목록에 없던 원인 (KB 확장 단서):`);
    const u = [...new Set(allUnlisted)].slice(0, 8);
    u.forEach(x => console.log(`      · ${x}`));
  }

  console.log(`\n${"─".repeat(60)}`);
  if (cards.length < spec.minCards) {
    console.log(`🔴 카드 ${cards.length} < 최소 ${spec.minCards}. 통계가 안 됩니다.`);
    console.log(`   대응: (1) spec.js의 queries를 늘리거나 더 구체적으로`);
    console.log(`         (2) collect의 perQuery를 올리기: collect(spec, {perQuery: 8})`);
  } else {
    console.log(`✅ 카드 ${cards.length}장. 다음: node run.js build ${spec.domain}`);
  }
  return cards;
}

function safeJSON(txt, fallback) {
  const s = txt.replace(/```json|```/g, "").trim();
  try { return JSON.parse(s); } catch {}
  const m = s.match(/[\[{][\s\S]*[\]}]/);          // 앞뒤 잡소리 제거
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return fallback;
}
