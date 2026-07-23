import { PROJECT_STATUS, RESOURCE_TYPE, TASK_STATUS } from '@teamflow/shared'

export const CURRENT_USER_ID = 'member-1'
export const AI_MEMBER_ID = 'member-ai'

export const initialProjects = [
  { id: '1', name: '팀플 관리 웹서비스 (TeamFlow)', description: '부트캠프 4주 개인 프로젝트 · 팀플 정보를 한 공간에서 관리', status: PROJECT_STATUS.IN_PROGRESS, iconKey: 'layers', startDate: '2026-07-01', endDate: '2026-07-31', memberIds: ['member-1', 'member-2', 'member-5', 'member-6', AI_MEMBER_ID], creatorId: CURRENT_USER_ID },
  { id: '2', name: '교내 창업 공모전 기획안', description: '플랫폼 비즈니스 아이디어 스케치와 팀원 역할 배분', status: PROJECT_STATUS.IN_PROGRESS, iconKey: 'megaphone', startDate: '2026-07-15', endDate: '2026-08-15', memberIds: ['member-1', 'member-2', 'member-3', AI_MEMBER_ID], creatorId: CURRENT_USER_ID },
  { id: '3', name: '캡스톤 디자인 (졸업작품)', description: 'AI 기반 개인화 일정 추천 시스템 개발', status: PROJECT_STATUS.IN_PROGRESS, iconKey: 'code', startDate: '2026-03-02', endDate: '2026-11-30', memberIds: ['member-1', 'member-5', 'member-6'], creatorId: CURRENT_USER_ID },
  { id: '4', name: '오픈소스 컨트리뷰톤 2024', description: '프론트엔드 오픈소스 이슈 해결 및 PR 제출', status: PROJECT_STATUS.NOT_STARTED, iconKey: 'rocket', startDate: '2026-08-01', endDate: '2026-08-31', memberIds: ['member-1'], creatorId: CURRENT_USER_ID },
]

export const initialMembers = [
  { id: CURRENT_USER_ID, authUserId: 'auth-user-1', email: 'user@example.com', kind: 'user', name: '이주환', initial: '이', role: '개발 / 프로젝트 관리', description: '전체 프론트엔드 개발 및 일정 관리 담당', isAi: false, color: '#3a6898' },
  { id: 'member-2', authUserId: 'auth-user-2', email: 'minji@example.com', kind: 'user', name: '김민지', initial: '김', role: '서비스 기획 / PM', description: '문제 정의, 요구사항 명세서 작성 및 전반적인 프로젝트 기획', isAi: false, color: '#8a4e68' },
  { id: 'member-3', authUserId: 'auth-user-3', email: 'seojun@example.com', kind: 'user', name: '박서준', initial: '박', role: '자료조사 / 마케팅', description: '시장 조사, 유사 서비스 분석 및 마케팅 전략 수립', isAi: false, color: '#2e7878' },
  { id: 'member-5', authUserId: 'auth-user-5', email: 'jiwoo@example.com', kind: 'user', name: '최지우', initial: '최', role: 'UI/UX 디자인', description: '디자인 시스템 구축, 와이어프레임 및 하이파이 프로토타입 제작', isAi: false, color: '#3d7a54' },
  { id: 'member-6', authUserId: 'auth-user-6', email: 'taeho@example.com', kind: 'user', name: '정태호', initial: '정', role: '백엔드 개발 / 인프라', description: 'API 서버 아키텍처 설계 및 클라우드 인프라(AWS) 구축', isAi: false, color: '#48688a' },
  { id: AI_MEMBER_ID, authUserId: null, email: '', kind: 'user', name: '자료조사 AI', initial: 'AI', role: '자료조사 · AI 팀원', description: '사람 팀원과 동일한 방식으로 역할을 배정받는 AI입니다. 공유 노트와 자료를 바탕으로 요약, 번역, 리서치 결과를 도출합니다.', isAi: true, color: '#6b4ca8' },
]

