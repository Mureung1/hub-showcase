import fs from 'node:fs'
import path from 'node:path'

const ua = path.join(process.cwd(), '.ua')
const batches = JSON.parse(fs.readFileSync(path.join(ua, 'intermediate', 'batches.json'), 'utf8')).batches
const E = (source, target, type, weight) => ({ source, target, type, direction: 'forward', weight })
const F = (p) => `file:${p}`
const FN = (p, n) => `function:${p}:${n}`
const M = (p) => `table:${p}:migration`
const T = (p, n) => `table:${p}:${n}`
const write = (i, nodes, edges) => fs.writeFileSync(path.join(ua, 'intermediate', `batch-${i}.json`), `${JSON.stringify({ nodes, edges }, null, 2)}\n`)

const codeFiles = [
  ['apps/web/src/features/projects/ProjectListPage.jsx', '로그인 상태의 프로젝트 요약과 받은 초대를 조회하고 검색·초대 응답·프로젝트 이동·설정 및 아이콘 변경 모달을 조율한다.', ['component', 'project-overview', 'invitation', 'search'], 'moderate'],
  ['apps/web/src/features/projects/ProjectListPage.test.jsx', '프로젝트 목록의 라우팅, 검색과 빈 상태, 생성 후 이동, 진행률 경계 처리, 아이콘 변경 흐름을 사용자 관점에서 검증한다.', ['test', 'integration-test', 'project-overview', 'accessibility'], 'moderate'],
  ['apps/web/src/features/projects/components/ProjectCard.jsx', '프로젝트 상태·진행률·기간·멤버·아이콘을 접근 가능한 카드로 표시하고 열기, 아이콘 변경, 설정 동작을 노출한다.', ['component', 'project-summary', 'accessibility', 'progress'], 'moderate'],
  ['apps/web/src/features/projects/components/ProjectIcon.jsx', '공유 프로젝트 아이콘 키를 Lucide 아이콘으로 변환하며 알 수 없는 값은 기본 레이어 아이콘으로 대체한다.', ['component', 'icon', 'presentation', 'fallback'], 'simple'],
  ['apps/web/src/features/projects/components/ProjectIconPicker.jsx', '프로젝트 아이콘 후보를 모달에 표시하고 선택 결과를 TeamFlow 상태 액션으로 저장하며 진행 및 오류 상태를 관리한다.', ['component', 'modal', 'project-settings', 'event-handler'], 'simple'],
  ['apps/web/src/features/projects/components/projectIconOptions.js', '프로젝트 아이콘 선택지와 아이콘 키의 한국어 표시 이름을 제공한다.', ['utility', 'configuration', 'icon', 'localization'], 'simple'],
]
const functions = [
  ['apps/web/src/features/projects/ProjectListPage.jsx', 'ProjectListPage', [15, 117], '프로젝트와 초대를 상태에서 파생해 렌더링하고 검색·초대 응답·페이지 이동·편집 모달을 연결한다.', ['component', 'page', 'state-management', 'event-handler'], 'moderate'],
  ['apps/web/src/features/projects/components/ProjectCard.jsx', 'ProjectCard', [25, 99], '프로젝트 요약을 시각화하고 진행률을 경계값으로 정규화하며 선택 가능한 카드 동작을 제공한다.', ['component', 'project-summary', 'accessibility', 'validation'], 'moderate'],
  ['apps/web/src/features/projects/components/ProjectIcon.jsx', 'ProjectIcon', [18, 21], '프로젝트 아이콘 키에 해당하는 Lucide 아이콘을 장식용 SVG로 렌더링한다.', ['component', 'icon', 'presentation'], 'simple'],
  ['apps/web/src/features/projects/components/ProjectIconPicker.jsx', 'ProjectIconPicker', [10, 52], '아이콘 선택 UI와 비동기 저장 상태를 관리하고 성공 시 모달을 닫는다.', ['component', 'modal', 'state-management', 'event-handler'], 'simple'],
  ['apps/web/src/features/projects/components/projectIconOptions.js', 'getProjectIconLabel', [12, 14], '아이콘 키의 한국어 레이블을 찾고 등록되지 않은 키에는 기본값을 반환한다.', ['utility', 'lookup', 'localization'], 'simple'],
]
const nodes7 = codeFiles.map(([p, summary, tags, complexity]) => ({ id: F(p), type: 'file', name: path.basename(p), filePath: p, summary, tags, complexity }))
for (const [p, name, lineRange, summary, tags, complexity] of functions) {
  nodes7.push({ id: FN(p, name), type: 'function', name, filePath: p, lineRange, summary, tags, complexity })
}
const batch7 = batches.find((b) => b.batchIndex === 7)
const edges7 = []
for (const [source, targets] of Object.entries(batch7.batchImportData)) for (const target of targets) edges7.push(E(F(source), F(target), 'imports', 0.7))
for (const [p, name] of functions) {
  edges7.push(E(F(p), FN(p, name), 'contains', 1))
  edges7.push(E(F(p), FN(p, name), 'exports', 0.8))
}
const list = FN(codeFiles[0][0], 'ProjectListPage')
const card = FN(codeFiles[2][0], 'ProjectCard')
const icon = FN(codeFiles[3][0], 'ProjectIcon')
const picker = FN(codeFiles[4][0], 'ProjectIconPicker')
const label = FN(codeFiles[5][0], 'getProjectIconLabel')
edges7.push(
  E(list, card, 'calls', 0.8),
  E(list, picker, 'calls', 0.8),
  E(list, FN('apps/web/src/features/projects/components/ProjectSettingsModal.jsx', 'ProjectSettingsModal'), 'calls', 0.8),
  E(list, FN('apps/web/src/state/selectors.js', 'selectProjectSummaries'), 'calls', 0.8),
  E(list, FN('apps/web/src/state/selectors.js', 'selectReceivedInvitations'), 'calls', 0.8),
  E(list, FN('apps/web/src/state/useTeamFlow.js', 'useTeamFlow'), 'calls', 0.8),
  E(card, icon, 'calls', 0.8),
  E(card, label, 'calls', 0.8),
  E(card, FN('apps/web/src/lib/format.js', 'formatPeriod'), 'calls', 0.8),
  E(picker, icon, 'calls', 0.8),
  E(picker, FN('apps/web/src/components/ui/Modal.jsx', 'Modal'), 'calls', 0.8),
  E(picker, FN('apps/web/src/state/useTeamFlow.js', 'useTeamFlow'), 'calls', 0.8),
  E(F(codeFiles[0][0]), F(codeFiles[1][0]), 'tested_by', 0.5),
  E(F(codeFiles[2][0]), F(codeFiles[1][0]), 'tested_by', 0.5),
)
write(7, nodes7, edges7)

