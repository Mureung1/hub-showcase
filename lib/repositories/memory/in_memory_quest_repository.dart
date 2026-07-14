import 'dart:async';

import '../../core/error/app_failure.dart';
import '../../models/difficulty.dart';
import '../../models/quest.dart';
import '../../models/quest_draft.dart';
import '../../models/quest_status.dart';
import '../quest_repository.dart';

/// Firebase 없이 도는 퀘스트 저장소.
///
/// [failWith]를 주면 모든 호출이 그 실패를 던진다 —
/// "네트워크 오류 시 오류 화면이 뜨는가" 같은 테스트가 한 줄로 끝난다:
///
/// ```dart
/// InMemoryQuestRepository(failWith: const NetworkFailure())
/// ```
class InMemoryQuestRepository implements QuestRepository {
  InMemoryQuestRepository({this.failWith, List<Quest> seed = const []}) {
    for (final quest in seed) {
      _quests.putIfAbsent(quest.id, () => quest);
    }
  }

  final AppFailure? failWith;

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

  void dispose() => _controller.close();
}