const task = (id, projectId, title, assigneeId, dueDate, status, description) => ({
  id, projectId, title, assigneeId, dueDate, status, ...(description ? { description } : {}),
})

export const initialTasks = [
  task('1', '1', '기획서 최종 정리', 'member-2', '2026-07-08', TASK_STATUS.COMPLETED, '요구사항 정의서 및 1차 기능 명세서 작성 완료'),
  task('2', '1', '초기 회의 일정 조율', CURRENT_USER_ID, '2026-07-06', TASK_STATUS.COMPLETED),
  task('3', '1', '대시보드 레이아웃 개발', CURRENT_USER_ID, '2026-07-16', TASK_STATUS.IN_PROGRESS, 'React와 CSS Modules를 활용한 메인 대시보드 컴포넌트 마크업'),
  task('4', '1', 'DB 테이블 스키마 설계', 'member-6', '2026-07-14', TASK_STATUS.IN_REVIEW, 'Supabase를 사용하기 위한 User, Task, Project 테이블 구조 초안'),
  task('5', '1', '유사 서비스 레퍼런스 분석', AI_MEMBER_ID, '2026-07-11', TASK_STATUS.COMPLETED, 'Notion, Linear, Trello 기능 비교 리포트 작성'),
  task('6', '1', '디자인 시스템 토큰 정리', 'member-5', '2026-07-13', TASK_STATUS.COMPLETED, 'Figma의 폰트, 색상, spacing 토큰 정리'),
  task('7', '1', '백엔드 REST API 명세서 작성', 'member-6', '2026-07-18', TASK_STATUS.IN_PROGRESS),
  task('8', '1', '로그인 화면 퍼블리싱', CURRENT_USER_ID, '2026-07-20', TASK_STATUS.NOT_STARTED),
  task('9', '1', '사용자 사용성 테스트(UT) 질문지 작성', 'member-2', '2026-07-22', TASK_STATUS.NOT_STARTED),
  task('10', '1', '일러스트 및 아이콘 에셋 추출', 'member-5', '2026-07-17', TASK_STATUS.IN_PROGRESS),
  task('11', '2', '공모전 요강 및 평가 기준 분석', 'member-2', '2026-07-16', TASK_STATUS.COMPLETED),
  task('12', '2', '1차 아이디어 브레인스토밍', CURRENT_USER_ID, '2026-07-17', TASK_STATUS.COMPLETED),
  task('13', '2', '시장 규모(TAM, SAM, SOM) 리서치', 'member-3', '2026-07-22', TASK_STATUS.IN_PROGRESS, '관련 논문 및 통계청 자료 기반'),
  task('14', '2', '피치덱(Pitch Deck) 스토리라인 구성', 'member-2', '2026-07-25', TASK_STATUS.IN_PROGRESS),
  task('15', '2', '솔루션 시연용 간단한 와이어프레임', CURRENT_USER_ID, '2026-07-28', TASK_STATUS.NOT_STARTED),
  task('16', '2', '최근 3년 창업 트렌드 및 기사 수집', AI_MEMBER_ID, '2026-07-20', TASK_STATUS.IN_REVIEW, 'SaaS 및 B2B 협업 툴 관련 기사 스크랩'),
  task('17', '2', '경쟁사 SWOT 분석', 'member-3', '2026-07-24', TASK_STATUS.NOT_STARTED),
  task('18', '3', '졸업작품 주제 선정 보고서 제출', CURRENT_USER_ID, '2026-03-15', TASK_STATUS.COMPLETED),
  task('19', '3', '지도교수님 1차 멘토링 미팅', CURRENT_USER_ID, '2026-03-20', TASK_STATUS.COMPLETED),
  task('20', '3', '전체 시스템 아키텍처 다이어그램', 'member-6', '2026-04-10', TASK_STATUS.COMPLETED),
  task('21', '3', '일정 추천 AI 모델 리서치', CURRENT_USER_ID, '2026-07-30', TASK_STATUS.IN_PROGRESS, 'Collaborative Filtering 및 간단한 NLP 모델 조사'),
  task('22', '3', '핵심 화면 Hi-Fi UI 디자인', 'member-5', '2026-07-25', TASK_STATUS.IN_REVIEW),
  task('23', '3', 'AWS EC2 및 RDS 초기 세팅', 'member-6', '2026-07-28', TASK_STATUS.IN_PROGRESS),
  task('24', '3', 'OAuth 2.0 소셜 로그인 구현', 'member-6', '2026-08-05', TASK_STATUS.NOT_STARTED),
  task('25', '4', '참여할 타겟 오픈소스 프로젝트 선정', CURRENT_USER_ID, '2026-08-05', TASK_STATUS.IN_PROGRESS, 'React 또는 Vue 관련 생태계 라이브러리 위주로 탐색'),
  task('26', '4', '컨트리뷰션 가이드라인(CONTRIBUTING.md) 숙지', CURRENT_USER_ID, '2026-08-07', TASK_STATUS.NOT_STARTED),
  task('27', '4', '로컬 환경 빌드 및 테스트 코드 실행', CURRENT_USER_ID, '2026-08-10', TASK_STATUS.NOT_STARTED),
]

