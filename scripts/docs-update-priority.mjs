import { execFileSync } from 'node:child_process'

const categoryLabels = {
  required: '필수 확인 문서',
  conditional: '상황별 확인 문서',
  later: '나중에 확인 문서',
}

const categoryOrder = ['required', 'conditional', 'later']

const rules = [
  {
    name: '개발 체크리스트',
    category: 'required',
    order: 1,
    docs: ['SPEC.md'],
    patterns: [
      /^SPEC\.md$/,
      /^src\//,
      /^docs\/features\//,
      /^scripts\//,
      /^skills\//,
      /^package(-lock)?\.json$/,
      /^eslint\.config\.js$/,
      /^tsconfig\.json$/,
      /^AGENTS\.md$/,
    ],
    reason: '기능, 라우트, 스크립트, 스킬, 개발 규칙이 바뀌면 공통 개발 절차와 검증 체크리스트가 맞아야 합니다.',
  },
  {
    name: '기획/위키 기준 문서',
    category: 'required',
    order: 2,
    docs: ['docs/plan.md', 'docs/notion/icu-product-plan-notion.md'],
    patterns: [
      /^docs\/plan\.md$/,
      /^docs\/features\//,
      /^docs\/user-flow\.md$/,
      /^prototype\.(html|css)$/,
      /^src\/pages\//,
      /^src\/features\//,
      /^src\/data\//,
    ],
    reason: '제품 범위, 사용자 흐름, 화면 동작, mock 학습 데이터가 바뀌면 최상위 기획서와 Notion 내보내기 문서가 먼저 맞아야 합니다.',
  },
  {
    name: 'Git Branching Lab 기능 문서',
    category: 'required',
    order: 3,
    docs: ['docs/features/git-branching-lab.md'],
    patterns: [/^src\/features\/git-lab(\/|$)/, /^docs\/features\/git-branching-lab\.md$/],
    reason: 'Git Lab 화면, 엔진, 레벨, SVG 그래프가 바뀌면 지원 명령어와 목표 비교 기준 문서가 같이 맞아야 합니다.',
  },
  {
    name: 'Learning Workspace 기능 문서',
    category: 'required',
    order: 4,
    docs: ['docs/features/learning-workspace.md'],
    patterns: [/^src\/features\/learning-workspace(\/|$)/, /^docs\/features\/learning-workspace\.md$/],
    reason: '학습 워크스페이스 화면과 상태 흐름이 바뀌면 IDE 학습 문서가 같이 맞아야 합니다.',
  },
  {
    name: 'Today Learning 기능 문서',
    category: 'required',
    order: 5,
    docs: ['docs/features/today-learning.md'],
    patterns: [/^src\/features\/today-learning(\/|$)/, /^docs\/features\/today-learning\.md$/],
    reason: '오늘 학습 허브의 큐, 진행률, 복습 흐름이 바뀌면 Today Learning 문서가 같이 맞아야 합니다.',
  },
  {
    name: '디자인 산출물 인덱스',
    category: 'conditional',
    order: 1,
    docs: ['docs/design/README.md', 'docs/design/design-brief.md', 'docs/design/screen-spec.md'],
    patterns: [
      /^docs\/design\//,
      /^prototype\.(html|css)$/,
      /^src\/styles\//,
      /^src\/pages\//,
      /^src\/components\//,
      /^src\/components\/fonts(\/|$)/,
      /^src\/features\/onboarding(\/|$)/,
      /^src\/features\/profile(\/|$)/,
    ],
    reason: '화면, 색상, Figma export, 폰트, 온보딩, 프로필, 접근성 기준이 바뀌면 디자인 문서의 읽는 순서와 이미지 링크가 깨지지 않아야 합니다.',
  },
  {
    name: '에이전트 작업 컨텍스트',
    category: 'conditional',
    order: 2,
    docs: ['AGENTS.md', 'skills/design/SKILL.md'],
    patterns: [
      /^AGENTS\.md$/,
      /^skills\//,
      /^package(-lock)?\.json$/,
      /^tsconfig\.json$/,
      /^eslint\.config\.js$/,
      /^src\/app\//,
      /^src\/stores\//,
      /^src\/types\//,
      /^src\/components\/fonts(\/|$)/,
      /^src\/features\/git-lab(\/|$)/,
      /^src\/features\/onboarding(\/|$)/,
      /^src\/features\/profile(\/|$)/,
    ],
    reason: '개발 규칙, 디렉토리 컨벤션, 기술 스택, 디자인 작업 기준이 바뀌면 다음 에이전트가 같은 기준으로 작업해야 합니다.',
  },
  {
    name: 'Notion 내보내기/작업 로그',
    category: 'conditional',
    order: 3,
    docs: ['docs/notion/icu-product-plan-notion.md', 'docs/notion/* 작업 로그'],
    patterns: [/^docs\/notion\//],
    reason: 'Notion으로 공유할 기획 문서나 작업 로그가 바뀌면 export용 Markdown 문서와 최신 작업 기록을 같이 확인해야 합니다.',
  },
  {
    name: '프로젝트 첫 진입 문서',
    category: 'later',
    order: 1,
    docs: ['README.md'],
    patterns: [/^README\.md$/, /^package(-lock)?\.json$/, /^src\//, /^prototype\.(html|css)$/],
    reason: '실행 방법, 기술 스택, 현재 구현 화면이 외부 설명과 달라질 때 README를 갱신합니다.',
  },
]

function normalizePath(path) {
  return path.replaceAll('\\', '/')
}

function getChangedFiles() {
  const output = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trimEnd()

  if (!output) {
    return []
  }

  return output
    .split('\n')
    .map((line) => {
      const status = line.slice(0, 2).trim() || 'M'
      const rawPath = line.slice(3).trim()
      const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath

      return {
        status,
        path: normalizePath(path),
      }
    })
    .filter((file) => file.path)
}

function collectMatches(changedFiles) {
  return rules
    .map((rule) => {
      const matches = changedFiles.filter((file) =>
        rule.patterns.some((pattern) => pattern.test(file.path)),
      )

      return {
        ...rule,
        matches,
      }
    })
    .filter((rule) => rule.matches.length > 0)
    .sort(
      (a, b) =>
        categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
        a.order - b.order ||
        a.name.localeCompare(b.name, 'ko'),
    )
}

function uniqueDocs(matches) {
  return [...new Set(matches.flatMap((match) => match.docs))]
}

function printChangedFiles(changedFiles) {
  console.log('## 변경 파일')
  for (const file of changedFiles) {
    console.log(`- ${file.status} ${file.path}`)
  }
  console.log('')
}

function printMatchGroup(label, matches) {
  if (matches.length === 0) {
    return
  }

  console.log(`## ${label}`)
  for (const match of matches) {
    console.log(`### ${match.name}`)
    console.log(`- 업데이트 문서: ${match.docs.join(', ')}`)
    console.log(`- 근거: ${match.reason}`)
    console.log(`- 관련 변경: ${match.matches.map((file) => file.path).join(', ')}`)
    console.log('')
  }
}

function printChecklist(matches) {
  console.log('## PR 체크리스트')
  console.log('- [ ] `npm run docs:priority` 결과를 확인했다.')
  console.log('- [ ] 추천된 필수 문서를 업데이트하거나, 업데이트 불필요 사유를 PR에 남겼다.')
  console.log('- [ ] Notion export가 필요한 작업이면 `docs/notion/*` 문서를 갱신했다.')

  if (matches.some((match) => match.docs.includes('skills/design/SKILL.md'))) {
    console.log('- [ ] `PYTHONUTF8=1` 설정 후 `quick_validate.py skills/design` 검증을 통과했다.')
  }

  console.log('')
}

function printOperatingNotes(matches) {
  console.log('## 운영 메모')
  console.log('- 이 스크립트는 문서를 자동 수정하지 않고, 업데이트 후보만 추천합니다.')
  console.log('- Windows PowerShell에서 한글이 깨져 보이면 파일 자체 인코딩과 별개로 출력 코드페이지 문제일 수 있습니다.')

  const docs = uniqueDocs(matches)
  if (docs.length > 0) {
    console.log(`- 이번 변경에서 확인할 문서 후보: ${docs.join(', ')}`)
  }
}

function printReport(changedFiles, matches) {
  console.log('# 작업 기반 문서 업데이트 우선순위')
  console.log('')

  if (changedFiles.length === 0) {
    console.log('현재 git 변경 사항이 없습니다. 업데이트할 문서 후보도 없습니다.')
    return
  }

  printChangedFiles(changedFiles)

  if (matches.length === 0) {
    console.log('## 추천')
    console.log('- 현재 변경 파일과 연결된 문서 업데이트 규칙이 없습니다.')
    return
  }

  for (const category of categoryOrder) {
    printMatchGroup(
      categoryLabels[category],
      matches.filter((match) => match.category === category),
    )
  }

  printChecklist(matches)
  printOperatingNotes(matches)
}

const changedFiles = getChangedFiles()
const matches = collectMatches(changedFiles)

printReport(changedFiles, matches)