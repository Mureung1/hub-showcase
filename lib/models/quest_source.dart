/// 퀘스트가 **어떻게 만들어졌는지**의 출처.
///
/// AI 도전 분해로 생겼는지(`ai`), 사용자가 직접 등록했는지(`manual`)를 구분한다.
/// 이 신호는 카드의 출처 칩(`✨AI` / `✎직접`)이 읽는다.
///
/// **왜 goalId로 대신하지 않는가:** 예전에는 "goalId가 있으면 AI"로 추론했다.
/// 그런데 직접 등록이 목표(폴더) 단위가 되면서 **직접 등록한 퀘스트도 goalId를 갖게**
/// 됐고, goalId-추론은 직접 등록을 AI로 오표기하게 됐다. 출처는 goalId와 별개의
/// 사실이므로 명시적 신호로 분리한다.
///
/// 저장·전송되는 값은 enum 이름 그대로다(`ai`, `manual`).
enum QuestSource {
  /// AI 도전 분해(재분해 포함)로 생성.
  ai,

  /// 사용자가 직접 등록.
  manual;

  /// 엄격 파싱 — 모르는/없는 값이면 `null`.
  ///
  /// null을 돌려주는 것은 실패가 아니라 **"출처가 문서에 기록되지 않았다"**는 신호다.
  /// 이 필드 도입 전에 저장된 구 문서에는 값이 없으므로, 호출부([Quest.effectiveSource])가
  /// goalId 기반 하위호환 폴백을 적용한다(필드 없고 goalId 있으면 AI로 간주).
  static QuestSource? fromName(String? value) {
    if (value == null) return null;
    final v = value.trim().toLowerCase();
    for (final s in QuestSource.values) {
      if (s.name == v) return s;
    }
    return null;
  }
}