write(8, [{
  id: 'pipeline:.github/workflows/auto-merge.yml',
  type: 'pipeline',
  name: 'auto-merge.yml',
  filePath: '.github/workflows/auto-merge.yml',
  summary: '매일 예약 또는 수동 실행으로 열린 PR을 조회하고 대상 브랜치·review 라벨·변경 요청·충돌 규칙의 우선순위에 따라 코멘트, 연기, 종료 또는 병합한다.',
  tags: ['ci-cd', 'github-actions', 'pull-request', 'automation'],
  complexity: 'moderate',
  languageNotes: 'YAML 단계 안의 github-script가 GraphQL 조회와 REST 변경 작업을 함께 수행한다.',
}], [])

const migrations = [
  ['supabase/migrations/20260720030115_create_tasks.sql', '프로젝트별 할 일과 담당자, 마감일, 상태를 저장하는 tasks 테이블과 인덱스, RLS, service_role 권한을 설정한다.', ['database', 'migration', 'tasks', 'security'], 'simple'],
  ['supabase/migrations/20260721054012_google_auth_workspace.sql', 'Google 인증 사용자용 멤버·프로젝트·소속·게스트 데모 스키마를 만들고 tasks를 연결하며 RLS 정책과 프로젝트 생성 RPC를 구성한다.', ['database', 'migration', 'authentication', 'rls', 'rpc'], 'complex'],
  ['supabase/migrations/20260722112108_collaboration_and_content_crud.sql', '프로젝트 단위 멤버와 접근 권한으로 모델을 개편하고 초대·노트·자료 CRUD 테이블, 트리거, RLS 정책, 보안 RPC를 도입한다.', ['database', 'migration', 'collaboration', 'content', 'rls'], 'complex'],
  ['supabase/migrations/20260722114219_collaboration_and_content_hardening.sql', '협업 및 콘텐츠 테이블의 외래 키와 검사 제약, 초대 조회 정책, 자료 부모 검증, 프로젝트·멤버 RPC 권한을 강화한다.', ['database', 'migration', 'security', 'hardening', 'rls'], 'complex'],
  ['supabase/migrations/20260722115346_private_rpc_wrappers_and_fk_indexes.sql', '권한 있는 RPC 구현을 private 스키마로 이동하고 public에는 인증 전용 래퍼를 유지하며 외래 키 조회 인덱스를 추가한다.', ['database', 'migration', 'rpc', 'security', 'indexing'], 'moderate'],
  ['supabase/migrations/20260722154845_add_project_icon_key.sql', 'projects에 허용된 아이콘 키만 저장하는 열과 검사 제약을 추가하고 인증 사용자의 열 단위 갱신을 허용한다.', ['database', 'migration', 'project-settings', 'validation'], 'simple'],
  ['supabase/migrations/20260722155721_backfill_demo_project_icons.sql', '게스트 데모 워크스페이스의 프로젝트별 아이콘 키를 결정적으로 채운다.', ['database', 'migration', 'demo-data', 'backfill'], 'simple'],
  ['supabase/migrations/20260723093000_private_resource_uploads.sql', '비공개 Storage 버킷과 자료 파일 메타데이터를 추가하고 프로젝트 경로 기반 업로드·조회·삭제 RLS 정책을 구성한다.', ['database', 'migration', 'storage', 'security', 'upload'], 'moderate'],
  ['supabase/migrations/20260723094500_harden_private_resource_uploads.sql', '업로드 의도 생성과 완료 RPC, 상태 전이 제약, Storage 정책으로 비공개 파일 업로드 수명주기를 강화한다.', ['database', 'migration', 'storage', 'rpc', 'hardening'], 'complex'],
  ['supabase/migrations/20260723185956_remove_manual_assignees.sql', '수동 담당자 생성을 제거하고 작업 담당자를 실제 프로젝트 협업자로 제한하며 멤버 수정·삭제 RPC를 재정의한다.', ['database', 'migration', 'collaboration', 'authorization', 'rpc'], 'moderate'],
  ['supabase/migrations/20260724090000_mock_ai_team_member.sql', '프로젝트 AI 팀원과 실행 기록 스키마, RLS, 설정·실행·적용·거절 RPC를 추가하고 인증 및 데모 응답을 동일한 AI 계약으로 맞춘다.', ['database', 'migration', 'ai-agent', 'rpc', 'rls'], 'complex'],
  ['supabase/migrations/20260724093000_mock_ai_fk_indexes.sql', 'AI 실행의 에이전트·작업·노트 복합 외래 키를 지원하는 인덱스를 보강한다.', ['database', 'migration', 'indexing', 'performance'], 'simple'],
  ['supabase/migrations/20260724094500_fix_demo_ai_markdown.sql', '데모 AI 결과의 문자열 줄바꿈 표기를 실제 개행으로 변환해 Markdown 렌더링을 바로잡는다.', ['database', 'migration', 'demo-data', 'markdown'], 'simple'],
]
const tables = [
  [migrations[0][0], 'tasks', '프로젝트별 작업 제목, 담당자, 마감일, 상태, 설명과 생성 시각을 저장한다.', ['database', 'table', 'tasks', 'project-data']],
  [migrations[1][0], 'members', '워크스페이스 소유자와 인증 사용자에 연결된 사람 및 AI 멤버 프로필을 저장한다.', ['database', 'table', 'members', 'authentication']],
  [migrations[1][0], 'projects', '소유자별 프로젝트의 이름, 설명, 상태, 기간과 감사 시각을 저장한다.', ['database', 'table', 'projects', 'workspace']],
  [migrations[1][0], 'project_members', '프로젝트와 워크스페이스 멤버 사이의 소속 관계를 저장한다.', ['database', 'table', 'membership', 'relation']],
  [migrations[1][0], 'demo_workspaces', '게스트가 읽을 수 있는 활성 데모 워크스페이스 JSON 페이로드를 저장한다.', ['database', 'table', 'demo-data', 'json']],
  [migrations[2][0], 'members', '프로젝트 범위의 협업자와 AI 멤버 프로필, 인증 사용자 연결 정보를 저장하는 최신 멤버 모델이다.', ['database', 'table', 'members', 'collaboration']],
  [migrations[2][0], 'project_access', '인증 사용자와 프로젝트 멤버를 묶어 접근 권한의 근거를 제공한다.', ['database', 'table', 'authorization', 'membership']],
  [migrations[2][0], 'project_invitations', '초대 대상 이메일, 초대자, 상태와 응답 시각을 저장한다.', ['database', 'table', 'invitation', 'collaboration']],
  [migrations[2][0], 'notes', '프로젝트 공유 노트의 제목, 본문, 작성자와 수정 시각을 저장한다.', ['database', 'table', 'notes', 'content']],
  [migrations[2][0], 'resources', '프로젝트 자료의 계층, 유형, 링크·파일 메타데이터와 소유자를 저장한다.', ['database', 'table', 'resources', 'content']],
  [migrations[10][0], 'ai_agents', 'AI 멤버별 지침, 컨텍스트 설정, 활성 상태를 프로젝트 범위에서 관리한다.', ['database', 'table', 'ai-agent', 'configuration']],
  [migrations[10][0], 'ai_runs', 'AI 실행의 입력 스냅샷, 결과 Markdown, 오류, 적용 노트와 상태 전이를 기록한다.', ['database', 'table', 'ai-run', 'audit']],
]
const nodes9 = migrations.map(([p, summary, tags, complexity]) => ({
  id: M(p), type: 'table', name: path.basename(p), filePath: p, summary, tags, complexity,
  ...(complexity === 'complex' ? { languageNotes: 'PostgreSQL 함수, RLS 정책, 권한 부여를 함께 변경하는 순차 마이그레이션이다.' } : {}),
}))
for (const [p, name, summary, tags] of tables) nodes9.push({ id: T(p, name), type: 'table', name, filePath: p, summary, tags, complexity: 'moderate' })
const p = migrations.map((m) => m[0])
const target = {
  tasks: T(p[0], 'tasks'), authMembers: T(p[1], 'members'), projects: T(p[1], 'projects'),
  projectMembers: T(p[1], 'project_members'), demo: T(p[1], 'demo_workspaces'),
  members: T(p[2], 'members'), access: T(p[2], 'project_access'), invitations: T(p[2], 'project_invitations'),
  notes: T(p[2], 'notes'), resources: T(p[2], 'resources'), agents: T(p[10], 'ai_agents'), runs: T(p[10], 'ai_runs'),
}
const migrated = [
  [p[0], [target.tasks]],
  [p[1], [target.authMembers, target.projects, target.projectMembers, target.demo, target.tasks]],
  [p[2], [target.members, target.access, target.invitations, target.notes, target.resources, target.tasks, target.projects]],
  [p[3], [target.members, target.access, target.invitations, target.notes, target.resources, target.tasks]],
  [p[4], [target.access, target.invitations, target.notes, target.resources, target.members, target.projects]],
  [p[5], [target.projects]], [p[6], [target.demo]], [p[7], [target.resources]], [p[8], [target.resources]],
  [p[9], [target.tasks, target.members, target.access]],
  [p[10], [target.members, target.tasks, target.notes, target.agents, target.runs, target.demo]],
  [p[11], [target.runs]], [p[12], [target.demo]],
]
const edges9 = migrated.flatMap(([migration, targets]) => targets.map((t) => E(M(migration), t, 'migrates', 0.7)))
write(9, nodes9, edges9)

