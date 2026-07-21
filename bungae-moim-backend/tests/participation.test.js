const { evaluateApplicability } = require('../src/utils/participation');

// 시각 고정: 성인 경계 계산(isAdult)이 오늘 날짜에 흔들리지 않게.
const NOW = new Date('2026-07-21T12:00:00+09:00');

// flash 모임 기본값. 필요한 필드만 오버라이드해서 쓴다.
function meeting(overrides = {}) {
  return { hostId: 1, type: 'flash', capacity: 4, status: 'recruiting', adultOnly: false, ...overrides };
}
const adultViewer = { id: 2, birthDate: '1990-01-01' };

function evalWith(overrides = {}) {
  return evaluateApplicability({
    meeting: meeting(),
    viewer: adultViewer,
    confirmedCount: 0,
    existingStatus: null,
    isPast: false,
    now: NOW,
    ...overrides,
  });
}

describe('evaluateApplicability', () => {
  it('비로그인은 LOGIN_REQUIRED', () => {
    expect(evalWith({ viewer: null })).toEqual({ canApply: false, blockReason: 'LOGIN_REQUIRED' });
  });

  it('모임장 본인은 HOST', () => {
    expect(evalWith({ viewer: { id: 1, birthDate: '1990-01-01' } }))
      .toEqual({ canApply: false, blockReason: 'HOST' });
  });

  it('이미 pending/confirmed/approved면 ALREADY_APPLIED', () => {
    for (const s of ['pending', 'confirmed', 'approved']) {
      expect(evalWith({ existingStatus: s }).blockReason).toBe('ALREADY_APPLIED');
    }
  });

  it('거절당한 사람은 REJECTED(재신청 불가)', () => {
    expect(evalWith({ existingStatus: 'rejected' }).blockReason).toBe('REJECTED');
  });

  it('내가 취소한(cancelled) 건은 재신청 가능(차단 사유 없음)', () => {
    expect(evalWith({ existingStatus: 'cancelled' })).toEqual({ canApply: true, blockReason: null });
  });

  it('취소된 모임은 CANCELLED_MEETING', () => {
    expect(evalWith({ meeting: meeting({ status: 'cancelled' }) }).blockReason).toBe('CANCELLED_MEETING');
  });

  it('지난 모임은 ENDED', () => {
    expect(evalWith({ isPast: true }).blockReason).toBe('ENDED');
  });

  it('flash 정원이 찼으면 FULL', () => {
    expect(evalWith({ confirmedCount: 4 }).blockReason).toBe('FULL');
  });

  it('확정자가 있어도 small은 FULL이 아니다(capacity null 강제변환 함정)', () => {
    // small은 capacity가 null. 가드 없이 confirmedCount >= capacity로 쓰면 5 >= null → 5 >= 0 → true가 되어
    // 확정자 있는 소모임이 전부 FULL로 오탐된다. 그걸 막았는지 검증.
    const res = evalWith({ meeting: meeting({ type: 'small', capacity: null }), confirmedCount: 5 });
    expect(res).toEqual({ canApply: true, blockReason: null });
  });

  it('성인 전용에 생년월일 없으면 BIRTHDATE_REQUIRED', () => {
    const res = evalWith({ meeting: meeting({ adultOnly: true }), viewer: { id: 2, birthDate: null } });
    expect(res.blockReason).toBe('BIRTHDATE_REQUIRED');
  });

  it('성인 전용에 미성년이면 ADULT_ONLY', () => {
    const res = evalWith({ meeting: meeting({ adultOnly: true }), viewer: { id: 2, birthDate: '2015-01-01' } });
    expect(res.blockReason).toBe('ADULT_ONLY');
  });

  it('성인 전용에 성인이면 신청 가능', () => {
    const res = evalWith({ meeting: meeting({ adultOnly: true }), viewer: adultViewer });
    expect(res).toEqual({ canApply: true, blockReason: null });
  });

  it('아무 것도 안 걸리면 canApply true', () => {
    expect(evalWith()).toEqual({ canApply: true, blockReason: null });
  });

  it('우선순위: 이미 신청했으면 정원이 차도 ALREADY_APPLIED가 이긴다', () => {
    expect(evalWith({ existingStatus: 'confirmed', confirmedCount: 4 }).blockReason).toBe('ALREADY_APPLIED');
  });
});
