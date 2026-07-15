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
}
