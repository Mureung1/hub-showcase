import { describe, it, expect } from 'vitest';
import {
  scoreQuoteMatch,
  scoreCitationIntegrity,
  checkHypothesisIdValidity,
  isStatusAccurate,
} from './metrics';

describe('scoreQuoteMatch', () => {
  const transcript = '진행자: 가격이 너무 비싸다고 느꼈어요.\n사용자: 다음엔 안 살 것 같아요.';

  it('모든 quote가 전사문에 실제로 존재하면 rate가 1이어야 한다', () => {
    const quotes = ['가격이 너무 비싸다고 느꼈어요.', '다음엔 안 살 것 같아요.'];
    expect(scoreQuoteMatch(quotes, transcript)).toEqual({ total: 2, matched: 2, rate: 1 });
  });

  it('일부 quote가 지어낸 문장이면 그만큼 rate가 낮아져야 한다', () => {
    const quotes = ['가격이 너무 비싸다고 느꼈어요.', '이 문장은 전사문에 없습니다.'];
    expect(scoreQuoteMatch(quotes, transcript)).toEqual({ total: 2, matched: 1, rate: 0.5 });
  });

  it('quote가 빈 배열이면 total 0에 rate 1(측정 대상 없음)을 반환해야 한다', () => {
    expect(scoreQuoteMatch([], transcript)).toEqual({ total: 0, matched: 0, rate: 1 });
  });
});

describe('scoreCitationIntegrity', () => {
  it('본문의 [n] 마커와 citations가 정확히 1:1 대응하면 rate가 1이어야 한다', () => {
    const summary = '가격 저항이 확인되었습니다[1]. 재구매 의향도 낮았습니다[2].';
    const citations = [{ marker: 1 }, { marker: 2 }];
    expect(scoreCitationIntegrity(summary, citations)).toEqual({ total: 2, matched: 2, rate: 1 });
  });

  it('본문에는 마커가 있는데 citations에 대응 항목이 없으면 불일치로 잡아야 한다', () => {
    const summary = '가격 저항이 확인되었습니다[1]. 재구매 의향도 낮았습니다[2].';
    const citations = [{ marker: 1 }];
    expect(scoreCitationIntegrity(summary, citations)).toEqual({
      total: 2,
      matched: 1,
      rate: 0.5,
    });
  });

  it('citations에는 있는데 본문에 마커가 등장하지 않으면 불일치로 잡아야 한다', () => {
    const summary = '가격 저항이 확인되었습니다[1].';
    const citations = [{ marker: 1 }, { marker: 2 }];
    expect(scoreCitationIntegrity(summary, citations)).toEqual({
      total: 2,
      matched: 1,
      rate: 0.5,
    });
  });

  it('마커도 citations도 없으면 total 0에 rate 1을 반환해야 한다', () => {
    expect(scoreCitationIntegrity('근거가 없습니다.', [])).toEqual({
      total: 0,
      matched: 0,
      rate: 1,
    });
  });
});

describe('checkHypothesisIdValidity', () => {
  const validIds = ['h1', 'h2'];

  it('모든 hypothesis_id가 유효하면 allValid가 true이고 invalidIds가 비어야 한다', () => {
    const items = [{ hypothesis_id: 'h1' }, { hypothesis_id: 'h2' }];
    expect(checkHypothesisIdValidity(items, validIds)).toEqual({
      allValid: true,
      invalidIds: [],
    });
  });

  it('존재하지 않는 hypothesis_id가 하나라도 있으면 allValid가 false이고 그 id를 나열해야 한다', () => {
    const items = [{ hypothesis_id: 'h1' }, { hypothesis_id: 'ghost' }];
    expect(checkHypothesisIdValidity(items, validIds)).toEqual({
      allValid: false,
      invalidIds: ['ghost'],
    });
  });

  it('빈 배열이 주어지면 allValid는 true여야 한다(검증할 것이 없음)', () => {
    expect(checkHypothesisIdValidity([], validIds)).toEqual({ allValid: true, invalidIds: [] });
  });
});

describe('isStatusAccurate', () => {
  it('실제 판정과 골든셋 기대값이 같으면 true를 반환해야 한다', () => {
    expect(isStatusAccurate('유력함', '유력함')).toBe(true);
  });

  it('실제 판정과 골든셋 기대값이 다르면 false를 반환해야 한다', () => {
    expect(isStatusAccurate('유력함', '근거 부족')).toBe(false);
  });

  it('기대값이 아직 TODO placeholder면(라벨 미확정) false를 반환해 오탐을 막아야 한다', () => {
    expect(isStatusAccurate('유력함', 'TODO(사람이 전사문을 읽고 직접 판단)')).toBe(false);
  });
});
