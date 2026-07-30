import type { MistakeNote, MistakeNoteInput, MistakeNoteSource } from './useMistakeNoteStore'

export const sourceLabels: Record<MistakeNoteSource, string> = {
  'git-lab': 'Git Lab',
  workspace: '학습 워크스페이스',
  algorithm: '알고리즘 실습',
  'api-practice': 'API 실습',
}

export const commandLabels: Record<MistakeNoteSource, string> = {
  'git-lab': '실패한 Git 명령어',
  workspace: '실패한 코드 / 실행 라벨',
  algorithm: '틀린 풀이 요약',
  'api-practice': '실패한 API 호출 / 코드',
}

export const lessonIdPlaceholders: Record<MistakeNoteSource, string> = {
  'git-lab': '예: git-basics-3',
  workspace: '예: mission-02',
  algorithm: '예: bfs-level-1',
  'api-practice': '예: rest-crud-1',
}

export const commandPlaceholders: Record<MistakeNoteSource, string> = {
  'git-lab': '예: git rebase main',
  workspace: '예: solution.py 실행 (런타임 에러)',
  algorithm: '예: BFS 탐색 — visited 배열 미초기화',
  'api-practice': '예: POST /users (401 Unauthorized)',
}

export const emptyMistakeNoteForm: MistakeNoteInput = {
  source: 'git-lab',
  lessonTitle: '',
  lessonId: '',
  command: '',
  reason: '',
  correction: '',
}

export function toMistakeNoteForm(note: MistakeNote): MistakeNoteInput {
  return {
    source: note.source,
    lessonTitle: note.lessonTitle,
    lessonId: note.lessonId,
    command: note.command,
    reason: note.reason,
    correction: note.correction,
  }
}

export function normalizeMistakeNoteForm(value: MistakeNoteInput): MistakeNoteInput {
  return {
    source: value.source,
    lessonTitle: value.lessonTitle.trim(),
    lessonId: value.lessonId.trim(),
    command: value.command.trim(),
    reason: value.reason.trim(),
    correction: value.correction.trim(),
  }
}

export function validateMistakeNoteForm(value: MistakeNoteInput): string | null {
  if (!value.lessonTitle.trim()) return '레슨 이름을 입력해 주세요.'
  if (!value.lessonId.trim()) return '레슨 ID를 입력해 주세요.'
  if (!value.command.trim()) return `${commandLabels[value.source]}을(를) 입력해 주세요.`
  if (!value.reason.trim()) return '실패 이유를 입력해 주세요.'
  if (!value.correction.trim()) return '수정 힌트를 입력해 주세요.'
  return null
}
