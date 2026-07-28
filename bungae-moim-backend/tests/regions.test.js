const { REGIONS, isValidRegion } = require('../src/utils/regions');

// FE(bungae-moim/src/data/mockData.js)와 BE(validators.js)가 공유하는 단일 소스
// shared/regions.json의 구조 불변식을 잠근다. 이 파일이 깨지면 등록/수정 검증
// (validateCreateMeeting)이나 FE 지역 셀렉트가 조용히 틀어질 수 있다.
describe('shared/regions.json 구조 불변식', () => {
  it('시/도가 17개다', () => {
    expect(Object.keys(REGIONS)).toHaveLength(17);
  });

  it('시/군/구 합계가 229개다', () => {
    const total = Object.values(REGIONS).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(229);
  });

  it('모든 값이 비어있지 않은 문자열 배열이고, 시/도 내 중복이 없다', () => {
    for (const list of Object.values(REGIONS)) {
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const sigungu of list) {
        expect(typeof sigungu).toBe('string');
        expect(sigungu.trim()).not.toBe('');
      }
      const unique = new Set(list);
      expect(unique.size).toBe(list.length);
    }
  });

  it('모든 시/도명·시/군/구명이 20 코드포인트 이하다 (DB varchar(20) 한도)', () => {
    // validators.js의 MAX_LENGTHS.regionSido/regionSigungu와 같은 한도.
    // 코드포인트로 세야 한다 — .length(UTF-16 코드유닛)로 재면 서로게이트 페어를
    // 가진 문자를 2로 세서 실제보다 짧게 나올 수 있다.
    for (const [sido, list] of Object.entries(REGIONS)) {
      expect([...sido].length).toBeLessThanOrEqual(20);
      for (const sigungu of list) {
        expect([...sigungu].length).toBeLessThanOrEqual(20);
      }
    }
  });

  it('세종특별자치시는 하위 구분 없이 자기 자신 하나뿐이다', () => {
    expect(REGIONS['세종특별자치시']).toEqual(['세종특별자치시']);
  });
});

describe('isValidRegion', () => {
  it('유효한 시/도+시/군/구 조합이면 true', () => {
    expect(isValidRegion('서울특별시', '강남구')).toBe(true);
    expect(isValidRegion('세종특별자치시', '세종특별자치시')).toBe(true);
  });

  it('시/군/구가 다른 시/도 소속이면 false', () => {
    expect(isValidRegion('서울특별시', '수원시')).toBe(false);
  });

  it('시/도 자체가 없으면 false', () => {
    expect(isValidRegion('없는시도', '아무데나')).toBe(false);
  });
});
