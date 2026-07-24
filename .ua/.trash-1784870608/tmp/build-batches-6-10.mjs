import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const uaDir = path.join(root, '.ua')
const batches = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'batches.json'), 'utf8')).batches

const edge = (source, target, type, weight) => ({ source, target, type, direction: 'forward', weight })
const fileId = (filePath) => `file:${filePath}`
const functionId = (filePath, name) => `function:${filePath}:${name}`
const migrationId = (filePath) => `table:${filePath}:migration`
const tableId = (filePath, name) => `table:${filePath}:${name}`

const writeBatch = (batchIndex, graph) => {
  const target = path.join(uaDir, 'intermediate', `batch-${batchIndex}.json`)
  fs.writeFileSync(target, `${JSON.stringify(graph, null, 2)}\n`)
}

const batch6 = batches.find((batch) => batch.batchIndex === 6)
const batch6Meta = {
  'apps/web/src/features/projects/ProjectListPage.jsx': {
    summary: '로그인 상태의 프로젝트 요약과 받은 초대를 조회하고, 검색·초대 응답·프로젝트 이동·설정 및 아이콘 변경 모달을 조율하는 프로젝트 목록 화면이다.',
    tags: ['component', 'project-overview', 'invitation', 'search'],
    complexity: 'moderate',
  },
  'apps/web/src/features/projects/ProjectListPage.test.jsx': {
    summary: '프로젝트 목록의 라우팅, 검색과 빈 상태, 생성 후 이동, 진행률 경계 처리, 아이콘 변경 흐름을 사용자 관점에서 검증한다.',
    tags: ['test', 'integration-test', 'project-overview', 'accessibility'],
    complexity: 'moderate',
  },
  'apps/web/src/features/projects/components/ProjectCard.jsx': {
    summary: '프로젝트 상태·진행률·기간·멤버·아이콘을 접근 가능한 카드로 표시하고 열기, 아이콘 변경, 설정 동작을 노출한다.',
    tags: ['component', 'project-summary', 'accessibility', 'progress'],
    complexity: 'moderate',
  },
  'apps/web/src/features/projects/components/ProjectIcon.jsx': {
    summary: '공유 프로젝트 아이콘 키를 Lucide 아이콘 컴포넌트로 변환하며, 알 수 없는 값은 기본 레이어 아이콘으로 대체한다.',
    tags: ['component', 'icon', 'presentation', 'fallback'],
    complexity: 'simple',
  },
  'apps/web/src/features/projects/components/ProjectIconPicker.jsx': {
    summary: '프로젝트 아이콘 후보를 모달에 표시하고 선택 결과를 TeamFlow 상태 액션으로 저장하며 진행 및 오류 상태를 관리한다.',
    tags: ['component', 'modal', 'project-settings', 'event-handler'],
    complexity: 'simple',
  },
  'apps/web/src/features/projects/components/projectIconOptions.js': {
    summary: '프로젝트 아이콘 선택지와 아이콘 키의 한국어 표시 이름을 제공하는 프레젠테이션 유틸리티다.',
    tags: ['utility', 'configuration', 'icon', 'localization'],
    complexity: 'simple',
  },
}

