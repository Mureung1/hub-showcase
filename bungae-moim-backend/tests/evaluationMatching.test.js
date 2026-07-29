// 진술 대조(설계 6장). 노쇼 판정은 일방적이라, 양쪽 진술이 엇갈리면 아무도 벌하지 않는다.
const { resolveEvaluations } = require('../src/utils/evaluationMatching');

const HOST = 1;
const PART = 2;

function ev(raterId, rateeId, attended, tags = []) {
  return { meetingId: 10, raterId, rateeId, attended, tags, createdAt: new Date('2026-07-20T10:00:00') };
}

function resolve(hostSide, participantSide) {
  return resolveEvaluations([{ meetingId: 10, hostSide, participantSide }]);
}

describe('resolveEvaluations — 설계 6장 표 9줄', () => {
  it('둘 다 제출 안 함 → 아무 것도 없다', () => {
    const { validForRatee, invalid } = resolve(null, null);
    expect(validForRatee).toEqual([]);
    expect(invalid).toEqual([]);
  });

  it('모임장 미제출 + 참여자가 "왔음" → 모임장 점수만 정상 반영', () => {
    const p = ev(PART, HOST, true);
    const { validForRatee } = resolve(null, p);
    expect(validForRatee).toEqual([p]);
  });

  it('모임장 미제출 + 참여자가 "안 왔음" → 모임장 노쇼 확정(반박이 없다)', () => {
    const p = ev(PART, HOST, false);
    const { validForRatee } = resolve(null, p);
    expect(validForRatee).toEqual([p]);
  });

  it('모임장이 "왔음" + 참여자 미제출 → 참여자 점수만 정상 반영', () => {
    const h = ev(HOST, PART, true);
    const { validForRatee } = resolve(h, null);
    expect(validForRatee).toEqual([h]);
  });

  it('양쪽 다 "왔음" → 둘 다 정상 반영', () => {
    const h = ev(HOST, PART, true);
    const p = ev(PART, HOST, true);
    const { validForRatee, invalid } = resolve(h, p);
    expect(validForRatee).toHaveLength(2);
    expect(invalid).toEqual([]);
  });

  it('모임장 "왔음" + 참여자 "안 왔음" → 불일치라 양쪽 0점', () => {
    const h = ev(HOST, PART, true);
    const p = ev(PART, HOST, false);
    const { validForRatee, invalid } = resolve(h, p);
    expect(validForRatee).toEqual([]);
    expect(invalid).toHaveLength(2);
  });

  it('모임장 "안 왔음" + 참여자 미제출 → 참여자 노쇼 확정', () => {
    const h = ev(HOST, PART, false);
    const { validForRatee } = resolve(h, null);
    expect(validForRatee).toEqual([h]);
  });

  it('모임장 "안 왔음" + 참여자 "왔음" → 불일치라 양쪽 0점', () => {
    const h = ev(HOST, PART, false);
    const p = ev(PART, HOST, true);
    const { validForRatee, invalid } = resolve(h, p);
    expect(validForRatee).toEqual([]);
    expect(invalid).toHaveLength(2);
  });

  it('양쪽 다 "안 왔음"(상호 지목) → 양쪽 0점 — 피해자를 벌하지 않기 위해서다', () => {
    const h = ev(HOST, PART, false);
    const p = ev(PART, HOST, false);
    const { validForRatee, invalid } = resolve(h, p);
    expect(validForRatee).toEqual([]);
    expect(invalid).toHaveLength(2);
  });

  it('불일치는 태그까지 전부 무효로 만든다(그 쌍에 한해)', () => {
    const h = ev(HOST, PART, true, ['punctual', 'friendly']);
    const p = ev(PART, HOST, false, ['different']);
    const { validForRatee } = resolve(h, p);
    expect(validForRatee).toEqual([]);
  });

  it('다른 참여자의 평가는 불일치에 영향받지 않는다', () => {
    const pairs = [
      { meetingId: 10, hostSide: ev(HOST, PART, true), participantSide: ev(PART, HOST, false) },
      { meetingId: 10, hostSide: ev(HOST, 3, true), participantSide: null },
    ];
    const { validForRatee } = resolveEvaluations(pairs);
    expect(validForRatee).toHaveLength(1);
    expect(validForRatee[0].rateeId).toBe(3);
  });
});
