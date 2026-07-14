import '../models/difficulty.dart';
import '../models/quest.dart';
import '../models/quest_draft.dart';
import '../models/quest_status.dart';

/// 퀘스트 CRUD.
///
/// 구현체는 실패 시 반드시 `AppFailure`를 던진다.
/// 목록 조회는 문서 하나가 깨져 있어도 스트림 전체를 죽이지 않고 그 항목만 버린다.
abstract interface class QuestRepository {
  /// 퀘스트 목록 스트림. `order` → `createdAt` 순으로 정렬된다.
  Stream<List<Quest>> watchQuests(String uid);

  Future<List<Quest>> fetchQuests(String uid);

  /// 퀘스트 하나 등록. 생성된(ID가 부여된) 퀘스트를 돌려준다.
  Future<Quest> createQuest(
    String uid, {
    required String title,
    required Difficulty difficulty,
    DateTime? deadline,
  });

  /// AI 분해 결과 일괄 등록 (2주차).
  ///
  /// 두 가지를 보장한다:
  /// - **원자성**: 전부 저장되거나 전부 실패한다. 부분 저장으로 인한 불일치가 없다.
  /// - **순서**: 기존 퀘스트 뒤에 이어 붙는다(`order`에 기존 개수만큼 오프셋을 더한다).
  ///   이걸 안 하면 AI가 뱉은 0..4와 기존 퀘스트의 0..2가 겹쳐 목록 순서가 뒤엉킨다.
  ///   마이크로 퀘스트는 순서가 곧 실행 경로라 순서가 섞이면 분해의 의미가 사라진다.
  ///
  /// 저장된 퀘스트(ID 부여됨)를 순서대로 돌려준다.
  Future<List<Quest>> createQuests(
    String uid,
    List<QuestDraft> drafts, {
    String? goalId,
  });

  Future<void> updateQuest(String uid, Quest quest);

  Future<void> deleteQuest(String uid, String questId);

  /// 진행 상태 변경 (미완료 · 완료 · 멈춤).
  ///
  /// ⚠️ 상태만 바꾼다. 코인·XP 지급은 3주차에 트랜잭션 서비스가 맡는다
  /// (중복 완료 시 재지급 금지 요건 때문에 여기서 지급하면 안 된다).
  Future<void> setStatus(String uid, String questId, QuestStatus status);
}