const batch6Functions = [
  {
    filePath: 'apps/web/src/features/projects/ProjectListPage.jsx',
    name: 'ProjectListPage',
    lineRange: [15, 117],
    summary: '프로젝트와 초대를 상태에서 파생해 렌더링하고, 검색·초대 응답·페이지 이동·편집 모달의 사용자 상호작용을 연결한다.',
    tags: ['component', 'page', 'state-management', 'event-handler'],
    complexity: 'moderate',
  },
  {
    filePath: 'apps/web/src/features/projects/components/ProjectCard.jsx',
    name: 'ProjectCard',
    lineRange: [25, 99],
    summary: '프로젝트 요약 데이터를 시각화하고 진행률을 경계값으로 정규화하며 선택 가능한 카드 동작을 제공한다.',
    tags: ['component', 'project-summary', 'accessibility', 'validation'],
    complexity: 'moderate',
  },
  {
    filePath: 'apps/web/src/features/projects/components/ProjectIcon.jsx',
    name: 'ProjectIcon',
    lineRange: [18, 21],
    summary: '프로젝트 아이콘 키에 해당하는 Lucide 아이콘을 선택해 장식용 SVG로 렌더링한다.',
    tags: ['component', 'icon', 'presentation'],
    complexity: 'simple',
  },
  {
    filePath: 'apps/web/src/features/projects/components/ProjectIconPicker.jsx',
    name: 'ProjectIconPicker',
    lineRange: [10, 52],
    summary: '아이콘 선택 UI와 비동기 저장 상태를 관리하고 성공 시 선택 모달을 닫는다.',
    tags: ['component', 'modal', 'state-management', 'event-handler'],
    complexity: 'simple',
  },
  {
    filePath: 'apps/web/src/features/projects/components/projectIconOptions.js',
    name: 'getProjectIconLabel',
    lineRange: [12, 14],
    summary: '아이콘 키의 한국어 레이블을 찾고 등록되지 않은 키에는 기본 레이어 레이블을 반환한다.',
    tags: ['utility', 'lookup', 'localization'],
    complexity: 'simple',
  },
]

const batch6Nodes = batch6.files.map(({ path: filePath }) => ({
  id: fileId(filePath),
  type: 'file',
  name: path.basename(filePath),
  filePath,
  ...batch6Meta[filePath],
}))
for (const item of batch6Functions) {
  batch6Nodes.push({
    id: functionId(item.filePath, item.name),
    type: 'function',
    name: item.name,
    filePath: item.filePath,
    lineRange: item.lineRange,
    summary: item.summary,
    tags: item.tags,
    complexity: item.complexity,
  })
}

const batch6Edges = []
for (const [sourcePath, targets] of Object.entries(batch6.batchImportData)) {
  for (const targetPath of targets) batch6Edges.push(edge(fileId(sourcePath), fileId(targetPath), 'imports', 0.7))
}
for (const item of batch6Functions) {
  batch6Edges.push(edge(fileId(item.filePath), functionId(item.filePath, item.name), 'contains', 1))
  batch6Edges.push(edge(fileId(item.filePath), functionId(item.filePath, item.name), 'exports', 0.8))
}
const listFn = functionId('apps/web/src/features/projects/ProjectListPage.jsx', 'ProjectListPage')
const cardFn = functionId('apps/web/src/features/projects/components/ProjectCard.jsx', 'ProjectCard')
const iconFn = functionId('apps/web/src/features/projects/components/ProjectIcon.jsx', 'ProjectIcon')
const pickerFn = functionId('apps/web/src/features/projects/components/ProjectIconPicker.jsx', 'ProjectIconPicker')
const labelFn = functionId('apps/web/src/features/projects/components/projectIconOptions.js', 'getProjectIconLabel')
batch6Edges.push(
  edge(listFn, cardFn, 'calls', 0.8),
  edge(listFn, pickerFn, 'calls', 0.8),
  edge(listFn, functionId('apps/web/src/features/projects/components/ProjectSettingsModal.jsx', 'ProjectSettingsModal'), 'calls', 0.8),
  edge(listFn, functionId('apps/web/src/state/selectors.js', 'selectProjectSummaries'), 'calls', 0.8),
  edge(listFn, functionId('apps/web/src/state/selectors.js', 'selectReceivedInvitations'), 'calls', 0.8),
  edge(listFn, functionId('apps/web/src/state/useTeamFlow.js', 'useTeamFlow'), 'calls', 0.8),
  edge(cardFn, iconFn, 'calls', 0.8),
  edge(cardFn, labelFn, 'calls', 0.8),
  edge(cardFn, functionId('apps/web/src/lib/format.js', 'formatPeriod'), 'calls', 0.8),
  edge(pickerFn, iconFn, 'calls', 0.8),
  edge(pickerFn, functionId('apps/web/src/components/ui/Modal.jsx', 'Modal'), 'calls', 0.8),
  edge(pickerFn, functionId('apps/web/src/state/useTeamFlow.js', 'useTeamFlow'), 'calls', 0.8),
  edge(fileId('apps/web/src/features/projects/ProjectListPage.jsx'), fileId('apps/web/src/features/projects/ProjectListPage.test.jsx'), 'tested_by', 0.5),
  edge(fileId('apps/web/src/features/projects/components/ProjectCard.jsx'), fileId('apps/web/src/features/projects/ProjectListPage.test.jsx'), 'tested_by', 0.5),
)
writeBatch(6, { nodes: batch6Nodes, edges: batch6Edges })

