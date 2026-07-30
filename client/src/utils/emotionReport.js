function shortDate(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

export function buildEmotionReport(checkins) {
  const sorted = [...checkins].sort((left, right) => (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  ))
  const organized = sorted.filter(({ emotion, cause, action }) => emotion || cause || action)
  const moodCounts = new Map()

  for (const { mood } of sorted) {
    if (mood) {
      moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1)
    }
  }

  const moods = [...moodCounts.entries()]
    .map(([mood, count]) => ({ mood, count }))
    .sort((left, right) => right.count - left.count)
  const actions = [...new Set(organized.map(({ action }) => action).filter(Boolean))].slice(0, 5)
  const recent = organized.slice(0, 3)
  const dateRange = sorted.length
    ? `${shortDate(sorted.at(-1).createdAt)} ~ ${shortDate(sorted[0].createdAt)}`
    : ''
  const moodText = moods.length
    ? moods.map(({ mood, count }) => `${mood} ${count}회`).join(', ')
    : '선택한 기분 없음'
  const recentText = recent.length
    ? recent.map(({ createdAt, emotion, cause }) => (
      `- ${shortDate(createdAt)}: ${emotion || '감정 미정리'}${cause ? ` / ${cause}` : ''}`
    )).join('\n')
    : '- AI로 정리된 기록 없음'
  const actionText = actions.length
    ? actions.map((action) => `- ${action}`).join('\n')
    : '- 저장된 작은 행동 없음'

  return {
    total: sorted.length,
    organizedCount: organized.length,
    dateRange,
    moods,
    recent,
    actions,
    copyText: [
      '나의 감정 리포트',
      dateRange ? `기록 기간: ${dateRange}` : '기록 기간: 기록 없음',
      `전체 기록: ${sorted.length}개`,
      `AI 정리 기록: ${organized.length}개`,
      `기분 분포: ${moodText}`,
      '',
      '최근 정리된 감정과 원인',
      recentText,
      '',
      '작은 행동 모아보기',
      actionText,
    ].join('\n'),
  }
}

export { shortDate }
