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

function mapCommentToDb(c) {
  return {
    id: c.id,
    section_id: c.sectionId,
    author: c.author ?? null,
    is_ai: c.isAi ?? false,
    content: c.content,
    created_at: c.createdAt ?? null,
  }
}

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
  if (apiDoc.challengeId !== undefined) row.challenge_id = apiDoc.challengeId
  if (apiDoc.feedbackWanted !== undefined) row.feedback_wanted = apiDoc.feedbackWanted
  if (apiDoc.likes !== undefined) row.likes = apiDoc.likes
  if (apiDoc.bookmarks !== undefined) row.bookmarks = apiDoc.bookmarks
  if (apiDoc.sections !== undefined) row.sections = apiDoc.sections.map(mapSectionToDb)
  if (apiDoc.comments !== undefined) row.comments = apiDoc.comments.map(mapCommentToDb)
  return row
}

function toDateString(ts) {
  return ts ? new Date(ts).toISOString().slice(0, 10) : null
}

// 읽기용: DB 로우 → 프론트 목데이터와 동일한 camelCase 형태.
export function toApiDoc(row) {
  return {
    id: row.id,
    author: row.author_name ?? null,
    type: row.type,
    templateId: row.template_id,
    status: row.status,
    title: row.title,
    gameTag: row.game_tag,
    jobTag: row.job_tag,
    systemTag: row.system_tag,
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
