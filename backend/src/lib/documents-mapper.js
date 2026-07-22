// 프론트(camelCase) ↔ DB(snake_case) 변환의 단일 지점.
// 매핑표는 docs/data-model.md 기준. 프론트는 snake_case를 절대 보지 않는다.

function mapSectionToDb(section) {
  const row = { id: section.id, heading: section.heading, content: section.content }
  if (section.guideKey != null) row.guide_key = section.guideKey // 초안에만 존재
  return row
}

function mapSectionToApi(row) {
  const section = { id: row.id, heading: row.heading, content: row.content }
  if (row.guide_key != null) section.guideKey = row.guide_key
  return section
}

// 코멘트는 클라이언트가 통째로 쓰지 못한다(buildDbComment로 서버가 한 건씩 만든다).
// 그래서 comment의 → DB 방향 매퍼는 두지 않는다.
function mapCommentToApi(row) {
  return {
    id: row.id,
    sectionId: row.section_id,
    author: row.author ?? null,
    isAi: row.is_ai ?? false,
    content: row.content,
    createdAt: row.created_at ?? null,
  }
}

// 쓰기용: 클라이언트가 보낸 값 중 신뢰할 필드만 골라 snake_case 로우로.
// publishedAt·created_at·updated_at·author_id 는 클라이언트를 신뢰하지 않고 서버/트리거가 채운다.
// likes/bookmarks/comments 도 여기서 받지 않는다 — 카운트는 syncReactionCounts가,
// 코멘트는 comments/ai-feedback 엔드포인트가 서버에서 관리한다. 받아주면 문서를 수정해
// 재발행할 때 클라이언트가 보낸 빈 배열·0이 기존 코멘트와 좋아요를 덮어써 지워버린다.
export function toDbRow(apiDoc) {
  const row = {}
  if (apiDoc.author !== undefined) row.author_name = apiDoc.author
  if (apiDoc.type !== undefined) row.type = apiDoc.type
  if (apiDoc.templateId !== undefined) row.template_id = apiDoc.templateId
  if (apiDoc.status !== undefined) row.status = apiDoc.status
  if (apiDoc.title !== undefined) row.title = apiDoc.title
  if (apiDoc.gameTag !== undefined) row.game_tag = apiDoc.gameTag
  if (apiDoc.jobTag !== undefined) row.job_tag = apiDoc.jobTag
  if (apiDoc.systemTag !== undefined) row.system_tag = apiDoc.systemTag
  if (apiDoc.category !== undefined) row.category = apiDoc.category
  if (apiDoc.challengeId !== undefined) row.challenge_id = apiDoc.challengeId
  if (apiDoc.feedbackWanted !== undefined) row.feedback_wanted = apiDoc.feedbackWanted
  if (apiDoc.sections !== undefined) row.sections = apiDoc.sections.map(mapSectionToDb)
  return row
}

function toDateString(ts) {
  return ts ? new Date(ts).toISOString().slice(0, 10) : null
}

// 읽기용: DB 로우 → 프론트 목데이터와 동일한 camelCase 형태.
export function toApiDoc(row) {
  return {
    id: row.id,
    // 소유자 판별용 uuid(공개해도 무방한 불투명 id). 프론트가 "내 문서인지" 판단에 쓴다.
    authorId: row.author_id ?? null,
    author: row.author_name ?? null,
    // 비회원 문서인지 + 수정 비밀번호가 걸려 있는지 힌트(해시 자체는 절대 노출하지 않는다).
    hasEditPassword: Boolean(row.edit_password_hash),
    // AI가 미리 작성한 예시 문서인지(프론트 배지·필터용).
    isExample: Boolean(row.is_example),
    type: row.type,
    templateId: row.template_id,
    status: row.status,
    title: row.title,
    gameTag: row.game_tag,
    jobTag: row.job_tag,
    systemTag: row.system_tag,
    // 둘러보기 필터용 고정 분류(고르지 않았으면 null — "전체"에서만 보인다).
    category: row.category ?? null,
    challengeId: row.challenge_id ?? null,
    feedbackWanted: row.feedback_wanted,
    likes: row.likes,
    bookmarks: row.bookmarks,
    // ArchivePage 정렬·DocumentCard 렌더가 yyyy-mm-dd 문자열에 의존한다.
    publishedAt: toDateString(row.published_at),
    updatedAt: toDateString(row.updated_at),
    sections: (row.sections ?? []).map(mapSectionToApi),
    comments: (row.comments ?? []).map(mapCommentToApi),
  }
}

// 코멘트 한 건을 서버에서 생성(uuid·created_at 부여)해 DB 저장형으로.
export function buildDbComment(apiComment) {
  return {
    id: crypto.randomUUID(),
    section_id: apiComment.sectionId,
    author: apiComment.author ?? null,
    is_ai: apiComment.isAi ?? false,
    content: apiComment.content,
    created_at: new Date().toISOString(),
  }
}

export { mapCommentToApi }