write(10, [
  { id: 'config:.oxlintrc.json', type: 'config', name: '.oxlintrc.json', filePath: '.oxlintrc.json', summary: 'React Hooks 규칙을 오류로, 컴포넌트 전용 내보내기 규칙을 경고로 검사하도록 oxlint를 설정한다.', tags: ['configuration', 'linting', 'react', 'code-quality'], complexity: 'simple' },
  { id: 'document:CLAUDE.md', type: 'document', name: 'CLAUDE.md', filePath: 'CLAUDE.md', summary: 'TeamFlow의 제품 목적, 기술 스택, 개발 명령, 코드·커밋·디자인 규칙과 금지 사항을 에이전트 작업 지침으로 정리한다.', tags: ['documentation', 'development', 'conventions', 'agent-guidance'], complexity: 'simple' },
  { id: 'document:README.md', type: 'document', name: 'README.md', filePath: 'README.md', summary: 'TeamFlow의 구현 상태와 전체 아키텍처, Supabase·Google OAuth 설정, 로컬 실행, 검증, Vercel·Render 배포를 안내한다.', tags: ['documentation', 'entry-point', 'architecture', 'onboarding'], complexity: 'moderate' },
  { id: 'config:package.json', type: 'config', name: 'package.json', filePath: 'package.json', summary: 'Node 24와 npm 11 기반 모노레포 워크스페이스, 웹·API 개발 명령, 빌드·린트·테스트 경로를 정의한다.', tags: ['configuration', 'monorepo', 'build-system', 'scripts'], complexity: 'simple' },
  { id: 'config:render.yaml', type: 'config', name: 'render.yaml', filePath: 'render.yaml', summary: 'Express API를 Render Node 웹 서비스로 실행하고 health check, 변경 경로 필터, Supabase 및 CORS 환경변수를 구성한다.', tags: ['configuration', 'deployment', 'render', 'api'], complexity: 'simple' },
], [
  E('config:.oxlintrc.json', 'config:package.json', 'configures', 0.6),
  E('document:CLAUDE.md', 'document:README.md', 'related', 0.5),
  E('document:README.md', 'config:package.json', 'documents', 0.5),
  E('document:README.md', 'config:render.yaml', 'documents', 0.5),
  E('config:render.yaml', 'config:package.json', 'depends_on', 0.6),
])

