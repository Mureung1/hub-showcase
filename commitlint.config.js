// CLAUDE.md "커밋 메시지 규칙" 섹션과 동기화됩니다. 타입을 추가/변경하면 두 곳을 함께 수정하세요.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'chore', 'test'],
    ],
    // 한글 요약은 대소문자 구분이 없으므로 subject-case 검사는 끔
    'subject-case': [0],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
}
