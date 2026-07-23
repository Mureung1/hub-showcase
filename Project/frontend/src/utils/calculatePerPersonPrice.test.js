import { describe, expect, it } from 'vitest';
import { calculatePerPersonPrice } from './calculatePerPersonPrice';

describe('calculatePerPersonPrice', () => {
  it('총 금액을 모집 인원으로 나눈 뒤 가장 가까운 원 단위로 반올림한다', () => {
    expect(calculatePerPersonPrice(10000, 3)).toBe(3333);
  });

  it('나누어떨어지는 금액은 그대로 반환한다', () => {
    expect(calculatePerPersonPrice(12000, 3)).toBe(4000);
  });

  it('총 금액이 0이면 0원을 반환한다', () => {
    expect(calculatePerPersonPrice(0, 2)).toBe(0);
  });

  it('모집 인원이 0이거나 음수이면 0원을 반환한다', () => {
    expect(calculatePerPersonPrice(10000, 0)).toBe(0);
    expect(calculatePerPersonPrice(10000, -1)).toBe(0);
  });

  it('음수 또는 숫자가 아닌 금액·인원은 0원을 반환한다', () => {
    expect(calculatePerPersonPrice(-10000, 2)).toBe(0);
    expect(calculatePerPersonPrice('10000', 2)).toBe(0);
    expect(calculatePerPersonPrice(10000, Number.NaN)).toBe(0);
  });
});
