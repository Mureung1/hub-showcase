import { useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import type { Agenda, Question } from "./types";
import { providerMeta } from "./mockData";
import "./chat.css";

/**
 * 접이식 섹션 — 헤딩 + 왼쪽 펼치기 토글, 기본 접힘 (Step 7 R1-2·3).
 * FinalAnswer 카드는 직접 제작 대상 UI라 도메인 전용 토글을 사용한다.
 */
function CollapsibleSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section className="final-block">
      <button
        type="button"
        className="final-section-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="final-toggle-icon" aria-hidden>
          {isOpen ? "▾" : "▸"}
        </span>
        <Text type="label" color="secondary">
          {heading}
        </Text>
      </button>
      {isOpen && children}
    </section>
  );
}

/**
 * FinalAnswer 표시 (Step 7 확정 블록 순서 + R1 개정).
 * [✓ 충돌 해결 완료 뱃지(카드 상단)] → [공통 권장 사항(접힘 헤딩)] → [결정 사항(접힘 헤딩)]
 * → [제외한 항목] → [최종 답변 본문(상세 전문)] → [출처 AI].
 * 상세 본문이 중심이고, 근거 섹션 2개는 기본 접힘으로 둔다 (Step 7 R1-4).
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

  // §12.5 — 분류는 `resolutionReason` 기준이며 **`auto_single_source`도 자동 통과**다.
  // 빠뜨리면 단일 소스가 "사용자 판단 우선 적용"으로 분류돼 사용자가 판단한 적 없는
  // 항목이 결정 사항으로 표시된다. 표현 문제가 아니라 정확성 문제다.
  const isAutoPassed = (agenda: Agenda): boolean =>
    agenda.resolutionReason === "auto_consensus" ||
    agenda.resolutionReason === "auto_single_source";

  const consensus = question.agendas.filter(isAutoPassed);
  const decisions = question.agendas.filter(
    (agenda) => agenda.status === "passed" && !isAutoPassed(agenda),
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
        // R1: 자동 통과 요약을 대체하는 접이식 섹션 — 펼치면 제목 + 합의 내용 (Step 7 R1-1·2)
        <CollapsibleSection heading={`공통 권장 사항 (${consensus.length})`}>
          <div className="final-consensus-list">
            {consensus.map((agenda) => (
              <div className="final-consensus-item" key={agenda.id}>
                <Text type="label" display="block">
                  {agenda.title}
                </Text>
                <Text type="supporting" display="block">
                  {agenda.selectedContent}
                </Text>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {decisions.length > 0 && (
        <CollapsibleSection
          heading={`결정 사항 · 사용자 판단 우선 적용 (${decisions.length})`}
        >
          <div className="final-decision-list">
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
          </div>
        </CollapsibleSection>
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
              {providerMeta.find((meta) => meta.id === provider)?.label ??
                provider}
            </Text>
          </span>
        ))}
      </div>
    </div>
  );
}
