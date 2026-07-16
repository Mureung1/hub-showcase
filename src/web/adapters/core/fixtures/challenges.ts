import type { FeaturedOfficialChallengeDto, UserChallengeDetailDto } from '../../../dto/challenge';
const now = '2026-07-16T03:00:00.000Z';
export const featuredOfficial: FeaturedOfficialChallengeDto = Object.freeze({
  challengeId: 'official-focus-30', title: '30일 집중 생존 스터디', summary: '매일 30분, 목표와 인증으로 끝까지 살아남는 집중 루틴입니다.',
  status: 'recruiting', viewerState: 'anonymous', ctaVariant: 'recruiting-anonymous', now,
  recruitmentStartsAt: '2026-07-01T00:00:00.000Z', recruitmentEndsAt: '2026-07-31T14:59:59.000Z', challengeStartsAt: '2026-08-01T00:00:00.000Z', challengeEndsAt: '2026-08-30T14:59:59.000Z',
  dailyMinutes: 30, price: { currency: 'KRW', amountMinor: 39000, maxPointDiscount: 5000 }, participation: null, source: 'mock',
  sections: {
    outcomes: [{ heading: '흔들리지 않는 루틴', body: '매일 작게 시작하고 기록하는 구조로 학습 리듬을 만듭니다.' }],
    forWhom: [{ heading: '시작은 쉽지만 지속이 어려운 분', body: '명확한 마감과 동료의 존재가 필요한 학습자에게 맞습니다.', items: ['매일 30분을 확보할 수 있어요', '공개 순위와 인증 규칙에 동의해요'] }],
    dailyRoutine: [{ heading: '목표 → 집중 → 회고 → 인증', body: '목표를 적고 30분을 공부한 뒤 근거와 회고를 제출합니다.' }],
    howItWorks: ['신청', '결제', '참가 완료', '일일 학습', '인증', '완료'].map((title, index) => ({ title, description: `${index + 1}단계`, state: index === 0 ? 'current' as const : 'upcoming' as const })),
    verification: [{ heading: '하루 한 번 생존 인증', body: '학습 시간, 짧은 회고, 비공개 증빙을 마감 전에 제출합니다.' }],
    rewards: [{ heading: '완주 리포트와 배지', body: '완주 조건과 보상은 챌린지 규칙에 따라 확정됩니다.' }],
    schedule: [{ label: '모집 마감', value: '2026년 7월 31일' }, { label: '진행 기간', value: '2026년 8월 1일–30일' }, { label: '매일', value: '30분 학습 및 당일 인증' }],
    faq: [{ id: 'daily', question: '매일 몇 분 공부하나요?', answer: '최소 30분의 확정된 학습 시간이 필요합니다.' }, { id: 'evidence', question: '인증 파일은 공개되나요?', answer: '아니요. 비공개 Storage에 저장하고 권한 확인 후에만 봅니다.' }],
  },
});
export type OfficialFixtureScenario = 'recruiting' | 'none' | 'closed' | 'joined-complete' | 'joined-action-required' | 'malformed';
export const officialFixtures: Readonly<Record<Exclude<OfficialFixtureScenario,'none'|'malformed'>, FeaturedOfficialChallengeDto>> = Object.freeze({
  recruiting: featuredOfficial,
  closed: Object.freeze({ ...featuredOfficial, status: 'closed', ctaVariant: 'closed', recruitmentEndsAt: '2026-07-15T14:59:59.000Z' }),
  'joined-complete': Object.freeze({ ...featuredOfficial, viewerState: 'joined', ctaVariant: 'joined-complete-today', participation: { participationId: '20000000-0000-4000-8000-000000000001', todayVerification: 'complete' as const, verificationDeadlineAt: null } }),
  'joined-action-required': Object.freeze({ ...featuredOfficial, viewerState: 'joined', ctaVariant: 'joined-action-required', participation: { participationId: '20000000-0000-4000-8000-000000000001', todayVerification: 'incomplete' as const, verificationDeadlineAt: '2026-07-16T14:59:59.000Z' } }),
});
/** Deliberately never exported as a public DTO; the adapter converts this source fault to CONFIGURATION_ERROR. */
export const malformedOfficialCandidateCount = 2;
export const userChallenges: readonly UserChallengeDetailDto[] = Object.freeze([
  { challengeId: 'morning-reading', title: '새벽 독서 20분', summary: '출근 전 책 한 챕터', description: '매일 아침 읽고 한 문장을 기록합니다.', startsOn: '2026-07-20', endsOn: '2026-08-18', entryPoints: 300, dailyMinutes: 20, status: 'recruiting', participantCount: 12, capacity: 24, verificationDeadline: '매일 10:00', eliminationRule: '2회 연속 미인증 시 탈락', visibility: 'public', walletBalance: 1250, source: 'mock' },
  { challengeId: 'algorithm-30', title: '알고리즘 한 문제', summary: '30일 코딩 루틴', description: '문제 풀이 과정을 매일 기록합니다.', startsOn: '2026-07-25', endsOn: '2026-08-23', entryPoints: 500, dailyMinutes: 45, status: 'recruiting', participantCount: 19, capacity: 30, verificationDeadline: '매일 23:30', eliminationRule: '누적 3회 미인증 시 탈락', visibility: 'public', walletBalance: 1250, source: 'mock' },
  { challengeId: 'english-writing', title: '영어 한 문단', summary: '매일 짧게 쓰기', description: '하루 한 문단을 쓰고 교정합니다.', startsOn: '2026-06-01', endsOn: '2026-06-30', entryPoints: 200, dailyMinutes: 15, status: 'ended', participantCount: 18, capacity: 18, verificationDeadline: '매일 22:00', eliminationRule: '3회 미인증 시 탈락', visibility: 'public', source: 'mock' },
]);
