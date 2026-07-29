const { POSITIVE_TAGS, NEGATIVE_TAGS, MAX_TAGS_PER_SIGN } = require('../constants/evaluationTags');

// 이벤트 기본 점수(설계 5.2). 전부 코드 상수 — 실제 데이터가 쌓이면 조정하고 전체 재계산한다.
const POINTS = {
  ATTENDED: 1.0,
  POSITIVE_TAG: 0.5,
  NO_SHOW: -5.0,
  NEGATIVE_TAG: -2.0,
  LATE_CANCEL: -1.5,
};

const HALF_LIFE_DAYS = 90;
const K_UP = 40;
const K_DOWN = 25;
const LATE_CANCEL_HOURS = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

function eventPoints(event) {
  if (event.kind === 'cancellation') {
    // 확정 상태에서 임박 취소만 감점한다. 조기 취소가 0인 것이 핵심이다 —
    // "못 가면 일찍 취소해라"가 최적 전략이 되도록 인센티브를 맞춘다(D10).
    if (!event.wasConfirmed) return 0;
    return event.hoursBeforeStart <= LATE_CANCEL_HOURS ? POINTS.LATE_CANCEL : 0;
  }

  const tags = event.tags ?? [];
  const positives = tags.filter((t) => POSITIVE_TAGS.includes(t)).slice(0, MAX_TAGS_PER_SIGN);
  const negatives = tags.filter((t) => NEGATIVE_TAGS.includes(t)).slice(0, MAX_TAGS_PER_SIGN);

  const base = event.attended ? POINTS.ATTENDED : POINTS.NO_SHOW;
  return base + positives.length * POINTS.POSITIVE_TAG + negatives.length * POINTS.NEGATIVE_TAG;
}

// 90일 반감기. 1년 전 평가는 6%만 남는다 — 과거 한 번의 실수가 영원히 따라다니지 않게 한다(D9).
function recencyWeight(at, now) {
  const days = (now.getTime() - new Date(at).getTime()) / DAY_MS;
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

// 같은 사람에게 받은 평가는 **최신순으로** 세어 n번째를 1/n배 한다(D12).
// 시간순으로 세면 최근성 감쇠로 이미 6%만 남은 옛 평가가 가중치 1.0 자리를 차지하고
// 정작 최근 평가가 1/n으로 깎인다 — 설계 검토에서 실제로 발견해 뒤집은 부분이다.
function computeTrustScore(events, now) {
  const sorted = [...events].sort((a, b) => new Date(b.at) - new Date(a.at));
  const seenByRater = new Map();

  let S = 0;
  for (const event of sorted) {
    let repeatWeight = 1;
    if (event.raterId != null) {
      const seen = (seenByRater.get(event.raterId) ?? 0) + 1;
      seenByRater.set(event.raterId, seen);
      repeatWeight = 1 / seen;
    }
    S += eventPoints(event) * recencyWeight(event.at, now) * repeatWeight;
  }

  // tanh 포화 하나로 상한·하한과 "올라갈수록 어려움"이 동시에 해결된다(설계 5.1).
  // K_up > K_down이라 잃기는 쉽고 쌓기는 어렵다.
  const K = S >= 0 ? K_UP : K_DOWN;
  const score = 50 + 50 * Math.tanh(S / K);

  return { S, score };
}

module.exports = { computeTrustScore, eventPoints, recencyWeight, POINTS, K_UP, K_DOWN };
