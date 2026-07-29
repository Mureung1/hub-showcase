/// KST(UTC+9) 기준 **날짜 경계** 계산. 하루 코인 상한과 출석 스트릭이 공유한다.
///
/// 왜 순수 함수 한 곳인가: 날짜 키를 두 저장소(Firestore·InMemory)가 각자 만들면
/// 갈라지고, 그 차이는 InMemory만 보는 테스트에서 안 잡힌다
/// (`normalizeMemo`·`applyXpGain`과 같은 이유).
///
/// 왜 KST인가: Firestore는 시각을 **UTC로 저장**한다. UTC 자정을 하루 경계로 쓰면
/// 한국 사용자에게는 **오전 9시에 하루가 리셋**된다 — 아침에 퀘스트를 하던 사람의
/// 카운터가 갑자기 0이 되고, 자정에 출석해도 "어제"로 기록된다.
/// 앱의 사용자는 한국 대학생이므로 하루의 경계는 KST 자정이다.
///
/// `DateTime.toLocal()`을 쓰지 않는 이유: 기기 타임존에 따라 결과가 달라져
/// 해외에 있는 사용자나 타임존이 어긋난 에뮬레이터에서 경계가 흔들린다.
/// 여기서는 **고정 오프셋 +9시간**으로 못 박는다(한국은 서머타임이 없다).
library;

/// KST = UTC+9. 고정 오프셋(서머타임 없음).
const Duration kKstOffset = Duration(hours: 9);

/// 주어진 시각을 KST 벽시계 시각으로 옮긴다(내부용).
///
/// 반환값의 `isUtc`는 true지만 의미는 "KST 벽시계"다. 연·월·일만 읽는 데 쓴다.
DateTime _kstWallClock(DateTime instant) => instant.toUtc().add(kKstOffset);

/// KST 기준 날짜 키 `yyyy-MM-dd`.
///
/// 하루 코인 카운터·출석 기록의 저장 키다. 문자열로 두는 이유: Firestore에
/// 그대로 저장·비교할 수 있고, 콘솔에서 사람이 읽을 수 있으며, 타임존 해석이
/// 끼어들 여지가 없다(Timestamp로 두면 읽는 쪽 타임존에 따라 날짜가 흔들린다).
String kstDateKey(DateTime instant) {
  final kst = _kstWallClock(instant);
  final month = kst.month.toString().padLeft(2, '0');
  final day = kst.day.toString().padLeft(2, '0');
  return '${kst.year.toString().padLeft(4, '0')}-$month-$day';
}

/// KST 기준 **사람이 읽는 날짜** `yyyy년 M월 d일`. 가입일·완료일 표시에 쓴다.
///
/// [kstDateKey]와 나눈 이유: 저쪽은 저장·비교용 기계 키(`yyyy-MM-dd`, 0 패딩)고
/// 이쪽은 화면 문구다. 두 포맷은 목적이 달라 함께 움직이지 않는다.
///
/// 한 곳에 둔 이유: 프로필 가입일과 보관함 완료일이 각자 같은 두 줄을 복제하고
/// 있었다. 표시 포맷이 갈리면 같은 앱 안에서 날짜가 다르게 보인다.
///
/// ⚠️ 출력 문자열은 회귀 테스트가 그대로 단언한다. 한 글자도 바꾸지 않는다.
String kstDateLabel(DateTime instant) {
  final kst = _kstWallClock(instant);
  return '${kst.year}년 ${kst.month}월 ${kst.day}일';
}

/// 1970-01-01을 0으로 하는 **일련 일수**. 두 날짜의 간격(연속 출석 판정)에 쓴다.
///
/// 날짜 문자열을 빼서 비교할 수는 없고(`'2026-03-01' - '2026-02-28'`),
/// 월말·윤년 경계를 직접 다루면 반드시 틀린다. UTC 자정 기준 절대 일수로 바꿔
/// 정수 뺄셈 한 번으로 끝낸다.
int kstDayNumber(DateTime instant) {
  final kst = _kstWallClock(instant);
  return _dayNumber(kst.year, kst.month, kst.day);
}

/// 날짜 키(`yyyy-MM-dd`) → 일련 일수. 형식이 깨졌으면 `null`.
///
/// 저장된 값이 깨져 있어도(수동 편집·구버전) 예외를 던지지 않는다 —
/// null이면 호출부가 "기록 없음"으로 보고 스트릭을 새로 시작한다.
int? kstDayNumberOfKey(String? key) {
  if (key == null) return null;
  final parts = key.split('-');
  if (parts.length != 3) return null;

  final year = int.tryParse(parts[0]);
  final month = int.tryParse(parts[1]);
  final day = int.tryParse(parts[2]);
  if (year == null || month == null || day == null) return null;

  return _dayNumber(year, month, day);
}

int _dayNumber(int year, int month, int day) =>
    DateTime.utc(year, month, day).difference(DateTime.utc(1970)).inDays;
