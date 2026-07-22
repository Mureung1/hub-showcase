import { describe, it, expect } from 'vitest';
import { canMemberChange } from './permission';

describe('canMemberChange', () => {
  it('담당자 본인이면 true', () => {
    const task = { assignee_id: 3 };
    expect(canMemberChange(task, 3)).toBe(true);
  });

  it('담당자가 남이면 false', () => {
    const task = { assignee_id: 3 };
    expect(canMemberChange(task, 5)).toBe(false);
  });

  it('담당자 없음(assignee_id가 null)이면 누구나 true', () => {
    const task = { assignee_id: null };
    expect(canMemberChange(task, 5)).toBe(true);
  });

  it('담당자도 없고 memberId도 없으면(null) true', () => {
    const task = { assignee_id: null };
    expect(canMemberChange(task, null)).toBe(true);
  });

  it('담당자가 있는데 memberId가 없으면(null) false', () => {
    const task = { assignee_id: 3 };
    expect(canMemberChange(task, null)).toBe(false);
  });

  it('타입이 다르면(문자열 "3" vs 숫자 3) 같은 사람이어도 false', () => {
    const task = { assignee_id: 3 };
    expect(canMemberChange(task, '3')).toBe(false);
  });
});