export const initialNotes = [
  { id: 'note-1', projectId: '1', title: '팀플 관리 서비스 기획 아이디어 및 차별점', content: '# 핵심 기능 정리\n\n팀 프로젝트에서 가장 필요한 기능들:\n\n- **할 일 관리**: 상태별 태그와 담당자 지정\n- **팀원 역할**: 각 팀원의 역할과 업무 명확화\n- **자료 링크**: 흩어진 참고 자료를 한 곳에 모아보기\n\n## 기존 툴과의 차별점\n\n기존 Notion이나 Jira는 너무 범용적이거나 개발자 친화적임. 대학생/취준생이 가볍게 쓰기 좋은 **AI가 포함된 가상 팀룸** 컨셉으로 접근하자.\n\n## 다음 단계\n1. 핵심 화면 스케치\n2. 디자인 톤앤매너 결정\n3. 프레임워크 선정', updatedAt: '2026-07-10', authorId: 'member-2' },
  { id: 'note-2', projectId: '1', title: '자료 조사 링크 모음 (AI 요약본)', content: '# 참고 서비스 리서치\n\n## Linear\n- 압도적인 속도와 깔끔한 UI\n\n## Notion\n- 자유도가 높고 문서 작성에 탁월함\n\n## Trello\n- 칸반 보드의 직관성', updatedAt: '2026-07-11', authorId: AI_MEMBER_ID },
  { id: 'note-3', projectId: '1', title: '디자인 시스템 컬러 & 타이포그래피 규칙', content: '# Design System\n\n## Colors\n- Primary: #3860C9\n- Background: #F4F4F2\n\n## Typography\n- 기본 폰트: Pretendard\n- 숫자/코드: JetBrains Mono', updatedAt: '2026-07-13', authorId: 'member-5' },
  { id: 'note-4', projectId: '2', title: '공모전 피치덱 발표 준비 체크리스트', content: '## 발표 당일 준비물\n\n- 노트북 충전기\n- 발표자료 최종본 PDF\n- 시연용 데모 계정', updatedAt: '2026-07-09', authorId: CURRENT_USER_ID },
  { id: 'note-5', projectId: '3', title: '캡스톤 1차 지도교수 미팅 피드백', content: '## 피드백 내용 요약\n\n1. 추천 알고리즘의 기준 보완\n2. 모바일 웹 MVP 우선\n3. 9월 초 베타 버전 목표', updatedAt: '2026-03-21', authorId: CURRENT_USER_ID },
]