writeBatch(7, {
  nodes: [
    {
      id: 'pipeline:.github/workflows/auto-merge.yml',
      type: 'pipeline',
      name: 'auto-merge.yml',
      filePath: '.github/workflows/auto-merge.yml',
      summary: '매일 예약 실행 또는 수동 실행으로 열린 PR을 조회하고, 대상 브랜치·review 라벨·변경 요청·충돌 규칙의 우선순위에 따라 코멘트, 연기, 종료 또는 병합을 수행한다.',
      tags: ['ci-cd', 'github-actions', 'pull-request', 'automation'],
      complexity: 'moderate',
      languageNotes: 'YAML 단계 안의 github-script가 GraphQL 조회와 REST 변경 작업을 함께 수행한다.',
    },
  ],
  edges: [],
})

const sqlFiles = {
  'supabase/migrations/20260720030115_create_tasks.sql': {
    summary: '프로젝트별 할 일과 담당자, 마감일, 상태를 저장하는 tasks 테이블을 만들고 생성 시각 인덱스, RLS, service_role 권한을 설정한다.',
    tags: ['database', 'migration', 'tasks', 'security'],
    complexity: 'simple',
  },
  'supabase/migrations/20260721054012_google_auth_workspace.sql': {
    summary: 'Google 인증 사용자용 멤버·프로젝트·소속·게스트 데모 스키마를 만들고 tasks를 연결하며, RLS 정책과 프로젝트 생성 RPC를 구성한다.',
    tags: ['database', 'migration', 'authentication', 'rls', 'rpc'],
    complexity: 'complex',
  },
  'supabase/migrations/20260722112108_collaboration_and_content_crud.sql': {
    summary: '프로젝트 단위 멤버와 접근 권한으로 모델을 개편하고 초대·노트·자료 CRUD 테이블, 트리거, RLS 정책, 보안 RPC를 도입한다.',
    tags: ['database', 'migration', 'collaboration', 'content', 'rls'],
    complexity: 'complex',
  },
  'supabase/migrations/20260722114219_collaboration_and_content_hardening.sql': {
    summary: '협업 및 콘텐츠 테이블의 외래 키와 검사 제약, 초대 조회 정책, 자료 부모 검증, 프로젝트·멤버 RPC 권한을 강화한다.',
    tags: ['database', 'migration', 'security', 'hardening', 'rls'],
    complexity: 'complex',
  },
  'supabase/migrations/20260722115346_private_rpc_wrappers_and_fk_indexes.sql': {
    summary: '권한 있는 RPC 구현을 private 스키마로 이동하고 public에는 인증 전용 래퍼를 유지하며 복합 외래 키 조회용 인덱스를 추가한다.',
    tags: ['database', 'migration', 'rpc', 'security', 'indexing'],
    complexity: 'moderate',
  },
  'supabase/migrations/20260722154845_add_project_icon_key.sql': {
    summary: 'projects에 허용된 아이콘 키만 저장하는 icon_key 열과 검사 제약을 추가하고 인증 사용자의 열 단위 갱신을 허용한다.',
    tags: ['database', 'migration', 'project-settings', 'validation'],
    complexity: 'simple',
  },
  'supabase/migrations/20260722155721_backfill_demo_project_icons.sql': {
    summary: '게스트 데모 워크스페이스의 프로젝트별 아이콘 키를 결정적으로 채워 데모 화면의 아이콘 구성을 갱신한다.',
    tags: ['database', 'migration', 'demo-data', 'backfill'],
    complexity: 'simple',
  },
  'supabase/migrations/20260723093000_private_resource_uploads.sql': {
    summary: '비공개 TeamFlow Storage 버킷과 자료 파일 메타데이터를 추가하고 프로젝트 경로 기반 업로드·조회·삭제 RLS 정책을 구성한다.',
    tags: ['database', 'migration', 'storage', 'security', 'upload'],
    complexity: 'moderate',
  },
  'supabase/migrations/20260723094500_harden_private_resource_uploads.sql': {
    summary: '업로드 의도 생성과 완료 RPC, 상태 전이 제약, Storage 객체 정책을 도입해 브라우저의 비공개 파일 업로드 수명주기를 강화한다.',
    tags: ['database', 'migration', 'storage', 'rpc', 'hardening'],
    complexity: 'complex',
  },
  'supabase/migrations/20260723185956_remove_manual_assignees.sql': {
    summary: '로그인하지 않은 수동 담당자 생성을 제거하고 작업 담당자를 실제 프로젝트 협업자로 제한하며 멤버 수정·삭제 RPC를 재정의한다.',
    tags: ['database', 'migration', 'collaboration', 'authorization', 'rpc'],
    complexity: 'moderate',
  },
  'supabase/migrations/20260724090000_mock_ai_team_member.sql': {
    summary: '프로젝트 AI 팀원과 실행 기록 스키마, RLS, 설정·실행·적용·거절 RPC를 추가하고 인증 및 데모 응답을 동일한 AI 계약으로 맞춘다.',
    tags: ['database', 'migration', 'ai-agent', 'rpc', 'rls'],
    complexity: 'complex',
  },
  'supabase/migrations/20260724093000_mock_ai_fk_indexes.sql': {
    summary: 'Supabase 성능 권고에 따라 AI 실행의 에이전트·작업·노트 복합 외래 키를 지원하는 인덱스를 보강한다.',
    tags: ['database', 'migration', 'indexing', 'performance'],
    complexity: 'simple',
  },
  'supabase/migrations/20260724094500_fix_demo_ai_markdown.sql': {
    summary: '초기 데모 AI 결과에 문자열로 저장된 줄바꿈 표기를 실제 개행으로 변환해 Markdown 렌더링을 바로잡는다.',
    tags: ['database', 'migration', 'demo-data', 'markdown'],
    complexity: 'simple',
  },
}

