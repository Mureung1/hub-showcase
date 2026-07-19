// 만 19세 이상을 성인으로 본다 (기획서 6.1 "성인만 참여 가능" 옵션 기준).
const ADULT_AGE = 19;

// birth_date를 { year, month, day }로 쪼갠다.
// 문자열과 Date를 모두 받는 이유: API 요청 본문에서는 'YYYY-MM-DD' 문자열로 들어오고,
// DB에서 읽으면 pg가 date 컬럼을 로컬 자정 Date 객체로 변환해 주기 때문.
// 타임존 때문에 하루가 밀리는 것을 피하려고 UTC 게터가 아닌 로컬 게터를 쓴다
// (pg가 만들어 준 Date가 로컬 자정이므로 로컬 게터라야 원래 날짜가 그대로 나온다).
function parseBirthDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }

  if (typeof value !== 'string') return null;

  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

// 성인이면 true, 미성년이면 false, 생년월일이 없거나 형식이 잘못돼 판별할 수 없으면 null.
// 호출부(F1)가 "미성년이라 차단"과 "생년월일이 없어 차단"을 구분해 안내할 수 있도록
// 셋을 섞지 않고 그대로 돌려준다.
function isAdult(birthDate, now = new Date()) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;

  let age = now.getFullYear() - birth.year;

  // 올해 생일이 아직 안 지났으면 한 살 뺀다.
  const monthDiff = now.getMonth() + 1 - birth.month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.day)) {
    age -= 1;
  }

  return age >= ADULT_AGE;
}

module.exports = { isAdult, ADULT_AGE };
