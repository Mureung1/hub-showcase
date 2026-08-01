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
  const timeline = sorted.slice(0, 7).reverse()
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
  const overviewText = sorted.length
    ? [
      `${dateRange} 동안 ${sorted.length}개의 기록을 남겼어요.`,
      moods[0] ? `가장 자주 선택한 기분은 ${moods[0].mood} ${moods[0].count}회였어요.` : '',
      recent[0]?.emotion ? `최근 정리된 감정은 ${recent[0].emotion}이에요.` : '',
      actions[0] ? `최근 작은 행동은 “${actions[0]}”이에요.` : '',
    ].filter(Boolean).join(' ')
    : ''

  return {
    total: sorted.length,
    organizedCount: organized.length,
    dateRange,
    moods,
    recent,
    actions,
    timeline,
    overviewText,
    copyText: [
      '나의 감정 리포트',
      overviewText,
      '',
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
