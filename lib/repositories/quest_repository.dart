import '../core/constants/reward_rules.dart';
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
  /// ⚠️ 상태만 바꾼다. 보상을 주고 싶으면 [completeQuest]를 써라
  /// (중복 완료 시 재지급 금지 요건 때문에 여기서 지급하면 안 된다).
  Future<void> setStatus(String uid, String questId, QuestStatus status);

  /// 완료 처리 + 보상 지급을 **한 트랜잭션으로** 수행한다 (3주차).
  ///
  /// 완료는 문서 두 개를 건드린다 — 퀘스트(`status`·`completedAt`·`rewardedAt`)와
  /// 사용자(`coin`·`xp`). 둘을 한 트랜잭션에 묶어야 "퀘스트는 완료됐는데 코인은
  /// 안 들어온" 부분 반영이 생기지 않는다.
  ///
  /// **재지급은 영구히 막는다.** 보상 지급 여부의 근거는 상태도, `completedAt`도
  /// 아니라 [Quest.rewardedAt]이다 — `rewardedAt`이 null일 때만 지급한다.
  /// `completedAt`은 "언제 완료했나"라 완료를 해제하면 지워지지만(그래서 가드로
  /// 쓸 수 없다), `rewardedAt`은 한번 찍히면 절대 지워지지 않는다. 덕분에 상태가
  /// done ↔ todo로 얼마든지 토글돼도 보상은 퀘스트당 **평생 1회**다
  /// (체크를 껐다 켰다 반복하는 코인 파밍 차단).
  ///
  /// 반환: 이번 호출에서 **실제로 지급한** [Reward].
  /// 이미 지급된 적 있으면 `null`(상태는 done으로 맞추되 보상은 주지 않는다).
  ///
  /// 퀘스트 문서가 없으면 `NotFoundFailure`, 그 밖의 실패는 다른 메서드와
  /// 동일하게 `AppFailure`로 정규화해 던진다.
  ///
  /// ⚠️ 레벨업 계산은 여기서 하지 않는다(4주차 경계). 잔액만 누적한다.
  Future<Reward?> completeQuest(String uid, String questId);
}
