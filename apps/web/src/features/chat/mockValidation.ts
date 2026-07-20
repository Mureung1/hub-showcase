import {
  AgendaSchema,
  ChatSchema,
  DecisionNoteSchema,
  ERROR_CODES,
  FinalAnswerSchema,
  QuestionSchema,
  SourceAnswerSchema,
} from "@decision-log/shared";
import type { Chat, DecisionNote } from "./types";

/**
 * Mock 데이터 계약 검증 (SPEC-SCHEMA-001 8장, AC5·AC6).
 *
 * 검증 실패 시 조용히 넘기지 않고 errorCode와 함께 드러낸다 (결정 3-1·3-3).
 * 집합체를 통째로 parse하지 않고, 구성 엔티티(Chat·Question·SourceAnswer·Agenda·
 * FinalAnswer·DecisionNote)를 각각 해당 스키마로 개별 parse한다. 중첩 배열 필드는
 * 스키마에 없어 parse 시 제거되며(검증 제외), 그 안의 엔티티를 재귀적으로 검증한다
 * (Spec 9장 246행).
 */
export interface MockValidationError {
  /** 계약 레지스트리 값 — 여기서는 항상 SCHEMA_VALIDATION_FAILED (7장) */
  errorCode: string;
  /** 디버깅용 원문 메시지 (화면·콘솔에 그대로 표시) */
  message: string;
}

export function validateWorkspaceEntities(
  chats: Chat[],
  notes: DecisionNote[],
): MockValidationError | null {
  try {
    for (const chat of chats) {
      ChatSchema.parse(chat);
      for (const question of chat.questions) {
        QuestionSchema.parse(question);
        for (const answer of question.sourceAnswers) {
          SourceAnswerSchema.parse(answer);
        }
        for (const agenda of question.agendas) {
          AgendaSchema.parse(agenda);
        }
        if (question.finalAnswer) {
          FinalAnswerSchema.parse(question.finalAnswer);
        }
      }
    }
    for (const note of notes) {
      DecisionNoteSchema.parse(note);
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { errorCode: ERROR_CODES.SCHEMA_VALIDATION_FAILED, message };
  }
}