const sqlTables = [
  {
    filePath: 'supabase/migrations/20260720030115_create_tasks.sql',
    name: 'tasks',
    summary: '프로젝트별 작업 제목, 담당자, 마감일, 상태, 설명과 생성 시각을 저장한다.',
    tags: ['database', 'table', 'tasks', 'project-data'],
  },
  {
    filePath: 'supabase/migrations/20260721054012_google_auth_workspace.sql',
    name: 'members',
    summary: '워크스페이스 소유자와 인증 사용자에 연결된 사람 및 AI 멤버 프로필을 저장한다.',
    tags: ['database', 'table', 'members', 'authentication'],
  },
  {
    filePath: 'supabase/migrations/20260721054012_google_auth_workspace.sql',
    name: 'projects',
    summary: '소유자별 프로젝트의 이름, 설명, 상태, 기간과 감사 시각을 저장한다.',
    tags: ['database', 'table', 'projects', 'workspace'],
  },
  {
    filePath: 'supabase/migrations/20260721054012_google_auth_workspace.sql',
    name: 'project_members',
    summary: '프로젝트와 워크스페이스 멤버 사이의 소속 관계를 저장한다.',
    tags: ['database', 'table', 'membership', 'relation'],
  },
  {
    filePath: 'supabase/migrations/20260721054012_google_auth_workspace.sql',
    name: 'demo_workspaces',
    summary: '게스트가 읽을 수 있는 활성 데모 워크스페이스의 JSON 페이로드를 저장한다.',
    tags: ['database', 'table', 'demo-data', 'json'],
  },
  {
    filePath: 'supabase/migrations/20260722112108_collaboration_and_content_crud.sql',
    name: 'members',
    summary: '프로젝트 범위의 협업자와 AI 멤버 프로필, 인증 사용자 연결 정보를 저장하는 최신 멤버 모델이다.',
    tags: ['database', 'table', 'members', 'collaboration'],
  },
  {
    filePath: 'supabase/migrations/20260722112108_collaboration_and_content_crud.sql',
    name: 'project_access',
    summary: '인증 사용자와 프로젝트 멤버를 묶어 프로젝트 접근 권한의 근거를 제공한다.',
    tags: ['database', 'table', 'authorization', 'membership'],
  },
  {
    filePath: 'supabase/migrations/20260722112108_collaboration_and_content_crud.sql',
    name: 'project_invitations',
    summary: '프로젝트 초대 대상 이메일, 초대자, 상태와 응답 시각을 저장한다.',
    tags: ['database', 'table', 'invitation', 'collaboration'],
  },
  {
    filePath: 'supabase/migrations/20260722112108_collaboration_and_content_crud.sql',
    name: 'notes',
    summary: '프로젝트 공유 노트의 제목, 본문, 작성자와 수정 시각을 저장한다.',
    tags: ['database', 'table', 'notes', 'content'],
  },
  {
    filePath: 'supabase/migrations/20260722112108_collaboration_and_content_crud.sql',
    name: 'resources',
    summary: '프로젝트 자료의 계층, 유형, 링크 또는 파일 메타데이터와 소유자를 저장한다.',
    tags: ['database', 'table', 'resources', 'content'],
  },
  {
    filePath: 'supabase/migrations/20260724090000_mock_ai_team_member.sql',
    name: 'ai_agents',
    summary: 'AI 멤버별 지침, 컨텍스트 설정, 활성 상태를 프로젝트 범위에서 관리한다.',
    tags: ['database', 'table', 'ai-agent', 'configuration'],
  },
  {
    filePath: 'supabase/migrations/20260724090000_mock_ai_team_member.sql',
    name: 'ai_runs',
    summary: 'AI 작업 실행의 입력 스냅샷, 결과 Markdown, 오류, 적용 노트와 상태 전이를 기록한다.',
    tags: ['database', 'table', 'ai-run', 'audit'],
  },
]

