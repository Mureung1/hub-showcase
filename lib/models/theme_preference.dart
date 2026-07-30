/// 사용자가 고른 앱 테마.
///
/// 저장·전송되는 값은 항상 소문자 영문(`system`/`light`/`dark`)이고, 한글 라벨은
/// 표시용일 뿐 직렬화에 쓰지 않는다(`Difficulty`와 같은 계약이다).
///
/// ⚠️ **여기서 `ThemeMode`(Flutter)를 알아서는 안 된다.** `lib/models/`는 Flutter를
/// 전혀 import하지 않는 순수 Dart 계층이다 — 모델이 위젯 계층에 묶이면 저장소·파싱
/// 테스트가 Flutter 바인딩 없이 돌지 못한다. 이 enum → `ThemeMode` 변환은 테마를
/// 실제로 적용하는 곳(`lib/app.dart`)이 한다.
enum ThemePreference {
  /// 기기 설정을 따른다(기본값).
  system('시스템'),

  light('라이트'),

  dark('다크');

  const ThemePreference(this.label);

  /// 화면에 보여줄 한글 이름.
  final String label;

  /// 알 수 없는 값을 만났을 때의 기본값.
  static const fallback = ThemePreference.system;

  /// 엄격 파싱 — 모르는 값이면 `null`.
  static ThemePreference? fromName(String? value) {
    if (value == null) return null;
    final v = value.trim().toLowerCase();
    for (final p in ThemePreference.values) {
      if (p.name == v) return p;
    }
    return null;
  }

  /// 관대한 파싱 — 모르는 값이면 [fallback](system).
  ///
  /// 저장된 사용자 문서를 읽는 경로에서 쓴다. 이 필드가 없던 구버전 문서(null)와
  /// 콘솔에서 손으로 고쳐 넣은 값(`"Dark"`, `" dark "`)이 모두 여기로 들어온다 —
  /// 테마 값이 이상하다고 앱이 죽거나 화면이 비면 안 된다.
  static ThemePreference fromNameOrDefault(String? value) =>
      fromName(value) ?? fallback;

  /// 순환 순서의 다음 값(`system` → `light` → `dark` → `system`).
  ///
  /// MY 탭 테마 타일은 별도 선택 화면 없이 **탭할 때마다 다음 값**으로 넘어간다
  /// (사용자 결정). 순서를 화면이 아니라 여기 두는 이유: 나중에 선택 시트가 붙어도
  /// 순서의 정의가 한 곳에 남는다.
  ThemePreference get next =>
      ThemePreference.values[(index + 1) % ThemePreference.values.length];
}
