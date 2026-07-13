// 챌린지 시드. 스키마는 기획서 §5의 challenges 테이블과 대응한다.
// MVP에서 챌린지 생성·마감은 운영자 수동 처리(기획서 §3.3).

export const challenges = [
  {
    id: 'ch-2',
    status: 'ongoing',
    title: '메이플스토리 스타포스 강화 시스템을 역기획하라',
    description:
      '이번 시즌 주제는 스타포스입니다. 성공/실패/파괴의 3분기 구조, 구간별 확률과 비용, 파괴 방지 옵션까지 — 규칙을 수치로 정리하고 설계 의도를 추론해 보세요. 마감 전까지 다른 참가자의 제출작은 비공개입니다.',
    templateId: 'system',
    startAt: '2026-07-06',
    submitDeadline: '2026-07-18',
    feedbackDeadline: '2026-07-25',
  },
  {
    id: 'ch-1',
    status: 'ended',
    title: '내가 플레이하는 게임의 가챠 시스템을 역기획하라',
    description:
      '첫 번째 챌린지. 어떤 게임이든 좋습니다 — 확률, 천장, 재화 흐름을 분해하고 "왜 이렇게 설계했는가"를 추론해 보세요. 같은 주제를 다룬 서로 다른 접근을 비교하는 것이 이번 챌린지의 목적입니다.',
    templateId: 'system',
    startAt: '2026-06-15',
    submitDeadline: '2026-06-27',
    feedbackDeadline: '2026-07-04',
    submissionIds: ['doc-genshin-gacha', 'doc-bluearchive-gacha'],
    bestDocId: 'doc-genshin-gacha',
  },
]

export function getOngoingChallenge() {
  return challenges.find((c) => c.status === 'ongoing')
}

export function getChallenge(id) {
  return challenges.find((c) => c.id === id)
}

export function daysLeft(dateString, today = new Date('2026-07-13')) {
  const diff = new Date(dateString).getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
