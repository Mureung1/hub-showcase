import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Text } from "@astryxdesign/core/Text";
import type { DecisionNote } from "../chat/types";
import "./decision-log.css";

/**
 * 노트 카드 (Step 8-3 + R1·R3 개정): 제목 + 개조식 요약. 읽기 전용.
 * R1: [최종 결론 #N] 뱃지·출처 AI 표시 삭제, 카드 최대 높이 제한(말줄임).
 * R3-2: 우상단 ↗ 버튼 — 클릭 시 매핑된 Question 블록으로 이동한다.
 */
function DecisionNoteCard({
  note,
  onNavigateToQuestion,
}: {
  note: DecisionNote;
  onNavigateToQuestion: (questionId: string) => void;
}) {
  return (
    <article className="note-card">
      <div className="note-card-head">
        <Text type="label" as="p" display="block" className="note-title">
          {note.title}
        </Text>
        {/* Astryx 정식 아이콘 버튼: 시각 글리프는 icon, 접근성 이름은 label(=aria-label).
            isIconOnly는 children이 아니라 icon으로 글리프를 렌더한다 (docs 확인). */}
        <Button
          label="이 질문으로 이동"
          icon={<span aria-hidden>↗</span>}
          isIconOnly
          tooltip="이 질문으로 이동"
          variant="ghost"
          size="sm"
          onClick={() => onNavigateToQuestion(note.questionId)}
        />
      </div>
      <ul className="note-bullets">
        {note.bullets.map((bullet, index) => (
          <li key={index}>
            <Text type="supporting" display="block" className="note-bullet-text">
              {bullet}
            </Text>
          </li>
        ))}
      </ul>
    </article>
  );
}

interface DecisionNotesPanelProps {
  notes: DecisionNote[];
  /** 노트 → 매핑 Question 블록으로 스크롤·하이라이트 (Step 8 R3-2) */
  onNavigateToQuestion: (questionId: string) => void;
}

/**
 * Right 패널: Decision Notes 영역.
 * FinalAnswer 확정 직후 자동 생성된 노트가 즉시 추가되며(Step 8),
 * 최신 노트가 위로 오도록 역순 표시한다. 수정·삭제 UI 없음(읽기 전용).
 * R1: 노트는 활성 Chat 기준으로 표시된다 — notes에는 필터된 목록이 전달된다 (Step 8 R1-3).
 * MD Zip 다운로드 버튼은 항상 비활성으로 노출한다 (Step 1-5 — 이번 Spec에서 동작 없음).
 */
export function DecisionNotesPanel({
  notes,
  onNavigateToQuestion,
}: DecisionNotesPanelProps) {
  return (
    <div className="notes-panel">
      <div className="notes-panel-head">
        <Text type="label" color="secondary">
          Decision Notes
        </Text>
      </div>
      <div
        className={
          notes.length === 0 ? "notes-panel-body" : "notes-panel-body notes-panel-body-list"
        }
      >
        {notes.length === 0 ? (
          <EmptyState
            title="아직 저장된 노트가 없습니다"
            description="충돌을 모두 해결하면 최종 노트가 여기에 쌓입니다."
          />
        ) : (
          notes
            .slice()
            .reverse()
            .map((note) => (
              <DecisionNoteCard
                key={note.id}
                note={note}
                onNavigateToQuestion={onNavigateToQuestion}
              />
            ))
        )}
      </div>
      <div className="notes-panel-footer">
        <Button label="MD Zip 다운로드" variant="primary" isDisabled />
      </div>
    </div>
  );
}
