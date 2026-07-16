import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Text } from "@astryxdesign/core/Text";
import type { Agenda, Provider, Question } from "./types";
import { isAgendaUnresolved } from "./types";
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
  onResolveClick,
}: {
  agenda: Agenda;
  onResolveClick: (agendaId: string) => void;
}) {
  const stanceSummary = agenda.stances
    .map((stance) => `${providerLabel(stance.provider)}: ${stance.text}`)
    .join(" · ");

  return (
    <div className="conflict-item">
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
  onOpenAnswers: () => void;
  /** 충돌 해소 팝업 열기 — T-005에서 연결한다 */
  onResolveClick: (agendaId: string) => void;
}

/**
 * 답변 카드 (Step 5): 상단 "충돌 지점 (남은/전체)" 헤더 + Conflict 리스트 +
 * "자동 통과 N건" 접힘 요약(기본 접힘) + 최종 답변 대기 영역(T-006).
 * (0/N) 도달 시 카운터 대신 초록 "✓ 충돌 해결 완료" 뱃지로 교체한다 (Step 5-3).
 */
export function AnswerCard({
  question,
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

  return (
    <div className="answer-card">
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
        <Button
          label="AI 별 답변 보기"
          variant="ghost"
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
                onResolveClick={onResolveClick}
              />
            ))}
          </div>
        </>
      )}

      {consensusAgendas.length > 0 && (
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

      {/* 최종 답변 영역 — T-006(FinalAnswer)에서 채운다 */}
      <div className="answer-pending">
        <Text type="supporting" color="secondary">
          충돌을 모두 해결하면 최종 답변이 여기에 작성됩니다.
        </Text>
      </div>
    </div>
  );
}