const batch8Nodes = Object.entries(sqlFiles).map(([filePath, meta]) => ({
  id: migrationId(filePath),
  type: 'table',
  name: path.basename(filePath),
  filePath,
  ...meta,
  languageNotes: meta.complexity === 'complex' ? 'PostgreSQL 함수, RLS 정책, 권한 부여를 함께 변경하는 순차 마이그레이션이다.' : undefined,
}))
for (const table of sqlTables) {
  batch8Nodes.push({
    id: tableId(table.filePath, table.name),
    type: 'table',
    name: table.name,
    filePath: table.filePath,
    summary: table.summary,
    tags: table.tags,
    complexity: 'moderate',
  })
}

const p = {
  tasks: 'supabase/migrations/20260720030115_create_tasks.sql',
  auth: 'supabase/migrations/20260721054012_google_auth_workspace.sql',
  collab: 'supabase/migrations/20260722112108_collaboration_and_content_crud.sql',
  harden: 'supabase/migrations/20260722114219_collaboration_and_content_hardening.sql',
  wrappers: 'supabase/migrations/20260722115346_private_rpc_wrappers_and_fk_indexes.sql',
  icon: 'supabase/migrations/20260722154845_add_project_icon_key.sql',
  demoIcons: 'supabase/migrations/20260722155721_backfill_demo_project_icons.sql',
  uploads: 'supabase/migrations/20260723093000_private_resource_uploads.sql',
  uploadHarden: 'supabase/migrations/20260723094500_harden_private_resource_uploads.sql',
  assignees: 'supabase/migrations/20260723185956_remove_manual_assignees.sql',
  ai: 'supabase/migrations/20260724090000_mock_ai_team_member.sql',
  aiIndexes: 'supabase/migrations/20260724093000_mock_ai_fk_indexes.sql',
  markdown: 'supabase/migrations/20260724094500_fix_demo_ai_markdown.sql',
}
const t = {
  tasks: tableId(p.tasks, 'tasks'),
  authMembers: tableId(p.auth, 'members'),
  projects: tableId(p.auth, 'projects'),
  projectMembers: tableId(p.auth, 'project_members'),
  demo: tableId(p.auth, 'demo_workspaces'),
  members: tableId(p.collab, 'members'),
  access: tableId(p.collab, 'project_access'),
  invitations: tableId(p.collab, 'project_invitations'),
  notes: tableId(p.collab, 'notes'),
  resources: tableId(p.collab, 'resources'),
  agents: tableId(p.ai, 'ai_agents'),
  runs: tableId(p.ai, 'ai_runs'),
}
const migratedTables = new Map([
  [p.tasks, [t.tasks]],
  [p.auth, [t.authMembers, t.projects, t.projectMembers, t.demo, t.tasks]],
  [p.collab, [t.members, t.access, t.invitations, t.notes, t.resources, t.tasks, t.projects]],
  [p.harden, [t.members, t.access, t.invitations, t.notes, t.resources, t.tasks]],
  [p.wrappers, [t.access, t.invitations, t.notes, t.resources, t.members, t.projects]],
  [p.icon, [t.projects]],
  [p.demoIcons, [t.demo]],
  [p.uploads, [t.resources]],
  [p.uploadHarden, [t.resources]],
  [p.assignees, [t.tasks, t.members, t.access]],
  [p.ai, [t.members, t.tasks, t.notes, t.agents, t.runs, t.demo]],
  [p.aiIndexes, [t.runs]],
  [p.markdown, [t.demo]],
])
const batch8Edges = []
for (const [filePath, targets] of migratedTables) {
  for (const target of targets) batch8Edges.push(edge(migrationId(filePath), target, 'migrates', 0.7))
}
writeBatch(8, { nodes: batch8Nodes, edges: batch8Edges })

