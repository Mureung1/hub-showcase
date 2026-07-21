import '../models/goal.dart';

/// 사용자가 입력한 **큰 목표** 저장·조회 (`users/{uid}/goals/{goalId}`).
///
/// 왜 목표를 별도 문서로 저장하나:
/// 개별 항목 **재분해** 프롬프트에 원본 목표 맥락이 필수다 —
/// "공모전 지원하기"라는 맥락 없이 "지원서 초안 쓰기"만 AI에 던지면 엉뚱한 결과가 나온다.
/// 퀘스트의 `goalId`가 이 문서를 가리켜 원본 텍스트를 다시 읽는다.
///
/// 구현체는 실패 시 반드시 `AppFailure`를 던진다.
abstract interface class GoalRepository {
  /// 목표 목록 스트림. 퀘스트 목록의 **폴더 라벨**을 그리는 데 쓴다.
  ///
  /// 단건 [fetchGoal]과 나눈 이유: 목록 화면은 화면에 뜬 퀘스트마다 goalId가 달라
  /// 단건 조회를 N번 하면 왕복이 N번 난다. 목표는 사용자당 많아야 수십 개라
  /// 컬렉션을 통째로 구독하는 편이 싸고, 목표 이름이 바뀌어도 즉시 반영된다.
  ///
  /// 문서 하나가 깨져 있어도 스트림 전체를 죽이지 않고 그 항목만 버린다
  /// (`watchQuests`와 같은 규칙 — 목표 하나 때문에 목록이 통째로 사라지면 안 된다).
  Stream<List<Goal>> watchGoals(String uid);

  /// 목표를 저장하고, 생성된(ID가 부여된) Goal을 돌려준다.
  /// 실패 시 `AppFailure`를 던진다.
  Future<Goal> createGoal(String uid, String text);

  /// 목표 하나 조회. 없으면 `NotFoundFailure`.
  /// (개별 항목 재분해 시 원본 목표 텍스트를 다시 읽는 데 쓴다.)
  Future<Goal> fetchGoal(String uid, String goalId);
}