export const initialResources = [
  { id: 'resource-1', projectId: '1', name: '회의 자료 및 녹음본', ownerId: CURRENT_USER_ID, updatedAt: '2026-07-07', type: RESOURCE_TYPE.FOLDER, parentId: null },
  { id: 'resource-2', projectId: '1', name: 'PRD_요구사항정의서.md', description: '문제 정의와 핵심 기능, 유저 스토리 정리', ownerId: 'member-2', updatedAt: '2026-07-08', type: RESOURCE_TYPE.DOCUMENT, parentId: 'resource-1' },
  { id: 'resource-3', projectId: '1', name: 'Figma 와이어프레임 링크', description: '대시보드 및 할 일 관리 UI 스케치', ownerId: 'member-5', updatedAt: '2026-07-12', type: RESOURCE_TYPE.LINK, parentId: null },
  { id: 'resource-4', projectId: '1', name: 'DB_Schema_v1.pdf', description: '유저 및 프로젝트 릴레이션 다이어그램', ownerId: 'member-6', updatedAt: '2026-07-14', type: RESOURCE_TYPE.DOCUMENT, parentId: null },
  { id: 'resource-5', projectId: '1', name: '경쟁사_분석_리포트.docx', description: '유사 서비스 장단점 비교 리포트', ownerId: AI_MEMBER_ID, updatedAt: '2026-07-11', type: RESOURCE_TYPE.DOCUMENT, parentId: null },
  { id: 'resource-6', projectId: '1', name: 'TeamFlow_Logo_Final.png', description: '앱 서비스 메인 로고 에셋', ownerId: 'member-5', updatedAt: '2026-07-13', type: RESOURCE_TYPE.IMAGE, parentId: null },
  { id: 'resource-7', projectId: '1', name: 'API Docs (Swagger)', description: '백엔드 API 명세 접속 링크', ownerId: 'member-6', updatedAt: '2026-07-16', type: RESOURCE_TYPE.LINK, parentId: null },
  { id: 'resource-8', projectId: '2', name: 'Notion 팀 프로젝트 템플릿', description: '기존 템플릿 레퍼런스', ownerId: 'member-2', updatedAt: '2026-07-07', type: RESOURCE_TYPE.LINK, parentId: null },
  { id: 'resource-9', projectId: '2', name: '시장조사 통계 자료 모음', ownerId: 'member-3', updatedAt: '2026-07-20', type: RESOURCE_TYPE.FOLDER, parentId: null },
  { id: 'resource-10', projectId: '3', name: 'AWS 인프라 다이어그램.png', ownerId: 'member-6', updatedAt: '2026-04-10', type: RESOURCE_TYPE.IMAGE, parentId: null },
]

export const initialAiSettings = {
  '1': {
    instructions: '너는 팀플 관리 웹서비스 프로젝트의 자료조사 담당 AI 팀원이야.\n\n역할: 팀원이 요청하는 자료를 조사하고 정리해서 공유 노트에 기록해줘.\n\n작업 원칙:\n- 항상 출처를 명시할 것\n- 3개 이상의 참고 자료를 비교해서 정리할 것\n- 결과물은 마크다운 형식으로 작성할 것\n- 팀원 검토 전에는 자동으로 반영하지 않을 것',
    context: { project: true, notes: true, resources: true, tasks: true, team: false },
  },
}

export const aiHistory = [
  { id: 'history-1', title: '유사 서비스 레퍼런스 조사', result: 'Notion, Linear, Trello 비교 분석 완료. 공유 노트에 정리함.', date: '2026-07-11', status: 'applied' },
  { id: 'history-2', title: '대학생 팀플 페인포인트 조사', result: '설문 결과 5개 패턴 도출. 검토 요청 중.', date: '2026-07-10', status: 'pending_review' },
  { id: 'history-3', title: '경쟁사 기능 비교표 작성', result: '초안 제출했으나 기준이 부적합하여 재작업 예정.', date: '2026-07-08', status: 'rejected' },
]