writeBatch(9, {
  nodes: [
    {
      id: 'config:.oxlintrc.json',
      type: 'config',
      name: '.oxlintrc.json',
      filePath: '.oxlintrc.json',
      summary: 'React Hooks 규칙을 오류로, 컴포넌트 전용 내보내기 규칙을 경고로 검사하도록 oxlint를 설정한다.',
      tags: ['configuration', 'linting', 'react', 'code-quality'],
      complexity: 'simple',
    },
    {
      id: 'document:CLAUDE.md',
      type: 'document',
      name: 'CLAUDE.md',
      filePath: 'CLAUDE.md',
      summary: 'TeamFlow의 제품 목적, 기술 스택, 개발 명령, 코드·커밋·디자인 규칙과 금지 사항을 에이전트 작업 지침으로 정리한다.',
      tags: ['documentation', 'development', 'conventions', 'agent-guidance'],
      complexity: 'simple',
    },
    {
      id: 'document:README.md',
      type: 'document',
      name: 'README.md',
      filePath: 'README.md',
      summary: 'TeamFlow의 구현 상태와 전체 아키텍처, Supabase·Google OAuth 설정, 로컬 실행, 검증, Vercel·Render 배포 흐름을 안내한다.',
      tags: ['documentation', 'entry-point', 'architecture', 'onboarding'],
      complexity: 'moderate',
    },
    {
      id: 'config:package.json',
      type: 'config',
      name: 'package.json',
      filePath: 'package.json',
      summary: 'Node 24와 npm 11 기반 모노레포 워크스페이스, 웹·API 개발 명령, 빌드·린트·테스트 실행 경로를 정의한다.',
      tags: ['configuration', 'monorepo', 'build-system', 'scripts'],
      complexity: 'simple',
    },
    {
      id: 'config:render.yaml',
      type: 'config',
      name: 'render.yaml',
      filePath: 'render.yaml',
      summary: 'Express API를 Render 무료 Node 웹 서비스로 빌드·실행하고 health check, 변경 경로 필터, Supabase 및 CORS 환경변수를 구성한다.',
      tags: ['configuration', 'deployment', 'render', 'api'],
      complexity: 'simple',
    },
  ],
  edges: [
    edge('config:.oxlintrc.json', 'config:package.json', 'configures', 0.6),
    edge('document:CLAUDE.md', 'document:README.md', 'related', 0.5),
    edge('document:README.md', 'config:package.json', 'documents', 0.5),
    edge('document:README.md', 'config:render.yaml', 'documents', 0.5),
    edge('config:render.yaml', 'config:package.json', 'depends_on', 0.6),
  ],
})

