/// 퀘스트 난이도. 보상 등급과 1:1로 대응한다.
///
/// 저장·전송되는 값은 항상 소문자 영문(`easy`/`normal`/`hard`)이다.
/// 한글 라벨은 표시용일 뿐 직렬화에 쓰지 않는다.
enum Difficulty {
  easy('쉬움'),
  normal('보통'),
  hard('어려움');

  const Difficulty(this.label);

  /// 화면에 보여줄 한글 이름.
  final String label;

  /// 알 수 없는 값을 만났을 때의 기본값.
  static const fallback = Difficulty.normal;

  /// 엄격 파싱 — 모르는 값이면 `null`.
  ///
  /// 2주차 AI 응답 검증에서 쓴다. AI가 `"매우어려움"` 같은 값을 뱉으면
  /// 조용히 normal로 바꾸는 게 아니라 **그 항목을 거부**해야 하기 때문이다.
  static Difficulty? fromName(String? value) {
    if (value == null) return null;
    final v = value.trim().toLowerCase();
    for (final d in Difficulty.values) {
      if (d.name == v) return d;
    }
    return null;
  }

  /// 관대한 파싱 — 모르는 값이면 [fallback](normal).
  ///
  /// 이미 저장된 문서를 읽을 때 쓴다. 값이 이상하다고 화면을 죽일 수는 없다.
  static Difficulty fromNameOrDefault(String? value) =>
      fromName(value) ?? fallback;
}
