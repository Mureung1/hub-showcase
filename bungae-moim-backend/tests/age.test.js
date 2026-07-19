const { isAdult } = require('../src/utils/age');

// 시각을 고정해서 "오늘이 언제냐"에 따라 결과가 흔들리지 않게 한다.
const NOW = new Date('2026-07-20T12:00:00+09:00');

describe('isAdult', () => {
  it('birthDate가 없으면 판별 불가(null)를 반환한다', () => {
    expect(isAdult(null, NOW)).toBeNull();
    expect(isAdult(undefined, NOW)).toBeNull();
  });

  it('형식이 잘못된 값도 판별 불가(null)를 반환한다', () => {
    expect(isAdult('스물살', NOW)).toBeNull();
    expect(isAdult('2001-13-45', NOW)).toBeNull();
    expect(isAdult(20010520, NOW)).toBeNull();
  });

  it('달력상 존재하지 않는 날짜는 판별 불가(null)를 반환한다', () => {
    // 2월 30일, 4월 31일 등 실재하지 않는 날짜가 들어와도 null을 반환해야 한다.
    // API 요청 본문에서 사용자가 직접 입력한 문자열이 검증 없이 들어올 수 있기 때문.
    expect(isAdult('2001-02-30', NOW)).toBeNull();
    expect(isAdult('2001-04-31', NOW)).toBeNull();
    expect(isAdult('2001-06-31', NOW)).toBeNull();
  });

  it('만 19세 생일 당일이면 성인이다', () => {
    expect(isAdult('2007-07-20', NOW)).toBe(true);
  });

  it('만 19세 생일 하루 전이면 아직 성인이 아니다', () => {
    expect(isAdult('2007-07-21', NOW)).toBe(false);
  });

  it('생일이 지난 달이면 성인이다', () => {
    expect(isAdult('2007-06-30', NOW)).toBe(true);
  });

  it('생일이 다음 달이면 아직 성인이 아니다', () => {
    expect(isAdult('2007-08-01', NOW)).toBe(false);
  });

  it('충분히 나이가 많으면 성인이다', () => {
    expect(isAdult('1990-01-01', NOW)).toBe(true);
  });

  it('명백한 미성년이면 false를 반환한다', () => {
    expect(isAdult('2015-01-01', NOW)).toBe(false);
  });

  it('Date 객체로 줘도 문자열과 같은 결과가 나온다', () => {
    // pg는 date 컬럼을 로컬 자정 Date로 돌려주므로 이 입력도 지원해야 한다.
    expect(isAdult(new Date(2007, 6, 20), NOW)).toBe(true); // 2007-07-20
    expect(isAdult(new Date(2007, 6, 21), NOW)).toBe(false); // 2007-07-21
  });

  it('잘못된 Date 객체는 판별 불가(null)를 반환한다', () => {
    expect(isAdult(new Date('nope'), NOW)).toBeNull();
  });
});