writeBatch(10, {
  nodes: [
    {
      id: 'config:apps/web/.env.example',
      type: 'config',
      name: '.env.example',
      filePath: 'apps/web/.env.example',
      summary: '웹 클라이언트가 사용하는 TeamFlow Supabase URL·publishable key와 선택적 API 기본 URL의 환경변수 형식을 제공한다.',
      tags: ['configuration', 'environment', 'supabase', 'api-client'],
      complexity: 'simple',
    },
    {
      id: 'file:apps/web/index.html',
      type: 'file',
      name: 'index.html',
      filePath: 'apps/web/index.html',
      summary: '한국어 TeamFlow 웹 앱의 문서 메타데이터와 React 마운트 지점을 정의하고 Vite 진입점인 src/main.jsx를 로드한다.',
      tags: ['entry-point', 'markup', 'vite', 'react'],
      complexity: 'simple',
      languageNotes: '단일 페이지 앱의 최소 HTML 셸이며 실제 화면은 React가 #root에 마운트한다.',
    },
    {
      id: 'config:apps/web/package.json',
      type: 'config',
      name: 'package.json',
      filePath: 'apps/web/package.json',
      summary: 'React 19 웹 워크스페이스의 Vite 개발·빌드·미리보기와 Vitest 테스트 명령, Supabase·라우터·UI 의존성을 정의한다.',
      tags: ['configuration', 'react', 'vite', 'testing'],
      complexity: 'simple',
    },
    {
      id: 'config:apps/web/vercel.json',
      type: 'config',
      name: 'vercel.json',
      filePath: 'apps/web/vercel.json',
      summary: '모든 요청을 index.html로 재작성해 Vercel에서 React Router의 클라이언트 라우팅을 지원한다.',
      tags: ['configuration', 'deployment', 'vercel', 'routing'],
      complexity: 'simple',
    },
  ],
  edges: [
    edge('config:apps/web/.env.example', 'file:apps/web/index.html', 'configures', 0.6),
    edge('config:apps/web/package.json', 'file:apps/web/index.html', 'configures', 0.6),
    edge('config:apps/web/vercel.json', 'file:apps/web/index.html', 'routes', 0.6),
  ],
})

for (const batchIndex of [6, 7, 8, 9, 10]) {
  const target = path.join(uaDir, 'intermediate', `batch-${batchIndex}.json`)
  const parsed = JSON.parse(fs.readFileSync(target, 'utf8'))
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error(`batch ${batchIndex}: malformed graph`)
  const ids = new Set(parsed.nodes.map((node) => node.id))
  if (ids.size !== parsed.nodes.length) throw new Error(`batch ${batchIndex}: duplicate node id`)
  for (const node of parsed.nodes) {
    if (!node.id || !node.type || !node.name || !node.summary || !node.tags?.length || !node.complexity) {
      throw new Error(`batch ${batchIndex}: invalid node ${node.id}`)
    }
  }
  for (const item of parsed.edges) {
    if (item.source === item.target) throw new Error(`batch ${batchIndex}: self edge ${item.source}`)
    if (!item.source || !item.target || !item.type || item.direction !== 'forward' || typeof item.weight !== 'number') {
      throw new Error(`batch ${batchIndex}: invalid edge`)
    }
  }
  const batch = batches.find((item) => item.batchIndex === batchIndex)
  const expectedImports = Object.values(batch.batchImportData).reduce((total, imports) => total + imports.length, 0)
  const actualImports = parsed.edges.filter((item) => item.type === 'imports').length
  if (expectedImports !== actualImports) throw new Error(`batch ${batchIndex}: imports ${actualImports}/${expectedImports}`)
  if (parsed.nodes.length > 60 || parsed.edges.length > 120) throw new Error(`batch ${batchIndex}: requires multipart output`)
  console.log(`batch ${batchIndex}: ${parsed.nodes.length} nodes, ${parsed.edges.length} edges, imports ${actualImports}/${expectedImports}`)
}
