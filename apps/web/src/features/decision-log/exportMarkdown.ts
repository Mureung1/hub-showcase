import type { Chat, DecisionNote, Question } from "../chat/types";

/**
 * SPEC-EXPORT-001 §2·§3 — MD 문자열 조립과 파일명 정규화.
 *
 * **React·DOM·JSZip에 의존하지 않는다.** 그래야 브라우저 없이 Node에서 그대로 검증된다
 * (`apps/web/scripts/exportCheck.ts`). Zip 조립은 `buildZip.ts`, 다운로드 트리거는
 * `downloadBlob.ts`로 나눠 두었다.
 *
 * §7 — 여기서 만드는 문자열에는 `input_snapshot`·`manager_meta` 같은 내부 메타가
 * 들어가지 않는다. 애초에 web 타입에 없는 필드이고, 아래 어느 함수도 그것을 읽지 않는다.
 */

/** §3.3 — 미완료 Question을 건너뛰지 않기 위한 표시. 건너뛰면 번호가 어긋난다. */
const IN_PROGRESS_TEXT = "아직 진행 중입니다.";

/** §2.3-1 — 질문에서 파일명으로 가져올 앞부분 길이. */
const NAME_SOURCE_LENGTH = 30;

/**
 * §2.3-2·3·4 — 파일명 조각 정규화. 금지문자·제어문자 제거 → 공백 정리 → 빈 결과 대체.
 *
 * 중복 번호(§2.3-5)는 Zip 엔트리에만 필요하므로 여기 없다. 이 함수는 **Zip 엔트리명과
 * Zip·전체MD 파일명이 함께 쓴다** — Chat 제목도 사용자 입력이라 `/`·`:`가 들어가면
 * 다운로드 파일명이 깨지거나 경로로 해석된다(§7).
 */
function normalizeNameFragment(raw: string, fallback: string): string {
  const stripped = raw
    // §2.3-2 — 파일명 금지문자 + 제어문자(C0 전체 · DEL). 개행·탭도 여기서 사라지므로
    // 아래 공백 정리 전에 먼저 건다.
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // 점만 남으면(".", "..") 경로로 해석될 여지가 있어 빈 결과와 같이 취급한다.
  if (stripped.length === 0 || /^\.+$/.test(stripped)) {
    return fallback;
  }
  return stripped;
}

/**
 * §2.3 전체 5단계 — 질문 앞 30자로 Zip 엔트리명을 만든다.
 *
 * ⚠️ **이 함수는 `usedNames`를 변이시킨다.** 확정한 이름을 스스로 넣고 반환하므로
 * 호출자는 `add`를 신경 쓸 필요가 없다. 호출자에게 맡기면 한 번 빠뜨렸을 때
 * **Zip에서 앞 파일이 조용히 덮어써진다** — 순수성보다 사고 방지가 우선이다.
 */
export function safeFileName(message: string, usedNames: Set<string>): string {
  const base = normalizeNameFragment(
    message.slice(0, NAME_SOURCE_LENGTH),
    "question",
  );

  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

/** `YYYYMMDD` — 파일명용. 사용자의 로컬 날짜를 쓴다. */
function yyyymmdd(at: Date): string {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, "0");
  const day = String(at.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/** `YYYY-MM-DD` — 문서 본문의 "내보낸 날짜"용. */
function isoDate(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(
    at.getDate(),
  ).padStart(2, "0")}`;
}

/** §2.1 — `decision-log_{chat제목}_{YYYYMMDD}.zip` */
export function zipFileName(chatTitle: string, at: Date): string {
  return `decision-log_${normalizeNameFragment(chatTitle, "chat")}_${yyyymmdd(at)}.zip`;
}

/** §3.1 — `decision-log_{chat제목}_{YYYYMMDD}_전체.md` */
export function fullMarkdownFileName(chatTitle: string, at: Date): string {
  return `decision-log_${normalizeNameFragment(chatTitle, "chat")}_${yyyymmdd(at)}_전체.md`;
}

/**
 * §2.2 — 개별 MD.
 *
 * 본문(`note.content`)은 그대로 넣는다. SPEC-AI-003 T-020.3에서 마크다운을 금지했으므로
 * 평문 문단이고, MD 파일에서 문단으로 잘 보인다.
 */
export function buildNoteMarkdown(
  question: Question,
  note: DecisionNote,
  chatTitle: string,
): string {
  return [
    `# ${question.message}`,
    "",
    `- 작성일: ${note.createdAt}`,
    `- Chat: ${chatTitle}`,
    "",
    "---",
    "",
    note.content,
    "",
  ].join("\n");
}

export interface ZipEntry {
  fileName: string;
  content: string;
}

/**
 * §2.1 — Zip에 담을 엔트리 목록.
 *
 * - `sequenceNumber` 오름차순. "정렬이 흔들리면 안 된다"
 * - DecisionNote가 없는 Question은 **건너뛴다.** 빈 파일을 만들지 않는다
 * - 번호는 연속 재부여가 아니라 **`sequenceNumber` 그대로**다. 재부여하면 화면의 5번
 *   질문이 파일에서 03이 되어, §3.3이 경계한 것과 같은 어긋남이 생긴다
 */
export function buildZipEntries(
  chat: Chat,
  notes: DecisionNote[],
): ZipEntry[] {
  const noteByQuestionId = new Map(notes.map((note) => [note.questionId, note]));
  const usedNames = new Set<string>();

  return [...chat.questions]
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .flatMap((question) => {
      const note = noteByQuestionId.get(question.id);
      if (!note) {
        return [];
      }
      const order = String(question.sequenceNumber).padStart(2, "0");
      const name = safeFileName(question.message, usedNames);
      return [
        {
          fileName: `${order}_${name}.md`,
          content: buildNoteMarkdown(question, note, chat.title),
        },
      ];
    });
}

/**
 * §3.2 — 전체 대화 MD 한 장 (최소안).
 *
 * DecisionNote는 Chat에 매달려 있지 않아(`domain-policy` §6 — `question_id`만 저장한다)
 * **별도 배열로 받아 `questionId`로 잇는다.** 이것을 빠뜨리면 결정 기록이 통째로 사라진다.
 *
 * - 미완료 Question(§3.3): 제목 + "아직 진행 중입니다". **건너뛰지 않는다**
 * - 완료했는데 노트가 없으면: "### 결정 기록" 헤더를 아예 내지 않는다. 빈 헤더는 남기지 않는다
 * - 3사 원문·Agenda는 넣지 않는다
 */
export function buildFullMarkdown(
  chat: Chat,
  notes: DecisionNote[],
  exportedAt: Date,
): string {
  const noteByQuestionId = new Map(notes.map((note) => [note.questionId, note]));
  const ordered = [...chat.questions].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber,
  );

  const lines: string[] = [
    `# ${chat.title}`,
    "",
    `- 내보낸 날짜: ${isoDate(exportedAt)}`,
    `- 질문 수: ${ordered.length}`,
    "",
    "---",
    "",
  ];

  for (const question of ordered) {
    lines.push(`## ${question.sequenceNumber}. ${question.message}`, "");

    if (question.status !== "completed") {
      lines.push(IN_PROGRESS_TEXT, "", "---", "");
      continue;
    }

    if (question.finalAnswer) {
      lines.push("### 최종 답변", "", question.finalAnswer.content, "");
    }

    const note = noteByQuestionId.get(question.id);
    if (note) {
      lines.push("### 결정 기록", "", note.content, "");
    }

    lines.push("---", "");
  }

  return lines.join("\n");
}
