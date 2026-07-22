// Step 1-b: AI 대화(ADR-008). 두 모드 — mode="estimate"(공식 결과 없을 때 간이 추정) /
// mode="supplement"(공식·추정으로 확정된 유형을 대화 근거로 보충, 유형은 바꾸지 않음).
// 공식 판정 아님 · 동의 후 대화 원문을 backend 프록시로만 보낸다. 원문은 저장하지 않는다(연구 경로 분리).
import { useState } from "react";
import { estimateMbtiFromChat } from "../../lib/api";

// ≈2회 대화. 원문은 이 경로에서만 쓰고 저장하지 않는다.
const ESTIMATE_PROMPTS = [
  "새로운 일을 시작할 때, 계획을 먼저 촘촘히 세우는 편인가요, 일단 해보며 맞춰가는 편인가요? 편하게 적어주세요.",
  "여러 사람과 함께 있을 때 에너지가 차오르나요, 혼자 정리할 때 회복되나요? 그리고 결정할 때 논리와 감정 중 무엇을 더 따르나요?",
];
const SUPPLEMENT_PROMPTS = [
  "요즘 공부할 때 어떤 환경과 방식에서 가장 집중이 잘 되나요? 최근 경험을 편하게 적어주세요.",
  "계획이 밀리거나 지칠 때 보통 어떻게 다시 시작하나요? 새로운 내용을 익힐 때 즐겨 쓰는 방법이 있다면 함께 적어주세요.",
];

export function StepMbtiChat({
  onEstimated,
  onFallback,
  onBack,
  onHome,
  mode = "estimate",
  knownMbti = "",
  onSupplemented,
  onSkip,
}) {
  const supplement = mode === "supplement";
  const PROMPTS = supplement ? SUPPLEMENT_PROMPTS : ESTIMATE_PROMPTS;
  const [turn, setTurn] = useState(0);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitTurn() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setDraft("");

    if (turn + 1 < PROMPTS.length) {
      setTurn(turn + 1);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await estimateMbtiFromChat(nextMessages, supplement ? knownMbti : "");
      if (supplement) {
        // 보충 모드: 실패해도 흐름을 막지 않는다(근거 없이 진행). 성공 시 근거만 붙인다.
        if (!res?.available || !res.mbti) {
          onSkip?.();
          return;
        }
        onSupplemented?.({
          rationale: res.rationale,
          uncertainty: res.uncertainty,
          observedSignals: res.observedSignals ?? [],
        });
        return;
      }
      if (!res?.available) {
        onFallback("지금은 AI 추정을 쓸 수 없어요. 규칙 설문으로 계속 진행할게요.");
        return;
      }
      if (!res.mbti) {
        onFallback("대화만으로는 유형을 뚜렷이 추정하기 어려웠어요. 규칙 설문으로 계속 진행할게요.");
        return;
      }
      onEstimated(res.mbti, {
        confidence: res.confidence,
        rationale: res.rationale,
        uncertainty: res.uncertainty,
        observedSignals: res.observedSignals ?? [],
      });
    } catch {
      if (supplement) {
        onSkip?.();
      } else {
        onFallback("추정 중 문제가 생겼어요. 규칙 설문으로 계속 진행할게요.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <p className="eyebrow">Step 1 · 선택</p>
      {supplement ? (
        <>
          <h2>AI와 짧게 대화해 근거 보충</h2>
          <p>
            확정한 유형 <strong>{knownMbti}</strong>을(를) <strong>바꾸지 않고</strong>, 짧은 대화에서 관찰된 일상 근거로
            추천의 근거를 보충합니다. 결과 화면에 "AI 대화에서 관찰된 근거"로 함께 보여집니다. 원하지 않으면 건너뛸 수 있습니다.
          </p>
        </>
      ) : (
        <>
          <h2>AI와 짧게 대화해 유형 간이 추정</h2>
          <p>
            공식 MBTI 결과가 없을 때, 짧은 대화로 유형을 <strong>간이 추정</strong>해 공부법 매칭에 씁니다.
            이것은 <strong>공식 판정이 아니라 탐색적 추정</strong>이며, 결과 화면에 한계 고지를 함께 보여줍니다.
          </p>
        </>
      )}

      {!consent ? (
        <div className="feedback-card" style={{ marginTop: 12 }}>
          <p className="eyebrow">외부 처리 동의</p>
          <ul>
            <li>이 대화 내용은 <strong>외부 LLM(Google Gemini)</strong>으로 전송되어 {supplement ? "근거를 보충" : "유형을 추정"}합니다.</li>
            <li>대화 원문은 연구 데이터로 <strong>저장하지 않습니다</strong>({supplement ? "근거 보완에만" : "추정에만"} 사용).</li>
            <li>이름·연락처 등 개인정보는 입력하지 마세요. 동의하지 않아도 {supplement ? "그냥 다음 단계로 진행" : "규칙 설문으로 진행"}할 수 있습니다.</li>
          </ul>
          <label className="checkline">
            <input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" />
            위 내용을 이해했고, 대화 원문의 외부 처리에 동의합니다.
          </label>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="secondary" onClick={onBack} type="button">이전</button>
            {supplement ? (
              <button className="secondary" onClick={() => onSkip?.()} type="button">건너뛰고 설문으로</button>
            ) : (
              <button className="secondary" onClick={() => onFallback("규칙 설문으로 진행할게요.")} type="button">
                동의 없이 설문으로
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <p className="hint">{turn + 1} / {PROMPTS.length}</p>
          <p className="lead">{PROMPTS[turn]}</p>
          <textarea
            aria-label="대화 응답"
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="편하게 적어주세요. 개인정보는 입력하지 마세요."
            value={draft}
          />
          {error && <p className="hint" style={{ color: "var(--accent-strong)" }}>{error}</p>}
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="secondary" onClick={onHome} type="button">처음 화면</button>
            {supplement && (
              <button className="secondary" onClick={() => onSkip?.()} type="button">건너뛰기</button>
            )}
            <button className="primary" disabled={loading || !draft.trim()} onClick={submitTurn} type="button">
              {loading
                ? (supplement ? "보충 중…" : "추정 중…")
                : turn + 1 < PROMPTS.length
                  ? "다음"
                  : supplement ? "근거 보충하기" : "유형 추정하기"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
