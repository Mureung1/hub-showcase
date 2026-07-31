/**
 * SPEC-EXPORT-001 E-1 — 순수 함수 검증. **브라우저 없이 Node에서 돈다.**
 *
 * ```bash
 * npx tsx apps/web/scripts/exportCheck.ts
 * ```
 *
 * `src/` 밖에 둔다 — 앱에서 아무도 import하지 않는 검증 코드가 typecheck·lint·빌드
 * 그래프에 끌려다니지 않게 하기 위해서다.
 *
 * jszip을 import하지 않는다. 아래 4건은 전부 문자열 함수이고, Zip 조립은 `buildZip.ts`로
 * 분리돼 있어 `exportMarkdown.ts`만 불러오면 jszip이 딸려오지 않는다.
 */
import type { Chat, DecisionNote, Question } from "../src/features/chat/types";
import {
  buildFullMarkdown,
  buildNoteMarkdown,
  buildZipEntries,
  fullMarkdownFileName,
  safeFileName,
  zipFileName,
} from "../src/features/decision-log/exportMarkdown";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ISO = "2026-07-31T04:00:00.000+00:00";

function makeQuestion(
  partial: Pick<Question, "id" | "sequenceNumber" | "message" | "status"> &
    Partial<Question>,
): Question {
  return {
    chatId: "chat-1",
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: ISO,
    updatedAt: ISO,
    completedAt: partial.status === "completed" ? ISO : null,
    sourceAnswers: [],
    agendas: [],
    finalAnswer: null,
    ...partial,
  };
}

function makeNote(questionId: string, content: string): DecisionNote {
  return {
    id: `note-${questionId}`,
    questionId,
    content,
    createdAt: ISO,
    updatedAt: ISO,
    chatId: "chat-1",
    title: "테스트 Chat",
    bullets: [content],
  };
}

function makeFinalAnswer(questionId: string, content: string) {
  return {
    id: `fa-${questionId}`,
    questionId,
    content,
    generationMode: "multi_source" as const,
    createdAt: ISO,
  };
}

