/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * 신청 시 한마디(B). 모임장이 설정하는 가입 질문과 신청자의 답변.
 * 둘 다 nullable — 기존 행은 null이고, 질문이 없는 모임은 답변도 null이다.
 * 길이 상한은 앱(validators.js)에서만 건다(질문 200자 / 답변 500자).
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('meetings', { apply_question: { type: 'text' } });
  pgm.addColumn('meeting_participants', { apply_answer: { type: 'text' } });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('meetings', 'apply_question');
  pgm.dropColumn('meeting_participants', 'apply_answer');
};
