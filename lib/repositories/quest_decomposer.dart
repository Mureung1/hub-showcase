import '../models/quest_draft.dart';

/// 큰 목표를 마이크로 퀘스트 초안으로 분해한다.
/// 1주차 QuestRepository와 같은 패턴: 추상 + Fake/Remote 2구현.
abstract interface class QuestDecomposer {
  /// 목표 텍스트를 받아 마이크로 퀘스트 초안 리스트를 돌려준다.
  /// 실패 시 AppFailure를 던진다(Network/Parse/Unknown).
  ///
  /// 템플릿 폴백은 여기서 하지 않는다 — 이 클래스는 AI 호출만 담당하고,
  /// "실패 시 무엇으로 대체하나"는 상위(다음 커밋의 DecomposeNotifier)가 정한다.
  Future<List<QuestDraft>> decompose(String goal);

  /// 개별 항목 재분해 — 초안 하나를 더 작은 하위 퀘스트들로 다시 나눈다.
  ///
  /// [decompose]와 정책은 같다(성공 시 초안 리스트, 실패 시 AppFailure). 다른 점은
  /// **입력이 목표 전체가 아니라 항목 하나**라는 것. 원본 목표([goalText]) 맥락과
  /// 대상 항목([item])을 함께 받는다 — 실제 LLM이 "지원서 초안"만 보고 맥락 없이
  /// 엉뚱하게 쪼개는 걸 막기 위해서다(goal_repository.dart 주석의 존재 이유와 같은 취지).
  ///
  /// "실패 시 원본 항목 보존"·"교체·재번호" 정책은 여기서 하지 않고 상위
  /// (DecomposeNotifier.redecomposeOne)가 정한다.
  Future<List<QuestDraft>> redecompose({
    required String goalText,
    required QuestDraft item,
  });
}
