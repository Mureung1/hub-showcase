import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Text } from "@astryxdesign/core/Text";
import type { DecisionNote } from "../chat/types";
import "./decision-log.css";

/**
 * 노트 카드 (Step 8-3 + R1 개정): 제목 + 개조식 요약만. 읽기 전용.
 * R1: [최종 결론 #N] 뱃지·출처 AI 표시 삭제, 카드 최대 높이 제한 —
 * 넘치는 내용은 말줄임 처리한다 (데이터는 그대로 보관, 표시만 간소화).
 */
function DecisionNoteCard({ note }: { note: DecisionNote }) {
  return (
    <article className="note-card">
      <Text type="label" as="p" display="block" className="note-title">
        {note.title}
      </Text>
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
}

/**
 * Right 패널: Decision Notes 영역.
 * FinalAnswer 확정 직후 자동 생성된 노트가 즉시 추가되며(Step 8),
 * 최신 노트가 위로 오도록 역순 표시한다. 수정·삭제 UI 없음(읽기 전용).
 * R1: 노트는 활성 Chat 기준으로 표시된다 — notes에는 필터된 목록이 전달된다 (Step 8 R1-3).
 * MD Zip 다운로드 버튼은 항상 비활성으로 노출한다 (Step 1-5 — 이번 Spec에서 동작 없음).
 */
export function DecisionNotesPanel({ notes }: DecisionNotesPanelProps) {
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
            .map((note) => <DecisionNoteCard key={note.id} note={note} />)
        )}
      </div>
      <div className="notes-panel-footer">
        <Button label="MD Zip 다운로드" variant="primary" isDisabled />
      </div>
    </div>
  );
}
