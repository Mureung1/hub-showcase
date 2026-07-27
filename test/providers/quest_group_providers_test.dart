import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/goal.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_group.dart';
import 'package:one_step/models/quest_status.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

/// 오늘의 퀘스트/보관함/홈 미리보기가 `archived` 플래그로 갈리는지 못 박는다.
///
/// 필터는 화면이 아니라 provider의 몫이다(같은 `groupQuestsByGoal`을 두 화면이
/// 공유하므로). 필터가 깨지면 완료된 것이 오늘 목록에 남거나 보관함이 비는데,
/// 그 회귀를 화면 테스트보다 여기서 좁게 잡는다.
void main() {
  ProviderContainer makeContainer(
    List<Quest> quests, {
    List<Goal> goals = const [],
  }) {
    const uid = 'u';
    final userRepo = InMemoryUserRepository(seed: AppUser.initial(uid));
    final questRepo = InMemoryQuestRepository(seed: quests, users: userRepo);
    final goalRepo = InMemoryGoalRepository(seed: goals);
    addTearDown(userRepo.dispose);
    addTearDown(questRepo.dispose);
    addTearDown(goalRepo.dispose);

    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(initialUid: uid),
        ),
        userRepositoryProvider.overrideWithValue(userRepo),
        questRepositoryProvider.overrideWithValue(questRepo),
        goalRepositoryProvider.overrideWithValue(goalRepo),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  /// 파생 provider들을 살려 두고 questList의 첫 방출을 기다린다.
  Future<void> settle(ProviderContainer c) async {
    c.listen(questGroupsProvider, (_, _) {});
    c.listen(archivedGroupsProvider, (_, _) {});
    c.listen(pendingQuestsProvider, (_, _) {});
    await c.read(questListProvider.future);
    await Future<void>.delayed(Duration.zero);
  }

  Set<String> idsOf(
    ProviderContainer c,
    ProviderListenable<AsyncValue<List<QuestGroup>>> provider,
  ) {
    final groups = c.read(provider).valueOrNull!;
    return groups.expand((g) => g.quests).map((q) => q.id).toSet();
  }

  test('오늘의 퀘스트는 archived를 제외한다', () async {
    final c = makeContainer(const [
      Quest(id: 'a', title: '활성', order: 0),
      Quest(id: 'b', title: '보관', order: 1, archived: true),
    ]);
    await settle(c);

    expect(idsOf(c, questGroupsProvider), {'a'});
  });

  test('보관함은 archived만 담는다', () async {
    final c = makeContainer(const [
      Quest(id: 'a', title: '활성', order: 0),
      Quest(id: 'b', title: '보관', order: 1, archived: true),
    ]);
    await settle(c);

    expect(idsOf(c, archivedGroupsProvider), {'b'});
  });

  test('두 provider는 상호배타다 — 같은 퀘스트가 양쪽에 동시에 들지 않는다', () async {
    final c = makeContainer(const [
      Quest(id: 'a', title: '활성', order: 0),
      Quest(id: 'b', title: '보관', order: 1, archived: true),
      Quest(id: 'c', title: '보관2', order: 2, archived: true),
    ]);
    await settle(c);

    final today = idsOf(c, questGroupsProvider);
    final archived = idsOf(c, archivedGroupsProvider);
    expect(today.intersection(archived), isEmpty);
    expect(today, {'a'});
    expect(archived, {'b', 'c'});
  });

  test('홈 미리보기는 완료·보관된 것을 제외한다', () async {
    final c = makeContainer(const [
      Quest(id: 'a', title: '미완료', order: 0),
      Quest(id: 'b', title: '완료', order: 1, status: QuestStatus.done),
      Quest(id: 'c', title: '보관', order: 2, archived: true),
    ]);
    await settle(c);

    final pending = c.read(pendingQuestsProvider).valueOrNull!;
    expect(pending.map((q) => q.id).toSet(), {'a'});
  });
}
