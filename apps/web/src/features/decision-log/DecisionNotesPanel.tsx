import { useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Text } from "@astryxdesign/core/Text";
import type { Chat, DecisionNote } from "../chat/types";
import {
  buildFullMarkdown,
  buildZipEntries,
  fullMarkdownFileName,
  zipFileName,
} from "./exportMarkdown";
import { buildZipBlob } from "./buildZip";
import { downloadBlob } from "./downloadBlob";
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
  /**
   * 활성 Chat. 진입·전환 시 스크롤 하단 이동 트리거(Step 8 R4-2)이자
   * Export가 쓰는 데이터원(SPEC-EXPORT-001 — 제목·questions·finalAnswer).
   * 이전에는 `activeChatId`만 받았으나 Export에 Chat 본문이 필요해 교체했다.
   */
  chat: Chat | null;
  /** 노트 → 매핑 Question 블록으로 스크롤·하이라이트 (Step 8 R3-2) */
  onNavigateToQuestion: (questionId: string) => void;
}

/**
 * Right 패널: Decision Notes 영역.
 * FinalAnswer 확정 직후 자동 생성된 노트가 즉시 추가되며(Step 8),
 * R4: 노트는 시간순(최신이 아래)으로 위→아래로 쌓인다 (중앙 트랜스크립트와 같은 방향).
 * 수정·삭제 UI 없음(읽기 전용).
 * R1: 노트는 활성 Chat 기준으로 표시된다 — notes에는 필터된 목록이 전달된다 (Step 8 R1-3).
 * 푸터의 Export 버튼 2개는 SPEC-EXPORT-001(T-021)에서 동작을 얻었다.
 */
export function DecisionNotesPanel({
  notes,
  chat,
  onNavigateToQuestion,
}: DecisionNotesPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const activeChatId = chat?.id ?? null;

  /**
   * §4.2 — 비활성은 **내려받을 데이터가 있는가**로만 판단한다.
   * `chat.status` 같은 상태로 분기하지 않는다. SPEC-AI-002 T-019.5·T-019.6에서
   * 상태 기반 가드가 새 경로를 막은 사례가 두 번 있었다.
   */
  const canExportZip = notes.length > 0;
  const canExportFullMarkdown = (chat?.questions.length ?? 0) > 0;

  async function handleExportZip() {
    if (!chat || !canExportZip || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      const now = new Date();
      const blob = await buildZipBlob(buildZipEntries(chat, notes));
      downloadBlob(blob, zipFileName(chat.title, now));
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportFullMarkdown() {
    if (!chat || !canExportFullMarkdown) {
      return;
    }
    const now = new Date();
    const blob = new Blob([buildFullMarkdown(chat, notes, now)], {
      type: "text/markdown;charset=utf-8",
    });
    downloadBlob(blob, fullMarkdownFileName(chat.title, now));
  }

  // R4-2: 새 노트 추가(notes.length 증가)·Chat 진입/전환(activeChatId 변경) 시점에만
  // 스크롤을 최하단으로 내려 최신 노트를 보이게 한다. 그 외 렌더(사용자 스크롤 등)에는
  // 관여하지 않으므로, 이전 노트를 위로 스크롤해 읽는 것을 방해하지 않는다.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }, [activeChatId, notes.length]);

  return (
    <div className="notes-panel">
      <div className="notes-panel-head">
        <Text type="label" color="secondary">
          Decision Notes
        </Text>
      </div>
      <div
        ref={bodyRef}
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
          // R4-1: 시간순 — 역순(reverse) 제거, Question 순서 그대로 위→아래
          notes.map((note) => (
            <DecisionNoteCard
              key={note.id}
              note={note}
              onNavigateToQuestion={onNavigateToQuestion}
            />
          ))
        )}
      </div>
      <div className="notes-panel-footer">
        <Button
          label={isExporting ? "Zip 만드는 중…" : "결정 기록 Zip 받기"}
          variant="primary"
          isDisabled={!canExportZip || isExporting}
          onClick={() => void handleExportZip()}
        />
        <Button
          label="전체 대화 MD 받기"
          variant="secondary"
          isDisabled={!canExportFullMarkdown}
          onClick={handleExportFullMarkdown}
        />
      </div>
    </div>
  );
}
