// "상황별 명령어 묶음" 데이터 — commands.js와 같은 구조.
// 원래는 Claude API 구조화된 출력으로 초안을 생성할 계획이었으나(server/src/scripts/generateScenarios.js
// 참고), 이번 시나리오 생성 한 번을 위해 별도 API 결제 수단을 새로 등록하는 비용이 커서
// 사람이 직접 작성하는 쪽으로 결정했다. AI 초안 → 사람 검토라는 원래 취지는 유지하되,
// API 호출 대신 대화 중에 초안을 만들고 바로 사람이 검토·확정하는 방식으로 대체했다.
export const scenarios = [
  {
    id: 'start-new-project',
    title: '새 프로젝트 시작하기',
    description: '실습 과제나 개인 프로젝트를 처음 시작할 때 필요한 명령어 흐름',
    command_ids: ['unix-mkdir', 'unix-cd', 'git-init', 'git-config'],
  },
  {
    id: 'join-team-project',
    title: '팀 프로젝트 참여하기',
    description: '이미 존재하는 원격 저장소를 로컬로 가져와 작업을 시작할 때',
    command_ids: ['git-clone', 'unix-cd', 'git-status'],
  },
  {
    id: 'submit-assignment',
    title: '과제 제출하기',
    description: '작업한 내용을 확인하고 원격 저장소에 커밋·제출할 때',
    command_ids: ['git-status', 'git-diff', 'git-add', 'git-commit', 'git-push'],
  },
  {
    id: 'resolve-permission-error',
    title: '권한 오류 해결하기',
    description: '"Permission denied" 오류가 뜰 때 원인을 확인하고 해결할 때',
    command_ids: ['unix-ls', 'unix-chmod', 'unix-sudo', 'unix-chown'],
  },
  {
    id: 'undo-mistake',
    title: '실수한 커밋 되돌리기',
    description: '잘못 커밋했거나 변경 사항을 되돌리고 싶을 때',
    command_ids: ['git-log', 'git-diff', 'git-reset', 'git-revert'],
  },
  {
    id: 'explore-files',
    title: '파일/디렉터리 탐색하기',
    description: '지금 어디에 뭐가 있는지 확인하고 원하는 파일을 찾을 때',
    command_ids: ['unix-pwd', 'unix-ls', 'unix-find', 'unix-grep', 'unix-cat'],
  },
  {
    id: 'check-logs',
    title: '로그 파일 확인하기',
    description: '실행 중인 서비스나 프로그램의 로그를 확인할 때',
    command_ids: ['unix-tail', 'unix-head', 'unix-less', 'unix-grep', 'unix-wc'],
  },
  {
    id: 'work-on-branch',
    title: '기능 브랜치로 작업하기',
    description: '새 기능을 브랜치로 나눠 작업하고 병합할 때',
    command_ids: ['git-branch', 'git-checkout', 'git-add', 'git-commit', 'git-push', 'git-merge'],
  },
  {
    id: 'sync-remote',
    title: '원격 저장소와 동기화하기',
    description: '팀원의 변경 사항을 받아오거나 원격 상태를 확인할 때',
    command_ids: ['git-remote', 'git-fetch', 'git-pull', 'git-status'],
  },
  {
    id: 'switch-tasks-urgently',
    title: '작업 중 급하게 다른 작업으로 전환하기',
    description: '커밋하기엔 이른 변경 사항을 잠시 치워두고 다른 브랜치로 이동해야 할 때',
    command_ids: ['git-stash', 'git-checkout'],
  },
  {
    id: 'find-and-kill-process',
    title: '멈춘 프로세스 확인하고 종료하기',
    description: '응답 없는 프로그램이나 좀비 프로세스를 찾아 종료할 때',
    command_ids: ['unix-ps', 'unix-kill'],
  },
  {
    id: 'compile-run-c',
    title: 'C 프로그램 작성하고 컴파일/실행하기',
    description: '에디터로 .c 소스 코드를 작성하고 실행 파일로 만들어 돌려볼 때',
    command_ids: ['unix-nano', 'unix-gcc'],
  },
];
