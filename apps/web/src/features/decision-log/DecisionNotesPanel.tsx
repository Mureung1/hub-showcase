import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Text } from "@astryxdesign/core/Text";
import type { DecisionNote, Provider } from "../chat/types";
import { providerMeta } from "../chat/mockData";
import "./decision-log.css";

function providerLabel(provider: Provider): string {
  return providerMeta.find((meta) => meta.id === provider)?.label ?? provider;
}

/** 노트 카드 (Step 8-3, v2 프로토타입 형식): [최종 결론 #N] + 제목 + 개조식 + 출처 AI. 읽기 전용. */
function DecisionNoteCard({ note }: { note: DecisionNote }) {
  return (
    <article className="note-card">
      <Badge variant="success" label={`최종 결론 #${note.seq}`} />
      <Text type="label" as="p" display="block">
        {note.title}
      </Text>
      <ul className="note-bullets">
        {note.bullets.map((bullet, index) => (
          <li key={index}>
            <Text type="supporting">{bullet}</Text>
          </li>
        ))}
      </ul>
      <div className="note-sources">
        <Text type="supporting" color="secondary">
          출처
        </Text>
        {note.sources.map((provider) => (
          <span className="note-source-item" key={provider}>
            <span
              className="model-dot"
              style={{ background: `var(--model-${provider})` }}
            />
            <Text type="supporting">{providerLabel(provider)}</Text>
          </span>
        ))}
      </div>
    </article>
  );
}

interface DecisionNotesPanelProps {
  notes: DecisionNote[];
}

/**
 * Right 패널: Decision Notes 누적 영역.
 * FinalAnswer 확정 직후 자동 생성된 노트가 즉시 추가되며(Step 8),
 * 최신 노트가 위로 오도록 역순 표시한다. 수정·삭제 UI 없음(읽기 전용).
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