write(11, [
  { id: 'config:apps/web/.env.example', type: 'config', name: '.env.example', filePath: 'apps/web/.env.example', summary: '웹 클라이언트가 사용하는 TeamFlow Supabase URL·publishable key와 선택적 API 기본 URL의 환경변수 형식을 제공한다.', tags: ['configuration', 'environment', 'supabase', 'api-client'], complexity: 'simple' },
  { id: 'file:apps/web/index.html', type: 'file', name: 'index.html', filePath: 'apps/web/index.html', summary: '한국어 TeamFlow 웹 앱의 문서 메타데이터와 React 마운트 지점을 정의하고 Vite 진입점 src/main.jsx를 로드한다.', tags: ['entry-point', 'markup', 'vite', 'react'], complexity: 'simple', languageNotes: '단일 페이지 앱의 최소 HTML 셸이며 React가 #root에 마운트한다.' },
  { id: 'config:apps/web/package.json', type: 'config', name: 'package.json', filePath: 'apps/web/package.json', summary: 'React 19 웹 워크스페이스의 Vite 개발·빌드·미리보기와 Vitest 테스트 명령, Supabase·라우터·UI 의존성을 정의한다.', tags: ['configuration', 'react', 'vite', 'testing'], complexity: 'simple' },
  { id: 'config:apps/web/vercel.json', type: 'config', name: 'vercel.json', filePath: 'apps/web/vercel.json', summary: '모든 요청을 index.html로 재작성해 Vercel에서 React Router 클라이언트 라우팅을 지원한다.', tags: ['configuration', 'deployment', 'vercel', 'routing'], complexity: 'simple' },
], [
  E('config:apps/web/.env.example', 'file:apps/web/index.html', 'configures', 0.6),
  E('config:apps/web/package.json', 'file:apps/web/index.html', 'configures', 0.6),
  E('config:apps/web/vercel.json', 'file:apps/web/index.html', 'routes', 0.6),
])

for (const i of [7, 8, 9, 10, 11]) {
  const graph = JSON.parse(fs.readFileSync(path.join(ua, 'intermediate', `batch-${i}.json`), 'utf8'))
  const ids = new Set(graph.nodes.map((node) => node.id))
  if (ids.size !== graph.nodes.length || graph.nodes.length > 60 || graph.edges.length > 120) throw new Error(`batch ${i}: size or duplicate failure`)
  for (const node of graph.nodes) if (!node.id || !node.type || !node.name || !node.summary || !node.tags?.length || !node.complexity) throw new Error(`batch ${i}: invalid node`)
  const batch = batches.find((b) => b.batchIndex === i)
  const expected = Object.values(batch.batchImportData).flat().length
  const actual = graph.edges.filter((edge) => edge.type === 'imports').length
  if (expected !== actual) throw new Error(`batch ${i}: imports ${actual}/${expected}`)
  const covered = new Set(graph.nodes.map((node) => node.filePath).filter(Boolean))
  for (const file of batch.files) if (!covered.has(file.path)) throw new Error(`batch ${i}: missing ${file.path}`)
  console.log(`batch ${i}: ${graph.nodes.length} nodes, ${graph.edges.length} edges, imports ${actual}/${expected}`)
}
