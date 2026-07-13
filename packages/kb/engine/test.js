import { entropy, bayes, infoGain, normalize } from "./core.js";

let pass = 0, fail = 0;
const eq = (name, got, want, tol = 0.01) => {
  const ok = Math.abs(got - want) < tol;
  console.log(`${ok ? "✅" : "❌"} ${name}: got ${got.toFixed(3)}, want ~${want}`);
  ok ? pass++ : fail++;
};

// 손계산에서 쓴 사전확률
const prior = normalize({
  drain_organic: 0.35, trap_dry: 0.20, food_waste: 0.15,
  mold_under_sink: 0.12, fridge_spoiled: 0.10, sponge_dishcloth: 0.08,
});

// --- 1. 엔트로피: 손계산 2.40 bit ---
eq("H0 (초기 엔트로피)", entropy(prior), 2.40);

// --- 2. 균등분포 6개 = log2(6) = 2.585 ---
eq("H(균등6)", entropy(normalize({a:1,b:1,c:1,d:1,e:1,f:1})), 2.585);

// --- 3. 확정분포 = 0 ---
eq("H(확정)", entropy({a: 1.0, b: 0}), 0);

// --- 4. 베이즈: rotten_egg 후 손계산 사후 ---
const L_egg = { drain_organic:0.70, trap_dry:0.80, food_waste:0.10,
                mold_under_sink:0.05, fridge_spoiled:0.10, sponge_dishcloth:0.05 };
const post = bayes(prior, L_egg);
eq("P(drain|egg) 손계산 0.557", post.drain_organic, 0.557);
eq("P(trap|egg)  손계산 0.364", post.trap_dry, 0.364);
eq("사후 합 = 1", Object.values(post).reduce((a,b)=>a+b,0), 1.0);
eq("H1 (계란냄새 후)", entropy(post), 1.44, 0.03);

// --- 5. 중립 우도 = 사후 불변 (모르겠어요 처리) ---
const same = bayes(prior, {});
eq("빈 우도 → prior 불변", same.drain_organic, prior.drain_organic);
eq("빈 우도 → 엔트로피 불변", entropy(same), entropy(prior));

// --- 6. ★ 뻔한 질문의 IG = 0 (프로젝트 핵심 주장) ---
const dumb = { id:"ventilation", cost:1,
  options:{ yes:{L:{}}, no:{L:{}} } };   // 아무것도 안 가름
eq("IG(환기하세요?) = 0", infoGain(prior, dumb), 0);

// --- 7. 좋은 질문의 IG > 0 ---
const smart = { id:"smell_type", cost:1, options:{
  rotten_egg:   {L:L_egg},
  sour_musty:   {L:{ mold_under_sink:0.80, sponge_dishcloth:0.70, trap_dry:0.05, drain_organic:0.20, food_waste:0.30, fridge_spoiled:0.20 }},
  sweet_rotten: {L:{ food_waste:0.80, fridge_spoiled:0.70, trap_dry:0.05, mold_under_sink:0.05, drain_organic:0.20, sponge_dishcloth:0.10 }},
}};
const ig = infoGain(prior, smart);
eq("IG(냄새종류) 손계산 ~0.56", ig, 0.56, 0.08);
console.log(`\n   → 뻔한질문 0.000 vs 좋은질문 ${ig.toFixed(3)}  :: MIN_GAIN=0.15가 정확히 갈라냄`);

// --- 8. IG는 항상 >= 0 (이론 보장) ---
eq("IG >= 0", Math.min(infoGain(prior, dumb), infoGain(prior, smart)) >= 0 ? 1 : 0, 1);

console.log(`\n${fail===0 ? "🎉" : "💥"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
