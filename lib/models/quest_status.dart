/// 퀘스트 진행 상태.
///
/// `docs/plan.md` 기능 A가 **명시적으로 3상태**를 요구한다:
/// > "각 퀘스트의 진행 상태(완료·미완료·**멈춤**)를 영속 저장해,
/// >  앱을 다시 열어도 어디까지 했고 **어디서 멈췄는지** 기억한다."
///
/// `bool done`(2상태)으로는 이걸 담을 수 없다. 그리고 이건 미관 문제가 아니다 —
/// 핵심 성공 지표 「**재분해 복귀율**: 멈춘 퀘스트를 더 작게 나눈 뒤 다시 실행한 비율」의
/// **분모가 [stuck] 상태다.** 이 상태가 없으면 지표를 계산할 근거 자체가 없다.
///
/// ⚠️ 상태를 **저장할 그릇**만 지금 만든다. "멈춤" 표시 UI와 멈춘 지점 재분해 흐름은
/// checklist 4주차 「멈춘 퀘스트 재분해 기능」 그대로 둔다.
enum QuestStatus {
  /// 아직 하지 않음 (기본값).
  todo,

  /// 완료.
  done,

  /// 사용자가 막혀서 멈춘 지점. 재분해 대상.
  stuck;

  /// 알 수 없는 값을 만났을 때의 기본값.
  static const fallback = QuestStatus.todo;

  /// 엄격 파싱 — 모르는 값이면 `null`.
  static QuestStatus? fromName(String? value) {
    if (value == null) return null;
    final v = value.trim().toLowerCase();
    for (final s in QuestStatus.values) {
      if (s.name == v) return s;
    }
    return null;
  }

  /// 관대한 파싱 — 모르는 값이면 [fallback](todo).
  /// 저장된 문서를 읽는 경로에서 쓴다. 값이 이상하다고 목록을 죽일 수는 없다.
  static QuestStatus fromNameOrDefault(String? value) =>
      fromName(value) ?? fallback;
}
