import 'dart:async';

import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../models/difficulty.dart';
import '../../models/quest.dart';
import '../../models/quest_draft.dart';
import '../../models/quest_status.dart';
import '../quest_repository.dart';
import 'in_memory_user_repository.dart';

/// Firebase 없이 도는 퀘스트 저장소.
///
/// [failWith]를 주면 모든 호출이 그 실패를 던진다 —
/// "네트워크 오류 시 오류 화면이 뜨는가" 같은 테스트가 한 줄로 끝난다:
///
/// ```dart
/// InMemoryQuestRepository(failWith: const NetworkFailure())
/// ```
class InMemoryQuestRepository implements QuestRepository {
  InMemoryQuestRepository({
    this.failWith,
    List<Quest> seed = const [],
    this.users,
  }) {
    for (final quest in seed) {
      _quests.putIfAbsent(quest.id, () => quest);
    }
  }

  final AppFailure? failWith;

  /// 보상을 적립할 사용자 저장소. **선택적이다.**
  ///
  /// [completeQuest]는 사용자 문서(coin·xp)까지 건드려야 하는데, 이미 이 저장소를
  /// 단독으로 생성하는 코드가 여럿 있다(기존 테스트 등). 필수 인자로 만들면 전부
  /// 깨지므로 선택 주입으로 뒀다.
  ///
  /// 주입하지 않으면 **잔액 적립만 생략**하고 [Reward] 계산·반환과 중복 지급 차단은
  /// 그대로 동작한다. 보상 규칙(난이도별 금액·재지급 금지)만 검증하는 테스트는
  /// 사용자 저장소 없이도 쓸 수 있고, 잔액까지 보려면 주입하면 된다.
  final InMemoryUserRepository? users;

  final Map<String, Quest> _quests = {};
  final _controller = StreamController<void>.broadcast();
  int _seq = 0;

  void _check() {
    if (failWith != null) throw failWith!;
  }

  List<Quest> get _sorted {
    final list = _quests.values.toList()
      ..sort((a, b) {
        final byOrder = a.order.compareTo(b.order);
        if (byOrder != 0) return byOrder;
        final at = a.createdAt;
        final bt = b.createdAt;
        if (at == null || bt == null) return 0;
        return at.compareTo(bt);
      });
    return List.unmodifiable(list);
  }

  @override
  Stream<List<Quest>> watchQuests(String uid) async* {
    _check();
    yield _sorted;
    await for (final _ in _controller.stream) {
      yield _sorted;
    }
  }

  @override
  Future<List<Quest>> fetchQuests(String uid) async {
    _check();
    return _sorted;
  }

  @override
  Future<Quest> createQuest(
    String uid, {
    required String title,
    required Difficulty difficulty,
    DateTime? deadline,
  }) async {
    _check();
    final quest = Quest(
      id: 'mem-${++_seq}',
      title: title.trim(),
      difficulty: difficulty,
      deadline: deadline,
      order: _quests.length,
      createdAt: DateTime.now(),
    );
    _quests[quest.id] = quest;
    _controller.add(null);
    return quest;
  }

  @override
  Future<List<Quest>> createQuests(
    String uid,
    List<QuestDraft> drafts, {
    String? goalId,
  }) async {
    _check();
    if (drafts.isEmpty) return const [];

    // 기존 퀘스트 뒤에 이어 붙인다 (Firestore 구현과 동일한 계약).
    final offset = _quests.length;

    // 원자성: 전부 스테이징한 뒤 한 번에 반영한다.
    final staged = <String, Quest>{};
    final created = <Quest>[];

    for (var i = 0; i < drafts.length; i++) {
      final quest = drafts[i].toQuest(
        id: 'mem-${++_seq}',
        goalId: goalId,
        order: offset + i,
      );
      staged[quest.id] = quest;
      created.add(quest);
    }

    _quests.addAll(staged);
    _controller.add(null);
    return created;
  }

  @override
  Future<void> updateQuest(String uid, Quest quest) async {
    _check();
    if (!_quests.containsKey(quest.id)) throw const NotFoundFailure();
    _quests[quest.id] = quest;
    _controller.add(null);
  }

  @override
  Future<void> deleteQuest(String uid, String questId) async {
    _check();
    _quests.remove(questId);
    _controller.add(null);
  }

  @override
  Future<void> setStatus(String uid, String questId, QuestStatus status) async {
    _check();
    final quest = _quests[questId];
    if (quest == null) throw const NotFoundFailure();
    // withStatus가 완료 해제 시 completedAt까지 지운다.
    _quests[questId] = quest.withStatus(status);
    _controller.add(null);
  }

  /// Firestore 트랜잭션과 **같은 의미**의 완료+지급.
  ///
  /// 여기선 단일 스레드 + await 없는 상태 변경이라 별도 잠금 없이도 원자적이다.
  /// 중요한 건 판단 근거를 Firestore 구현과 똑같이 맞추는 것이다 —
  /// 지급 여부는 상태도 완료 시각도 아닌 **`rewardedAt`이 null인가**로만 결정한다.
  @override
  Future<Reward?> completeQuest(String uid, String questId) async {
    _check();
    final quest = _quests[questId];
    if (quest == null) throw const NotFoundFailure();

    // 이미 지급 시각이 있으면 예전에 보상을 받은 퀘스트다(재지급 금지).
    // ⚠️ 하위호환: rewardedAt 도입 전 문서는 null이라 한 번 더 지급될 수 있다.
    final alreadyPaid = quest.isRewarded;

    // withStatus는 rewardedAt을 항상 보존한다(완료 해제해도 지급 이력은 남는다).
    final completed = quest.withStatus(QuestStatus.done);
    _quests[questId] = alreadyPaid
        ? completed
        // 최초 지급이면 지급 시각을 함께 찍는다. 이후 이 값은 절대 지워지지 않는다.
        : completed.copyWith(rewardedAt: DateTime.now());
    _controller.add(null);

    if (alreadyPaid) return null;

    final reward = rewardFor(quest.difficulty);

    final userRepo = users;
    if (userRepo != null) {
      final current = await userRepo.fetchUser(uid);
      userRepo.put(
        current.copyWith(
          coin: current.coin + reward.coin,
          xp: current.xp + reward.xp,
        ),
      );
    }

    return reward;
  }

  void dispose() => _controller.close();
}
