// ============================================================
// engine/policy.js — "다음에 뭘 할지"는 LLM이 아니라 코드가 정한다.
//   → 진단이 이상하면 프롬프트가 아니라 이 숫자를 고친다. 디버깅 가능.
// ============================================================
import { entropy, infoGain, score, ranked, label } from "./core.js";

// ★ 이 숫자들은 지어낸 게 아니라 engine/tune.js 그리드 스윕(144조합)으로 뽑았다.
//   근거: reports/tuning.md — 최악 원인 정확도 0% → 45%로 복구시킨 조합.
//   MIN_GAIN=0.15는 실패했다: 냉장고를 가릴 2번째 질문(IG 0.19)이 막혀 영구 오답.
export const T = {
  PROPOSE: 0.60,   // 스윕은 0.40을 추천했으나 채택 안 함: 40% 확신으로 단정하는 건
                   //   시뮬엔 유리해도 실사용에선 성급하다. 안전 마진 확보.
  GAP: 0.10,       // 1·2위 마진
  MIN_GAIN: 0.08,  // v1에선 0.15가 치명적이었으나 v2(판별축 추가)에선 무감해짐.
                   //   → 임계값 튜닝은 KB 결함의 증상 치료. 근본은 KB를 고치는 것.
  MAX_TURNS: 4,
  LAMBDA: 1.0,     // 비용 민감도 (탭1.0 < 사진3.0 < 물리행동4.0)
};

export function bestQuestion(kb, post, asked, T_ = T) {
  let best = null;
  for (const obs of kb.observables) {
    if (asked.has(obs.id)) continue;               // 같은 질문 반복 금지
    const ig = infoGain(post, obs);
    const sc = score(post, obs, T_.LAMBDA);
    if (ig < T_.MIN_GAIN) continue;                // ★ 뻔한 질문 필터
    if (!best || sc > best.score) best = { obs, ig, score: sc };
  }
  return best;
}

export function decide(kb, state, T_ = T) {
  const { posterior: post, turn, asked, verified } = state;
  const r = ranked(post);
  const top = r[0], second = r[1] ?? { p: 0 };

  // 1) 확신 → 제시
  if (top.p >= T_.PROPOSE && top.p - second.p >= T_.GAP)
    return { move: "PROPOSE", top, label: label(top.p), H: entropy(post) };

  // 2) 턴 소진 → 가정하고 진행. 계속 묻지 않는다.
  if (turn >= T_.MAX_TURNS)
    return { move: "ASSUME_AND_PROPOSE", top, label: label(top.p),
             why: "확정 못했지만 가장 유력", H: entropy(post) };

  // 3) 물을 가치 있는 질문
  const q = bestQuestion(kb, post, asked, T_);
  if (q) return { move: "ASK", obs: q.obs, ig: q.ig, score: q.score, H: entropy(post) };

  // 4) 물어도 안 갈림 → 눈으로 확인 (사진/행동)
  const v = kb.hypotheses[top.id]?.verify;
  if (v && !verified.has(top.id))
    return { move: "VERIFY", top, action: v, H: entropy(post) };

  // 5) 더 할 게 없음
  return { move: "ASSUME_AND_PROPOSE", top, label: label(top.p),
           why: "추가 질문으로 갈리지 않음", H: entropy(post) };
}

export const initState = (kb) => ({
  posterior: Object.fromEntries(
    Object.entries(kb.hypotheses).map(([k, v]) => [k, v.prior])
  ),
  turn: 0,
  asked: new Set(),
  verified: new Set(),
});
