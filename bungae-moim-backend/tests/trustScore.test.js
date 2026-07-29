// 신뢰도 산식(설계 5장). 순수 함수라 DB가 필요 없다.
const { computeTrustScore, eventPoints, recencyWeight } = require('../src/utils/trustScore');

const NOW = new Date('2026-07-28T12:00:00');

function daysAgo(n) {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

// 서로 다른 사람에게 같은 날 받은 "성실 참여" 평가(출석 + 긍정태그 2개 = +2.0)
function goodEvaluations(count, { sameRater = false } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    kind: 'evaluation',
    at: NOW,
    raterId: sameRater ? 1 : i + 1,
    attended: true,
    tags: ['punctual', 'friendly'],
  }));
}

describe('eventPoints', () => {
  it('출석은 +1.0, 긍정 태그는 개당 +0.5', () => {
    expect(eventPoints({ kind: 'evaluation', attended: true, tags: [] })).toBe(1);
    expect(eventPoints({ kind: 'evaluation', attended: true, tags: ['punctual', 'again'] })).toBe(2);
  });

  it('긍정 태그는 3개까지만 반영한다', () => {
    const four = ['punctual', 'friendly', 'good_talk', 'again'];
    expect(eventPoints({ kind: 'evaluation', attended: true, tags: four })).toBe(2.5);
  });

  it('노쇼는 −5.0, 부정 태그는 개당 −2.0(3개까지)', () => {
    expect(eventPoints({ kind: 'evaluation', attended: false, tags: [] })).toBe(-5);
    expect(eventPoints({ kind: 'evaluation', attended: false, tags: ['late'] })).toBe(-7);
  });

  it('확정 상태 24시간 이내 취소는 −1.5, 그보다 이르면 0', () => {
    expect(eventPoints({ kind: 'cancellation', wasConfirmed: true, hoursBeforeStart: 3 })).toBe(-1.5);
    expect(eventPoints({ kind: 'cancellation', wasConfirmed: true, hoursBeforeStart: 24 })).toBe(-1.5);
    expect(eventPoints({ kind: 'cancellation', wasConfirmed: true, hoursBeforeStart: 25 })).toBe(0);
  });

  it('pending 상태 취소는 언제 취소했든 0', () => {
    expect(eventPoints({ kind: 'cancellation', wasConfirmed: false, hoursBeforeStart: 1 })).toBe(0);
  });
});

describe('recencyWeight', () => {
  it('90일이면 절반, 오늘이면 1', () => {
    expect(recencyWeight(NOW, NOW)).toBeCloseTo(1, 5);
    expect(recencyWeight(daysAgo(90), NOW)).toBeCloseTo(0.5, 5);
    expect(recencyWeight(daysAgo(180), NOW)).toBeCloseTo(0.25, 5);
  });
});

describe('computeTrustScore', () => {
  it('이력이 없으면 50', () => {
    expect(computeTrustScore([], NOW).score).toBe(50);
  });

  it('서로 다른 5명에게 성실 참여 평가를 받으면 약 62', () => {
    const { S, score } = computeTrustScore(goodEvaluations(5), NOW);
    expect(S).toBeCloseTo(10, 5);
    expect(Math.round(score)).toBe(62);
  });

  it('서로 다른 20명이면 약 88 — 올라갈수록 어려워진다(tanh 포화)', () => {
    const { score } = computeTrustScore(goodEvaluations(20), NOW);
    expect(Math.round(score)).toBe(88);
  });

  it('같은 사람에게 20번 받아도 서로 다른 20명보다 훨씬 낮다(파밍 차단)', () => {
    const many = computeTrustScore(goodEvaluations(20, { sameRater: true }), NOW).score;
    const diverse = computeTrustScore(goodEvaluations(20), NOW).score;
    expect(many).toBeLessThan(diverse - 15);
  });

  it('노쇼 1회는 40, 3회는 23 — 잃기는 쉽고 쌓기는 어렵다(K 비대칭)', () => {
    const one = computeTrustScore(
      [{ kind: 'evaluation', at: NOW, raterId: 1, attended: false, tags: [] }],
      NOW
    );
    expect(Math.round(one.score)).toBe(40);

    const three = computeTrustScore(
      [1, 2, 3].map((raterId) => ({ kind: 'evaluation', at: NOW, raterId, attended: false, tags: [] })),
      NOW
    );
    expect(Math.round(three.score)).toBe(23);
  });

  it('반복 가중치는 최신순으로 센다 — 오래된 평가가 1.0을 차지하면 안 된다', () => {
    // 같은 사람에게 두 번: 최근 것이 1.0, 오래된 것이 0.5.
    // 시간순으로 세면 오래된 것(이미 최근성으로 6.25%만 남은)이 1.0을 가져가 점수가 달라진다.
    const events = [
      { kind: 'evaluation', at: daysAgo(360), raterId: 7, attended: true, tags: [] },
      { kind: 'evaluation', at: NOW, raterId: 7, attended: true, tags: [] },
    ];
    const { S } = computeTrustScore(events, NOW);
    // 최신순: 1.0×1.0(오늘) + 0.5×0.0625(360일 전, 반감기 4회) = 1.03125
    expect(S).toBeCloseTo(1.03125, 4);
  });

  it('점수는 0~100을 벗어나지 않는다', () => {
    const manyBad = Array.from({ length: 50 }, (_, i) => ({
      kind: 'evaluation', at: NOW, raterId: i + 1, attended: false, tags: ['late', 'rude'],
    }));
    const score = computeTrustScore(manyBad, NOW).score;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(50);
  });
});
