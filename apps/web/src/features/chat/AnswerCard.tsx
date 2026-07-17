import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Text } from "@astryxdesign/core/Text";
import type { Agenda, Provider, Question } from "./types";
import { isAgendaUnresolved } from "./types";
import { FinalAnswerBlock } from "./FinalAnswerBlock";
import { providerMeta } from "./mockData";
import "./chat.css";

function providerLabel(provider: string): string {
  return (
    providerMeta.find((meta) => meta.id === (provider as Provider))?.label ??
    provider
  );
}

/** Conflict 카드 1장: 제목 + AI별 입장 한 줄 요약 + "미해소" 뱃지 + [해결] 버튼 (Step 5-4) */
function ConflictItem({
  agenda,
  isRemoving,
  onResolveClick,
}: {
  agenda: Agenda;
  /** 해소 확정 직후 제거 애니메이션 중 (Step 5-5) */
  isRemoving: boolean;
  onResolveClick: (agendaId: string) => void;
}) {
  const stanceSummary = agenda.stances
    .map((stance) => `${providerLabel(stance.provider)}: ${stance.text}`)
    .join(" · ");

  return (
    <div className={isRemoving ? "conflict-item removing" : "conflict-item"}>
      <div className="conflict-item-main">
        <Text type="label" as="p" display="block" textWrap="nowrap">
          {agenda.title}
        </Text>
        <Text
          type="supporting"
          color="secondary"
          as="p"
          display="block"
          className="conflict-item-sub"
        >
          {stanceSummary}
        </Text>
      </div>
      <Badge variant="warning" label="미해소" />
      <Button
        label="해결"
        variant="primary"
        size="sm"
        onClick={() => onResolveClick(agenda.id)}
      />
    </div>
  );
}

interface AnswerCardProps {
  question: Question;
  /** 제거 애니메이션 중인 Agenda id 목록 */
  removingAgendaIds: ReadonlySet<string>;
  onOpenAnswers: () => void;
  /** 충돌 해소 팝업 열기 */
  onResolveClick: (agendaId: string) => void;
}

/**
 * 답변 카드 (Step 5): 상단 "충돌 지점 (남은/전체)" 헤더 + Conflict 리스트 +
 * "자동 통과 N건" 접힘 요약(기본 접힘) + 최종 답변 대기 영역(T-006).
 * (0/N) 도달 시 카운터 대신 초록 "✓ 충돌 해결 완료" 뱃지로 교체한다 (Step 5-3).
 */
export function AnswerCard({
  question,
  removingAgendaIds,
  onOpenAnswers,
  onResolveClick,
}: AnswerCardProps) {
  const consensusAgendas = question.agendas.filter(
    (agenda) => agenda.resolutionReason === "auto_consensus",
  );
  const conflictAgendas = question.agendas.filter(
    (agenda) => agenda.resolutionReason !== "auto_consensus",
  );
  const unresolved = conflictAgendas.filter(isAgendaUnresolved);
  const isAllResolved = unresolved.length === 0;
  // 재시도까지 실패해 비교에서 제외된 Provider (Step 10-3: 카드 상단 고정 배너, 토스트 아님)
  const excludedAnswers = question.sourceAnswers.filter(
    (answer) => answer.excludedFromComparison,
  );

  return (
    // data-question-id: 노트 → Question 이동(R3-2)의 scrollIntoView·하이라이트 대상
    <div className="answer-card" data-question-id={question.id}>
      {excludedAnswers.map((answer) => (
        <div className="excluded-banner" key={answer.provider}>
          <Text type="supporting">
            {providerLabel(answer.provider)} 답변을 불러오지 못해 비교에서
            제외했습니다.
          </Text>
        </div>
      ))}
      <div className="answer-card-top">
        <div className="answer-card-title">
          {isAllResolved ? (
            <Badge variant="success" label="✓ 충돌 해결 완료" />
          ) : (
            <>
              <Text type="label">충돌 지점</Text>
              <Badge
                variant="warning"
                label={`(${unresolved.length}/${conflictAgendas.length})`}
              />
            </>
          )}
        </div>
        {/* R2(style): 호버 없이도 버튼처럼 보이게 테두리 상시 표시 — secondary 변형 */}
        <Button
          label="AI 별 답변 보기"
          variant="secondary"
          size="sm"
          onClick={onOpenAnswers}
        />
      </div>

      {!isAllResolved && (
        <>
          <Text type="supporting" color="secondary" as="p">
            각 충돌을 해결하면 아래에 최종 답변이 작성됩니다
          </Text>
          <div className="conflict-list">
            {unresolved.map((agenda) => (
              <ConflictItem
                key={agenda.id}
                agenda={agenda}
                isRemoving={removingAgendaIds.has(agenda.id)}
                onResolveClick={onResolveClick}
              />
            ))}
          </div>
        </>
      )}

      {/* R1: FinalAnswer 표시 후에는 접힘 요약을 없앤다 — 해소 진행 중에만 유지 (Step 7 R1-1) */}
      {!question.finalAnswer && consensusAgendas.length > 0 && (
        <div className="consensus-summary">
          {/* 기본 접힘 (Step 5-1) */}
          <Collapsible
            trigger={`자동 통과 ${consensusAgendas.length}건`}
            defaultIsOpen={false}
          >
            <div className="consensus-list">
              {consensusAgendas.map((agenda) => (
                <div className="consensus-item" key={agenda.id}>
                  <Text type="label" as="p" display="block">
                    {agenda.title}
                  </Text>
                  <Text type="supporting" as="p" display="block">
                    {agenda.selectedContent}
                  </Text>
                </div>
              ))}
            </div>
          </Collapsible>
        </div>
      )}

      {/* 최종 답변 영역 — 모든 Agenda가 최종 처리되면 자동 표시 (Step 7) */}
      {question.finalAnswer ? (
        <FinalAnswerBlock question={question} />
      ) : (
        <div className="answer-pending">
          <Text type="supporting" color="secondary">
            충돌을 모두 해결하면 최종 답변이 여기에 작성됩니다.
          </Text>
        </div>
      )}
    </div>
  );
}
