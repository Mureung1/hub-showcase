import { describe, it, expect } from 'vitest';
import { applyOralContraceptive } from './sensitivityToHalfLife.js';

describe('applyOralContraceptive', () => {
  it('경구피임약 복용 중이면 반감기를 2배로 늘린다', () => {
    expect(applyOralContraceptive(5, true)).toBe(10);
  });

  it('복용 안 하면 반감기를 그대로 반환한다', () => {
    expect(applyOralContraceptive(5, false)).toBe(5);
  });

  it('값이 없으면(남성이라 필드 자체가 안 온 경우) 반감기를 그대로 반환한다', () => {
    expect(applyOralContraceptive(5, undefined)).toBe(5);
  });
});