// ---------------------------------------------------------------------------
console.log("\n[1] 파일명 정규화 (§2.3-2·3·4)");
// ---------------------------------------------------------------------------
{
  const forbidden = safeFileName('a\\b/c:d*e?f"g<h>i|j', new Set());
  check(
    "금지문자 9종이 전부 제거된다",
    !/[\\/:*?"<>|]/.test(forbidden),
    forbidden,
  );

  // 제어문자는 소스에 리터럴로 쓰지 않고 코드포인트로 만든다.
  const withControl = `앞${String.fromCharCode(0)}중${String.fromCharCode(
    9,
  )}뒤${String.fromCharCode(31)}${String.fromCharCode(127)}`;
  const cleaned = safeFileName(withControl, new Set());
  // eslint-disable-next-line no-control-regex
  check("제어문자(NUL·TAB·US·DEL)가 제거된다", !/[\u0000-\u001f\u007f]/.test(cleaned), cleaned);

  check(
    "연속 공백이 하나로 줄고 앞뒤가 잘린다",
    safeFileName("  앞     뒤  ", new Set()) === "앞 뒤",
    safeFileName("  앞     뒤  ", new Set()),
  );

  check(
    '금지문자만 있으면 "question"으로 대체된다',
    safeFileName('///:::???"""', new Set()) === "question",
    safeFileName('///:::???"""', new Set()),
  );

  check(
    '점만 남으면(경로 조작) "question"으로 대체된다',
    safeFileName("../..", new Set()) === "question",
    safeFileName("../..", new Set()),
  );

  check(
    "앞 30자만 쓴다",
    safeFileName("가".repeat(50), new Set()).length === 30,
    String(safeFileName("가".repeat(50), new Set()).length),
  );

  // §7 — Chat 제목도 사용자 입력이다. Zip·전체MD 파일명에 그대로 새지 않아야 한다.
  const zipName = zipFileName("보고서/2026: 최종*", new Date(2026, 6, 31));
  check(
    "Zip 파일명의 Chat 제목이 정규화된다",
    zipName === "decision-log_보고서2026 최종_20260731.zip",
    zipName,
  );
  const fullName = fullMarkdownFileName('a"b|c', new Date(2026, 6, 31));
  check(
    "전체 MD 파일명의 Chat 제목이 정규화된다",
    fullName === "decision-log_abc_20260731_전체.md",
    fullName,
  );
  const emptyTitle = zipFileName("///", new Date(2026, 6, 31));
  check(
    '빈 Chat 제목은 "chat"으로 대체된다',
    emptyTitle === "decision-log_chat_20260731.zip",
    emptyTitle,
  );
}

// ---------------------------------------------------------------------------
console.log("\n[2] 파일명 중복 (§2.3-5) — 빠뜨리면 Zip에서 덮어써진다");
// ---------------------------------------------------------------------------
{
  // ⚠️ 세 질문의 **앞 30자가 실제로 같아야** 중복 상황이 만들어진다. 뒷부분만 다르게 둔다.
  const BASE = "Supabase와 Firebase 중 어떤 것이 우리";
  const used = new Set<string>();
  const first = safeFileName("Supabase와 Firebase 중 어떤 것이 우리 서비스에 적합할까?", used);
  const second = safeFileName("Supabase와 Firebase 중 어떤 것이 우리 서비스에 맞을까?", used);
  const third = safeFileName("Supabase와 Firebase 중 어떤 것이 우리 팀에 좋을까?", used);

  check("세 입력의 앞 30자가 실제로 같다 (중복 상황이 만들어졌다)", first === BASE, first);
  check("1번째는 접미사가 없다", first === BASE, first);
  check("2번째에 -2가 붙는다", second === `${BASE}-2`, second);
  check("3번째에 -3이 붙는다", third === `${BASE}-3`, third);
  check(
    "세 이름이 모두 다르다 (덮어쓰기 없음)",
    new Set([first, second, third]).size === 3,
  );

  // 실제 Zip 엔트리 경로로도 확인한다 — 여기서 겹치면 데이터가 조용히 사라진다.
  const chat: Chat = {
    id: "chat-1",
    title: "테스트 Chat",
    createdAt: ISO,
    updatedAt: ISO,
    questions: [
      // 앞 30자가 동일한 세 질문 — 중복 처리가 없으면 Zip에서 두 건이 덮어써진다.
      makeQuestion({ id: "q1", sequenceNumber: 1, message: `${BASE} 서비스에 적합할까?`, status: "completed" }),
      makeQuestion({ id: "q2", sequenceNumber: 2, message: `${BASE} 서비스에 맞을까?`, status: "completed" }),
      makeQuestion({ id: "q3", sequenceNumber: 3, message: `${BASE} 팀에 좋을까?`, status: "completed" }),
    ],
  };
  const notes = [makeNote("q1", "노트1"), makeNote("q2", "노트2"), makeNote("q3", "노트3")];
  const entries = buildZipEntries(chat, notes);
  const names = entries.map((e) => e.fileName);
  check("Zip 엔트리 3건이 모두 고유하다", new Set(names).size === 3, names.join(" · "));
  check(
    "Zip 엔트리에 -2·-3이 실제로 붙었다",
    names[1].includes("-2.md") && names[2].includes("-3.md"),
    names.join(" · "),
  );
  check("번호가 sequenceNumber를 따른다", names.every((n, i) => n.startsWith(`0${i + 1}_`)), names.join(" · "));
}

// ---------------------------------------------------------------------------
console.log("\n[3] 미완료 Question (§3.3) — 건너뛰면 번호가 어긋난다");
// ---------------------------------------------------------------------------
{
  const chat: Chat = {
    id: "chat-1",
    title: "테스트 Chat",
    createdAt: ISO,
    updatedAt: ISO,
    questions: [
      makeQuestion({
        id: "q1",
        sequenceNumber: 1,
        message: "첫 질문",
        status: "completed",
        finalAnswer: makeFinalAnswer("q1", "첫 최종 답변"),
      }),
      makeQuestion({ id: "q2", sequenceNumber: 2, message: "둘째 질문", status: "review_required" }),
      makeQuestion({
        id: "q3",
        sequenceNumber: 3,
        message: "셋째 질문",
        status: "completed",
        finalAnswer: makeFinalAnswer("q3", "셋째 최종 답변"),
      }),
    ],
  };
  const notes = [makeNote("q1", "첫 결정 기록"), makeNote("q3", "셋째 결정 기록")];
  const md = buildFullMarkdown(chat, notes, new Date(2026, 6, 31));

  check("미완료 Question이 빠지지 않는다", md.includes("## 2. 둘째 질문"), "제목 없음");
  check('미완료에 "아직 진행 중입니다"가 표시된다', md.includes("아직 진행 중입니다"));
  check("번호 1·2·3이 모두 있다", ["## 1.", "## 2.", "## 3."].every((h) => md.includes(h)));
  check(
    "화면 순서대로 나온다",
    md.indexOf("## 1.") < md.indexOf("## 2.") && md.indexOf("## 2.") < md.indexOf("## 3."),
  );
  check("완료 Question의 결정 기록이 담긴다", md.includes("첫 결정 기록") && md.includes("셋째 결정 기록"));
  check("최종 답변도 담긴다", md.includes("첫 최종 답변") && md.includes("셋째 최종 답변"));
  check("질문 수가 미완료 포함 3이다", md.includes("- 질문 수: 3"));

  // 미완료 구간에는 빈 헤더를 남기지 않는다.
  const q2Block = md.slice(md.indexOf("## 2."), md.indexOf("## 3."));
  check(
    "미완료 구간에 빈 '### 최종 답변'·'### 결정 기록' 헤더가 없다",
    !q2Block.includes("### 최종 답변") && !q2Block.includes("### 결정 기록"),
    q2Block.replace(/\n/g, "⏎"),
  );

  // 완료했는데 노트만 없는 경우 — 빈 "### 결정 기록" 헤더를 남기지 않는다.
  const noNoteMd = buildFullMarkdown(chat, [makeNote("q1", "첫 결정 기록")], new Date());
  const q3Block = noNoteMd.slice(noNoteMd.indexOf("## 3."));
  check(
    "노트 없는 완료 Question에 빈 '### 결정 기록' 헤더가 없다",
    !q3Block.includes("### 결정 기록"),
    q3Block.replace(/\n/g, "⏎"),
  );

  // Zip 쪽은 반대로 건너뛴다 (§2.1) — 빈 파일을 만들지 않는다.
  const entries = buildZipEntries(chat, notes);
  check("Zip은 노트 없는 Question을 건너뛴다 (2건)", entries.length === 2, String(entries.length));
  check(
    "건너뛰어도 번호는 01·03으로 남는다",
    entries[0].fileName.startsWith("01_") && entries[1].fileName.startsWith("03_"),
    entries.map((e) => e.fileName).join(" · "),
  );
}

// ---------------------------------------------------------------------------
console.log("\n[4] 내부 메타 부재 (§7) · 형식 (§2.2·§3.2)");
// ---------------------------------------------------------------------------
{
  const question = makeQuestion({
    id: "q1",
    sequenceNumber: 1,
    message: "질문 본문",
    status: "completed",
    finalAnswer: makeFinalAnswer("q1", "최종 답변 본문"),
  });
  const chat: Chat = {
    id: "chat-1",
    title: "테스트 Chat",
    createdAt: ISO,
    updatedAt: ISO,
    questions: [question],
  };
  const note = makeNote("q1", "결정 기록 본문");
  const noteMd = buildNoteMarkdown(question, note, chat.title);
  const fullMd = buildFullMarkdown(chat, [note], new Date(2026, 6, 31));

  const FORBIDDEN = [
    "input_snapshot",
    "inputSnapshot",
    "manager_meta",
    "managerMeta",
    "prompt_version",
    "promptVersion",
    "stances",
    "sourceRefs",
  ];
  const leaked = FORBIDDEN.filter((k) => noteMd.includes(k) || fullMd.includes(k));
  check("내부 메타 키가 출력에 없다", leaked.length === 0, leaked.join(", "));

  // 3사 원문·Agenda 미포함 (§3.2 최소안) — 위 Chat은 sourceAnswers·agendas가 비어 있고
  // 두 함수 모두 그것을 읽지 않는다. 형식만 확인한다.
  check("개별 MD가 제목으로 시작한다", noteMd.startsWith("# 질문 본문\n"), noteMd.slice(0, 20));
  check("개별 MD에 작성일·Chat 메타가 있다", noteMd.includes(`- 작성일: ${ISO}`) && noteMd.includes("- Chat: 테스트 Chat"));
  check("개별 MD에 구분선과 본문이 있다", noteMd.includes("\n---\n") && noteMd.includes("결정 기록 본문"));
  check("전체 MD가 Chat 제목으로 시작한다", fullMd.startsWith("# 테스트 Chat\n"), fullMd.slice(0, 20));
  check("전체 MD에 내보낸 날짜가 있다", fullMd.includes("- 내보낸 날짜: 2026-07-31"));
  check("전체 MD에 두 섹션 헤더가 있다", fullMd.includes("### 최종 답변") && fullMd.includes("### 결정 기록"));
}

// ---------------------------------------------------------------------------
console.log(`\n결과: ${passed} PASS · ${failed} FAIL\n`);
if (failed > 0) {
  process.exit(1);
}
