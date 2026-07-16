import { Text } from "@astryxdesign/core/Text";
import type { Provider, Question } from "./types";
import { providerMeta } from "./mockData";
import "./chat.css";

/**
 * FinalAnswer 표시 (Step 7 확정 블록 순서).
 * [✓ 충돌 해결 완료 뱃지(카드 상단)] → [공통 권장 사항] → [결정 사항(사용자 판단 우선)]
 * → [제외한 항목] → [최종 답변 본문(상세 전문)] → [출처 AI].
 * 재생성 버튼은 만들지 않는다 (고정 정책).
 */
export function FinalAnswerBlock({ question }: { question: Question }) {
  const finalAnswer = question.finalAnswer;
  if (!finalAnswer) {
    return null;
  }

  // all-rejected: 고정 문구만 표시, 유도 버튼 없음 (Step 7-3)
  if (finalAnswer.generationMode === "all_agendas_rejected") {
    return (
      <div className="final-answer final-answer-rejected">
        <Text as="p" display="block">
          {finalAnswer.content}
        </Text>
      </div>
    );
  }

  const consensus = question.agendas.filter(
    (agenda) => agenda.resolutionReason === "auto_consensus",
  );
  const decisions = question.agendas.filter(
    (agenda) =>
      agenda.status === "passed" &&
      agenda.resolutionReason !== "auto_consensus",
  );
  const excluded = question.agendas.filter(
    (agenda) => agenda.status === "rejected",
  );
  const sourceProviders = question.sourceAnswers
    .filter((answer) => answer.status === "succeeded")
    .map((answer) => answer.provider);

  return (
    <div className="final-answer">
      {consensus.length > 0 && (
        <section className="final-block">
          <Text type="label" color="secondary" display="block">
            공통 권장 사항
          </Text>
          <ul className="final-consensus-list">
            {consensus.map((agenda) => (
              <li key={agenda.id}>
                <Text type="supporting">{agenda.selectedContent}</Text>
              </li>
            ))}
          </ul>
        </section>
      )}

      {decisions.length > 0 && (
        <section className="final-block">
          <Text type="label" color="secondary" display="block">
            결정 사항 · 사용자 판단 우선 적용
          </Text>
          {decisions.map((agenda) => (
            <div className="final-decision" key={agenda.id}>
              <Text type="label" display="block">
                ✓ {agenda.title}
              </Text>
              <Text type="supporting" display="block">
                {agenda.selectedContent}
              </Text>
            </div>
          ))}
        </section>
      )}

      {excluded.length > 0 && (
        <Text
          type="supporting"
          color="secondary"
          display="block"
          className="final-excluded"
        >
          최종 답변에서 제외한 항목: {excluded.map((a) => a.title).join(", ")}
        </Text>
      )}

      <section className="final-body">
        {finalAnswer.content.split("\n\n").map((paragraph, index) => (
          <Text key={index} as="p" display="block">
            {paragraph}
          </Text>
        ))}
      </section>

      {/* 단일 소스 기반 안내 각주 — 합의(Consensus)로 표현하지 않는다 (Step 7-4, T-009에서 노출) */}
      {finalAnswer.generationMode === "single_source_fallback" && (
        <Text type="supporting" color="secondary" display="block">
          일부 AI 답변을 불러오지 못해 하나의 답변만을 기반으로 결과를
          생성했습니다.
        </Text>
      )}

      <div className="final-sources">
        <Text type="supporting" color="secondary">
          출처
        </Text>
        {sourceProviders.map((provider) => (
          <span className="final-source-item" key={provider}>
            <span
              className="model-dot"
              style={{ background: `var(--model-${provider})` }}
            />
            <Text type="supporting">
              {providerMeta.find((meta) => meta.id === (provider as Provider))
                ?.label ?? provider}
            </Text>
          </span>
        ))}
      </div>
    </div>
  );
}
