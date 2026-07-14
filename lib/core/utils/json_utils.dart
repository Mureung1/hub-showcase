/// JSON → Dart 안전 변환 헬퍼.
///
/// checklist 1주차: "필드 누락·타입 불일치 시 파싱이 예외를 던지거나 기본값으로 안전 처리한다".
///
/// Firestore 문서는 스키마가 강제되지 않는다. 수동 편집, 구버전 앱이 쓴 값,
/// 마이그레이션 중간 상태 때문에 `int`여야 할 자리에 `String`이나 `double`이
/// 들어올 수 있다. `json['coin'] as int`는 그 순간 앱을 죽인다.
/// 아래 함수들은 합리적으로 강제 변환하고, 불가능하면 fallback을 준다.
library;

/// `int` | `double` | `num` | 숫자 문자열 | null → int
int asInt(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value.trim()) ?? fallback;
  return fallback;
}

/// 아무 값 → String (null·비문자열은 fallback)
String asString(Object? value, {String fallback = ''}) {
  if (value is String) return value;
  if (value == null) return fallback;
  return value.toString();
}

/// 선택적 문자열. 없거나 공백뿐이면 `null`.
///
/// [asString]과 달리 "값이 없음"과 "빈 문자열"을 구분한다.
/// `goalId` 같은 선택 참조 필드에 쓴다 — 빈 문자열 ID로 조회하면 안 되기 때문이다.
String? asNullableString(Object? value) {
  if (value is! String) return null;
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

/// `bool` | `"true"`/`"false"` | `1`/`0` → bool
bool asBool(Object? value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final v = value.trim().toLowerCase();
    if (v == 'true') return true;
    if (v == 'false') return false;
  }
  return fallback;
}

/// `DateTime` | ISO8601 문자열 | epoch millis(int) → DateTime?
///
/// Firestore의 `Timestamp`는 여기까지 오지 않는다.
/// `repositories/firestore/timestamp_codec.dart`가 경계에서 변환하기 때문에
/// `models/`는 Firebase에 의존하지 않는 순수 Dart로 유지된다.
DateTime? asDateTime(Object? value) {
  if (value is DateTime) return value;
  if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
  if (value is String) return DateTime.tryParse(value);
  return null;
}

/// `Map` → `Map<String, String>` (값이 문자열이 아니면 toString)
Map<String, String> asStringMap(Object? value) {
  if (value is! Map) return {};
  final result = <String, String>{};
  value.forEach((k, v) {
    if (v != null) result[k.toString()] = v.toString();
  });
  return result;
}

/// 필수 문자열. 없거나 공백뿐이면 [FormatException].
///
/// 선택적 필드에는 쓰지 않는다. "이게 없으면 이 객체는 의미가 없다"일 때만 쓴다.
String requireString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! String || value.trim().isEmpty) {
    throw FormatException('필수 필드 누락 또는 빈 값: $key (받은 값: $value)');
  }
  return value.trim();
}
