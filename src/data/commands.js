// 유닉스/git 명령어 사전 데이터
// category: 'unix' | 'git'
export const CATEGORY_LABELS = {
  unix: 'Unix 명령어',
  git: 'Git 명령어',
};

export const commands = [
  // ── Unix ──────────────────────────────────────────
  {
    id: 'unix-ls',
    category: 'unix',
    name: 'ls',
    summary: '현재 디렉터리의 파일과 폴더 목록을 출력한다',
    description:
      '지정한 디렉터리(생략 시 현재 디렉터리)에 있는 파일과 하위 디렉터리 목록을 보여준다. 실습 중 "지금 이 폴더에 뭐가 있지?"를 확인할 때 가장 먼저 쓰는 명령어다.',
    options: [
      { flag: '-l', desc: '권한, 소유자, 크기, 수정 시각 등을 포함한 상세 목록으로 출력' },
      { flag: '-a', desc: '숨김 파일(.으로 시작하는 파일)까지 모두 표시' },
      { flag: '-h', desc: '-l과 함께 사용 시 파일 크기를 사람이 읽기 쉬운 단위(K, M, G)로 표시' },
    ],
    examples: [
      { command: 'ls', desc: '현재 디렉터리의 파일/폴더 목록 출력' },
      { command: 'ls -al', desc: '숨김 파일 포함 상세 목록 출력' },
      { command: 'ls -lh /var/log', desc: '/var/log 디렉터리를 사람이 읽기 쉬운 크기 단위로 상세 출력' },
    ],
  },
  {
    id: 'unix-cd',
    category: 'unix',
    name: 'cd',
    summary: '작업 디렉터리를 변경한다',
    description:
      '현재 작업 위치(디렉터리)를 지정한 경로로 이동한다. 인자 없이 실행하면 홈 디렉터리로 이동한다.',
    options: [
      { flag: '-', desc: '바로 직전에 있던 디렉터리로 이동' },
      { flag: '..', desc: '(경로로 사용) 상위 디렉터리로 이동' },
      { flag: '~', desc: '(경로로 사용) 홈 디렉터리로 이동' },
    ],
    examples: [
      { command: 'cd projects', desc: 'projects 하위 디렉터리로 이동' },
      { command: 'cd ..', desc: '한 단계 상위 디렉터리로 이동' },
      { command: 'cd -', desc: '직전 디렉터리로 되돌아가기' },
    ],
  },
  {
    id: 'unix-pwd',
    category: 'unix',
    name: 'pwd',
    summary: '현재 작업 디렉터리의 절대 경로를 출력한다',
    description:
      'Print Working Directory의 약자로, 지금 터미널이 위치한 디렉터리의 전체 경로를 보여준다. cd로 여러 번 이동한 뒤 위치를 확인할 때 사용한다.',
    options: [{ flag: '-P', desc: '심볼릭 링크를 실제 물리 경로로 변환하여 출력' }],
    examples: [{ command: 'pwd', desc: '현재 위치의 절대 경로 출력 (예: /home/student/projects)' }],
  },
  {
    id: 'unix-mkdir',
    category: 'unix',
    name: 'mkdir',
    summary: '새 디렉터리를 생성한다',
    description: 'Make Directory의 약자로, 지정한 이름의 새 디렉터리를 만든다.',
    options: [
      { flag: '-p', desc: '상위 디렉터리가 없으면 함께 생성 (중첩 경로를 한 번에 생성)' },
      { flag: '-v', desc: '생성한 디렉터리를 화면에 출력 (verbose)' },
    ],
    examples: [
      { command: 'mkdir lab1', desc: 'lab1이라는 디렉터리 생성' },
      { command: 'mkdir -p projects/2024/lab1', desc: '중첩된 경로를 한 번에 생성' },
    ],
  },
  {
    id: 'unix-rm',
    category: 'unix',
    name: 'rm',
    summary: '파일이나 디렉터리를 삭제한다',
    description:
      'Remove의 약자. 휴지통을 거치지 않고 즉시 삭제되므로 특히 -r, -f 옵션을 함께 쓸 때는 대상 경로를 반드시 확인하고 실행해야 한다.',
    options: [
      { flag: '-r', desc: '디렉터리와 그 안의 내용을 재귀적으로 삭제' },
      { flag: '-f', desc: '삭제 확인 없이 강제로 삭제, 존재하지 않는 파일도 오류 없이 무시' },
      { flag: '-i', desc: '삭제 전 각 파일마다 확인 메시지 출력' },
    ],
    examples: [
      { command: 'rm old.txt', desc: 'old.txt 파일 삭제' },
      { command: 'rm -r build/', desc: 'build 디렉터리와 그 내용 전체 삭제' },
    ],
  },
  {
    id: 'unix-cp',
    category: 'unix',
    name: 'cp',
    summary: '파일이나 디렉터리를 복사한다',
    description: 'Copy의 약자로, 원본을 그대로 둔 채 지정한 위치에 사본을 만든다.',
    options: [
      { flag: '-r', desc: '디렉터리 전체를 재귀적으로 복사' },
      { flag: '-i', desc: '복사 대상 경로에 동일한 이름의 파일이 있으면 덮어쓰기 전에 확인' },
    ],
    examples: [
      { command: 'cp report.txt report_backup.txt', desc: '파일을 다른 이름으로 복사' },
      { command: 'cp -r src/ src_backup/', desc: '디렉터리 전체를 복사' },
    ],
  },
  {
    id: 'unix-mv',
    category: 'unix',
    name: 'mv',
    summary: '파일/디렉터리를 이동하거나 이름을 변경한다',
    description:
      'Move의 약자. 목적지가 다른 디렉터리 경로이면 "이동", 같은 디렉터리 내에서 새 이름을 지정하면 "이름 변경"으로 동작한다.',
    options: [{ flag: '-i', desc: '덮어쓰기 전에 확인 메시지 출력' }],
    examples: [
      { command: 'mv draft.txt final.txt', desc: '파일 이름을 draft.txt에서 final.txt로 변경' },
      { command: 'mv report.pdf archive/', desc: 'report.pdf를 archive 디렉터리로 이동' },
    ],
  },
  {
    id: 'unix-cat',
    category: 'unix',
    name: 'cat',
    summary: '파일 내용을 화면에 출력한다',
    description:
      'Concatenate의 약자로, 하나 이상의 파일 내용을 이어서 표준 출력으로 보여준다. 짧은 텍스트 파일 내용을 빠르게 확인할 때 자주 쓴다.',
    options: [
      { flag: '-n', desc: '출력 각 줄 앞에 줄 번호를 붙여서 표시' },
      { flag: '-A', desc: '탭, 줄바꿈 등 숨겨진 특수 문자를 기호로 표시' },
    ],
    examples: [
      { command: 'cat notes.txt', desc: 'notes.txt 파일 내용 출력' },
      { command: 'cat a.txt b.txt > merged.txt', desc: '두 파일을 이어붙여 merged.txt로 저장' },
    ],
  },
  {
    id: 'unix-grep',
    category: 'unix',
    name: 'grep',
    summary: '텍스트에서 패턴과 일치하는 줄을 검색한다',
    description:
      'Global Regular Expression Print의 약자. 파일이나 다른 명령어의 출력에서 특정 문자열/정규표현식과 일치하는 줄만 걸러서 보여준다.',
    options: [
      { flag: '-i', desc: '대소문자를 구분하지 않고 검색' },
      { flag: '-r', desc: '디렉터리 내 모든 파일을 재귀적으로 검색' },
      { flag: '-n', desc: '일치한 줄의 줄 번호를 함께 표시' },
      { flag: '-v', desc: '패턴과 일치하지 않는 줄만 표시(반전 검색)' },
    ],
    examples: [
      { command: 'grep "TODO" main.js', desc: 'main.js에서 TODO가 포함된 줄 찾기' },
      { command: 'grep -rn "error" ./logs', desc: 'logs 디렉터리 하위 모든 파일에서 error 검색, 줄 번호 표시' },
    ],
  },
  {
    id: 'unix-find',
    category: 'unix',
    name: 'find',
    summary: '조건에 맞는 파일/디렉터리를 검색한다',
    description:
      '지정한 경로 아래에서 이름, 타입, 수정 시각 등 조건에 맞는 파일과 디렉터리를 재귀적으로 탐색한다.',
    options: [
      { flag: '-name', desc: '파일 이름 패턴으로 검색 (예: -name "*.log")' },
      { flag: '-type', desc: '타입으로 검색 (f: 파일, d: 디렉터리)' },
      { flag: '-mtime', desc: '수정된 지 지정한 일수가 지난 파일 검색' },
    ],
    examples: [
      { command: 'find . -name "*.txt"', desc: '현재 디렉터리 하위에서 .txt 파일 모두 찾기' },
      { command: 'find . -type d -name "node_modules"', desc: 'node_modules 디렉터리 찾기' },
    ],
  },
  {
    id: 'unix-chmod',
    category: 'unix',
    name: 'chmod',
    summary: '파일/디렉터리의 접근 권한을 변경한다',
    description:
      'Change Mode의 약자로, 파일 소유자/그룹/기타 사용자에 대한 읽기(r)·쓰기(w)·실행(x) 권한을 설정한다. 실습 스크립트를 실행 파일로 만들 때 자주 쓴다.',
    options: [
      { flag: '+x', desc: '실행 권한 추가' },
      { flag: '-R', desc: '디렉터리 내 모든 파일에 재귀적으로 적용' },
      { flag: '755 / 644', desc: '숫자 표기법으로 소유자/그룹/기타 권한을 한 번에 지정' },
    ],
    examples: [
      { command: 'chmod +x deploy.sh', desc: 'deploy.sh에 실행 권한 부여' },
      { command: 'chmod 644 config.yml', desc: '소유자는 읽기/쓰기, 그 외는 읽기만 가능하도록 설정' },
    ],
  },
  {
    id: 'unix-ps',
    category: 'unix',
    name: 'ps',
    summary: '현재 실행 중인 프로세스 목록을 보여준다',
    description:
      'Process Status의 약자. 시스템에서 실행 중인 프로세스와 그 PID(프로세스 ID), 자원 사용량 등을 확인할 때 사용한다.',
    options: [
      { flag: '-e', desc: '시스템에서 실행 중인 모든 프로세스 표시' },
      { flag: '-f', desc: '전체(full) 형식으로 부모 프로세스, 실행 명령어 등을 함께 표시' },
      { flag: 'aux', desc: '(BSD 스타일) 모든 사용자의 모든 프로세스를 자세히 표시' },
    ],
    examples: [
      { command: 'ps aux', desc: '모든 사용자의 실행 중인 프로세스 상세 목록 출력' },
      { command: 'ps -ef | grep node', desc: '전체 프로세스 중 node가 포함된 줄만 검색' },
    ],
  },
  {
    id: 'unix-kill',
    category: 'unix',
    name: 'kill',
    summary: '지정한 PID의 프로세스에 종료 신호를 보낸다',
    description:
      '실행 중인 프로세스에 시그널을 전달해 종료를 요청한다. 응답이 없는 프로세스를 강제로 끝낼 때 사용하며, 대상 PID는 ps 명령어로 먼저 확인한다.',
    options: [
      { flag: '-9', desc: 'SIGKILL 시그널을 보내 프로세스를 즉시 강제 종료' },
      { flag: '-15', desc: 'SIGTERM 시그널을 보내 정상 종료를 요청 (기본값)' },
    ],
    examples: [
      { command: 'kill 12345', desc: 'PID가 12345인 프로세스에 종료 요청' },
      { command: 'kill -9 12345', desc: 'PID 12345 프로세스를 강제 종료' },
    ],
  },
  {
    id: 'unix-man',
    category: 'unix',
    name: 'man',
    summary: '명령어의 공식 매뉴얼 페이지를 보여준다',
    description:
      'Manual의 약자. 각 명령어의 전체 옵션과 사용법이 담긴 공식 문서를 터미널에서 바로 조회할 수 있다. 옵션이 기억나지 않을 때 가장 먼저 확인하면 좋다.',
    options: [{ flag: '-k', desc: '키워드로 관련 매뉴얼 페이지를 검색' }],
    examples: [
      { command: 'man ls', desc: 'ls 명령어의 매뉴얼 페이지 열기 (q로 종료)' },
      { command: 'man -k copy', desc: '"copy"와 관련된 매뉴얼 페이지 목록 검색' },
    ],
  },
  {
    id: 'unix-touch',
    category: 'unix',
    name: 'touch',
    summary: '빈 파일을 생성하거나 파일의 수정 시각을 갱신한다',
    description:
      '지정한 이름의 파일이 없으면 크기 0의 빈 파일을 새로 만들고, 이미 존재하면 파일의 최종 수정 시각만 현재 시각으로 갱신한다.',
    options: [{ flag: '-t', desc: '지정한 타임스탬프로 수정 시각을 설정' }],
    examples: [
      { command: 'touch index.html', desc: 'index.html 빈 파일 생성' },
      { command: 'touch a.txt b.txt c.txt', desc: '여러 개의 빈 파일을 한 번에 생성' },
    ],
  },

  // ── Git ───────────────────────────────────────────
  {
    id: 'git-init',
    category: 'git',
    name: 'git init',
    summary: '현재 디렉터리를 git 저장소로 초기화한다',
    description:
      '현재 디렉터리에 .git 숨김 디렉터리를 생성해 버전 관리를 시작할 수 있게 한다. 새 프로젝트를 시작할 때 최초 1회 실행한다.',
    options: [{ flag: '-b <name>', desc: '초기 브랜치 이름을 지정 (예: -b main)' }],
    examples: [
      { command: 'git init', desc: '현재 디렉터리를 git 저장소로 초기화' },
      { command: 'git init -b main', desc: 'main을 기본 브랜치로 하는 저장소 초기화' },
    ],
  },
  {
    id: 'git-clone',
    category: 'git',
    name: 'git clone',
    summary: '원격 저장소를 로컬로 복제한다',
    description:
      '원격(GitHub 등)에 있는 저장소 전체(히스토리 포함)를 현재 디렉터리 하위에 그대로 복제해 온다. 팀 프로젝트 실습을 시작할 때 가장 먼저 실행하는 명령어다.',
    options: [
      { flag: '--depth <n>', desc: '최근 n개 커밋만 가져오는 얕은 복제로 다운로드 용량 절약' },
      { flag: '-b <branch>', desc: '기본 브랜치가 아닌 특정 브랜치를 지정해 복제' },
    ],
    examples: [
      { command: 'git clone https://github.com/user/repo.git', desc: '원격 저장소를 현재 위치에 복제' },
      { command: 'git clone --depth 1 <url>', desc: '최근 커밋 1개만 가져오는 얕은 복제' },
    ],
  },
  {
    id: 'git-add',
    category: 'git',
    name: 'git add',
    summary: '변경된 파일을 커밋 대상(스테이지)에 추가한다',
    description:
      '작업 디렉터리에서 수정/추가한 파일을 스테이징 영역(index)에 올려, 다음 git commit에 포함시킬 준비를 한다.',
    options: [
      { flag: '.', desc: '(경로로 사용) 현재 디렉터리 하위의 모든 변경 사항 추가' },
      { flag: '-p', desc: '변경 내용을 부분(patch) 단위로 선택하며 추가' },
    ],
    examples: [
      { command: 'git add main.js', desc: 'main.js 파일만 스테이징' },
      { command: 'git add .', desc: '현재 디렉터리 하위의 모든 변경 사항 스테이징' },
    ],
  },
  {
    id: 'git-commit',
    category: 'git',
    name: 'git commit',
    summary: '스테이징된 변경 사항을 저장소 히스토리에 기록한다',
    description:
      '스테이징 영역에 있는 변경 사항을 메시지와 함께 하나의 커밋(스냅샷)으로 저장한다. 커밋 메시지는 변경의 "왜"를 짧게 설명하는 것이 좋다.',
    options: [
      { flag: '-m "<message>"', desc: '커밋 메시지를 에디터 없이 바로 지정' },
      { flag: '-a', desc: '이미 추적 중인 파일의 수정 사항을 add 없이 바로 커밋에 포함' },
      { flag: '--amend', desc: '직전 커밋의 내용이나 메시지를 수정' },
    ],
    examples: [
      { command: 'git commit -m "fix: 로그인 오류 수정"', desc: '메시지와 함께 커밋 생성' },
      { command: 'git commit -am "update readme"', desc: '추적 중인 파일 변경 사항을 add 없이 바로 커밋' },
    ],
  },
  {
    id: 'git-status',
    category: 'git',
    name: 'git status',
    summary: '작업 디렉터리와 스테이징 영역의 상태를 보여준다',
    description:
      '현재 브랜치, 스테이징된 변경, 스테이징되지 않은 변경, 추적되지 않는 파일 목록을 한눈에 보여준다. 커밋 전 항상 확인하면 좋은 명령어다.',
    options: [{ flag: '-s', desc: '변경 상태를 파일당 한 줄의 짧은 형식으로 출력' }],
    examples: [
      { command: 'git status', desc: '현재 저장소 상태 확인' },
      { command: 'git status -s', desc: '변경 사항을 축약된 형식으로 확인' },
    ],
  },
  {
    id: 'git-diff',
    category: 'git',
    name: 'git diff',
    summary: '변경 내용을 줄 단위로 비교해서 보여준다',
    description:
      '작업 디렉터리, 스테이징 영역, 커밋 간의 실제 코드 변경 내용(추가/삭제된 줄)을 비교해서 보여준다.',
    options: [
      { flag: '--staged', desc: '스테이징된 변경 내용과 마지막 커밋을 비교 (add 이후 커밋 전 확인)' },
      { flag: '<commit1> <commit2>', desc: '(인자로 사용) 두 커밋 사이의 차이 비교' },
    ],
    examples: [
      { command: 'git diff', desc: '스테이징 안 된 변경 사항 확인' },
      { command: 'git diff --staged', desc: '스테이징된 변경 사항을 마지막 커밋과 비교' },
    ],
  },
  {
    id: 'git-log',
    category: 'git',
    name: 'git log',
    summary: '커밋 히스토리를 시간 순으로 보여준다',
    description:
      '현재 브랜치의 커밋 기록을 작성자, 날짜, 메시지와 함께 최신 순으로 출력한다.',
    options: [
      { flag: '--oneline', desc: '각 커밋을 짧은 해시와 메시지 한 줄로 요약해서 표시' },
      { flag: '--graph', desc: '브랜치와 병합 구조를 ASCII 그래프로 함께 표시' },
      { flag: '-n <숫자>', desc: '최근 n개의 커밋만 표시' },
    ],
    examples: [
      { command: 'git log --oneline', desc: '커밋 기록을 한 줄씩 요약해서 확인' },
      { command: 'git log --oneline --graph -n 10', desc: '최근 10개 커밋을 그래프와 함께 확인' },
    ],
  },
  {
    id: 'git-branch',
    category: 'git',
    name: 'git branch',
    summary: '브랜치를 조회, 생성, 삭제한다',
    description:
      '저장소 내 브랜치 목록을 보여주거나 새 브랜치를 생성/삭제한다. 기능 단위로 브랜치를 나눠 작업할 때 기본이 되는 명령어다.',
    options: [
      { flag: '-a', desc: '로컬과 원격 브랜치를 모두 표시' },
      { flag: '-d <name>', desc: '지정한 브랜치를 삭제 (병합되지 않았으면 실패)' },
      { flag: '-D <name>', desc: '병합 여부와 관계없이 강제로 브랜치 삭제' },
    ],
    examples: [
      { command: 'git branch', desc: '로컬 브랜치 목록 확인' },
      { command: 'git branch feature/login', desc: 'feature/login이라는 새 브랜치 생성' },
    ],
  },
  {
    id: 'git-checkout',
    category: 'git',
    name: 'git checkout',
    summary: '브랜치를 전환하거나 파일을 특정 시점으로 되돌린다',
    description:
      '지정한 브랜치로 작업 디렉터리를 전환한다. 최신 git에서는 브랜치 전환 전용으로 git switch, 파일 복원 전용으로 git restore가 분리되어 있지만, checkout은 두 역할을 모두 수행할 수 있다.',
    options: [
      { flag: '-b <name>', desc: '새 브랜치를 생성함과 동시에 그 브랜치로 전환' },
      { flag: '-- <path>', desc: '지정한 파일을 마지막 커밋 상태로 되돌림' },
    ],
    examples: [
      { command: 'git checkout main', desc: 'main 브랜치로 전환' },
      { command: 'git checkout -b feature/search', desc: 'feature/search 브랜치를 새로 만들고 전환' },
    ],
  },
  {
    id: 'git-merge',
    category: 'git',
    name: 'git merge',
    summary: '다른 브랜치의 변경 내용을 현재 브랜치에 합친다',
    description:
      '지정한 브랜치의 커밋 히스토리를 현재 브랜치로 통합한다. 같은 파일의 같은 부분이 서로 다르게 수정되었으면 충돌(conflict)이 발생해 수동으로 해결해야 한다.',
    options: [
      { flag: '--no-ff', desc: '빨리 감기(fast-forward) 병합이 가능해도 병합 커밋을 별도로 생성' },
      { flag: '--abort', desc: '충돌 발생 시 병합을 취소하고 병합 이전 상태로 복귀' },
    ],
    examples: [
      { command: 'git merge feature/login', desc: '현재 브랜치에 feature/login의 변경 내용 합치기' },
      { command: 'git merge --abort', desc: '충돌이 발생한 병합을 취소' },
    ],
  },
  {
    id: 'git-push',
    category: 'git',
    name: 'git push',
    summary: '로컬 커밋을 원격 저장소에 업로드한다',
    description: '로컬 브랜치에 쌓인 커밋을 원격 저장소(origin 등)의 해당 브랜치에 반영한다.',
    options: [
      { flag: '-u <remote> <branch>', desc: '로컬 브랜치와 원격 브랜치를 연결(upstream 설정)하며 푸시' },
      { flag: '--force', desc: '원격 히스토리를 덮어쓰며 강제 푸시 (팀원과 충돌 위험이 있어 주의)' },
    ],
    examples: [
      { command: 'git push origin main', desc: '로컬 main 브랜치를 원격 origin에 푸시' },
      { command: 'git push -u origin feature/login', desc: '새 브랜치를 원격에 처음 푸시하며 연결 설정' },
    ],
  },
  {
    id: 'git-pull',
    category: 'git',
    name: 'git pull',
    summary: '원격 저장소의 변경 사항을 가져와 병합한다',
    description:
      'git fetch로 원격의 최신 커밋을 가져온 뒤, 현재 브랜치에 자동으로 병합(merge)까지 수행하는 명령어다. 작업 시작 전 최신 상태를 받아올 때 사용한다.',
    options: [{ flag: '--rebase', desc: '병합 대신 리베이스 방식으로 원격 변경 사항을 반영' }],
    examples: [
      { command: 'git pull origin main', desc: '원격 main 브랜치의 최신 변경 사항 가져와 병합' },
      { command: 'git pull --rebase', desc: '리베이스 방식으로 원격 변경 사항 반영' },
    ],
  },
  {
    id: 'git-fetch',
    category: 'git',
    name: 'git fetch',
    summary: '원격 저장소의 변경 사항을 로컬로 내려받기만 한다',
    description:
      '원격 저장소의 최신 커밋과 브랜치 정보를 로컬로 가져오되, 현재 작업 브랜치에 자동으로 병합하지는 않는다. 병합 전에 원격에 어떤 변경이 있는지 먼저 확인하고 싶을 때 사용한다.',
    options: [{ flag: '--all', desc: '등록된 모든 원격 저장소의 변경 사항을 가져옴' }],
    examples: [
      { command: 'git fetch origin', desc: 'origin 원격 저장소의 최신 정보 가져오기' },
      { command: 'git log origin/main --oneline', desc: 'fetch 이후 원격 브랜치의 커밋 내용을 병합 없이 확인' },
    ],
  },
  {
    id: 'git-reset',
    category: 'git',
    name: 'git reset',
    summary: '커밋 히스토리나 스테이징 상태를 특정 시점으로 되돌린다',
    description:
      'HEAD와 브랜치 포인터를 지정한 커밋으로 이동시킨다. 옵션에 따라 작업 디렉터리 내용까지 되돌릴지 여부가 달라지므로, 특히 --hard는 신중하게 사용해야 한다.',
    options: [
      { flag: '--soft <commit>', desc: '커밋만 되돌리고 변경 내용은 스테이징 상태로 유지' },
      { flag: '--mixed <commit>', desc: '커밋과 스테이징을 되돌리되 작업 디렉터리 파일은 그대로 유지 (기본값)' },
      { flag: '--hard <commit>', desc: '커밋, 스테이징, 작업 디렉터리까지 모두 되돌림 (변경 내용 손실 주의)' },
    ],
    examples: [
      { command: 'git reset --soft HEAD~1', desc: '직전 커밋을 취소하고 변경 내용은 스테이징 상태로 보존' },
      { command: 'git reset --mixed HEAD~1', desc: '직전 커밋을 취소하고 변경 내용은 작업 디렉터리에 보존' },
    ],
  },
  {
    id: 'git-stash',
    category: 'git',
    name: 'git stash',
    summary: '작업 중인 변경 사항을 임시로 저장해둔다',
    description:
      '커밋하기엔 아직 이르지만 브랜치를 전환해야 할 때, 현재 작업 디렉터리의 변경 사항을 임시 저장 공간에 보관하고 작업 디렉터리를 깨끗한 상태로 되돌린다.',
    options: [
      { flag: 'list', desc: '(하위 명령) 저장된 stash 목록 확인' },
      { flag: 'pop', desc: '(하위 명령) 가장 최근 stash를 꺼내와 적용하고 목록에서 제거' },
      { flag: 'drop', desc: '(하위 명령) 저장된 stash를 목록에서 삭제' },
    ],
    examples: [
      { command: 'git stash', desc: '현재 변경 사항을 임시 저장하고 작업 디렉터리 초기화' },
      { command: 'git stash pop', desc: '가장 최근에 저장한 변경 사항을 다시 적용' },
    ],
  },
];
