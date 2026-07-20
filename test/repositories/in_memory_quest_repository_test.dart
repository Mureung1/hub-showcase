import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/models/quest_status.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

void main() {
  group('InMemoryQuestRepository', () {
    test('등록하면 목록 스트림이 갱신된다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      // 빈 목록 → 등록 후 1개 목록 순으로 흘러야 한다.
      unawaited(
        expectLater(
          repo.watchQuests('u'),
          emitsInOrder([
            isEmpty,
            predicate<List<Quest>>(
              (list) =>
                  list.length == 1 &&
                  list.single.title == '공모전 공고 찾기' &&
                  list.single.difficulty == Difficulty.easy,
              '등록한 퀘스트 1개를 담은 목록',
            ),
          ]),
        ),
      );

      // 구독이 자리잡고 첫 방출이 전달될 시간을 준다.
      await Future<void>.delayed(Duration.zero);

      await repo.createQuest(
        'u',
        title: '공모전 공고 찾기',
        difficulty: Difficulty.easy,
      );
      await Future<void>.delayed(Duration.zero);
    });

    test('삭제하면 목록에서 사라진다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: '삭제될 퀘스트',
        difficulty: Difficulty.normal,
      );
      expect(await repo.fetchQuests('u'), hasLength(1));

      await repo.deleteQuest('u', quest.id);

      expect(await repo.fetchQuests('u'), isEmpty);
    });

    test('완료 처리 시 done과 완료 시각이 기록된다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: '완료할 퀘스트',
        difficulty: Difficulty.hard,
      );

      await repo.setStatus('u', quest.id, QuestStatus.done);

      final updated = (await repo.fetchQuests('u')).single;
      expect(updated.done, isTrue);
      expect(updated.completedAt, isNotNull);
    });

    test('완료를 해제하면 완료 시각이 지워진다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.easy,
      );
      await repo.setStatus('u', quest.id, QuestStatus.done);
      await repo.setStatus('u', quest.id, QuestStatus.todo);

      final updated = (await repo.fetchQuests('u')).single;
      expect(updated.done, isFalse);
      expect(updated.completedAt, isNull);
    });

    test('멈춤 상태를 저장하고 다시 읽을 수 있다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: '막힌 퀘스트',
        difficulty: Difficulty.hard,
      );

      await repo.setStatus('u', quest.id, QuestStatus.stuck);

      final updated = (await repo.fetchQuests('u')).single;
      expect(updated.status, QuestStatus.stuck);
      expect(updated.isStuck, isTrue);
      expect(updated.done, isFalse);
    });

    test('목록은 order 순으로 정렬된다', () async {
      final repo = InMemoryQuestRepository(
        seed: const [
          Quest(id: 'b', title: '두 번째', order: 1),
          Quest(id: 'a', title: '첫 번째', order: 0),
          Quest(id: 'c', title: '세 번째', order: 2),
        ],
      );
      addTearDown(repo.dispose);

      final quests = await repo.fetchQuests('u');

      expect(quests.map((q) => q.title), ['첫 번째', '두 번째', '세 번째']);
    });

    test('없는 퀘스트를 수정하면 NotFoundFailure', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      expect(
        () => repo.setStatus('u', '없는id', QuestStatus.done),
        throwsA(isA<NotFoundFailure>()),
      );
    });
  });

  group('completeQuest — 완료 + 트랜잭션 보상 지급 (3주차 핵심 보상 루프)', () {
    /// 퀘스트 저장소와 사용자 저장소를 배선해 함께 돌려준다.
    /// 완료는 두 문서를 동시에 바꾸므로 둘을 같이 봐야 검증이 된다.
    (InMemoryQuestRepository, InMemoryUserRepository) makeRepos() {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final quests = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(quests.dispose);
      return (quests, users);
    }

    test('쉬움을 완료하면 코인 3 · XP 5가 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: '공고 3개 찾기',
        difficulty: Difficulty.easy,
      );

      final reward = await repo.completeQuest('u', quest.id);

      expect(reward, const Reward(coin: 3, xp: 5));
      final user = await users.fetchUser('u');
      expect(user.coin, 3);
      expect(user.xp, 5);
    });

    test('보통을 완료하면 코인 5 · XP 10이 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.normal,
      );

      final reward = await repo.completeQuest('u', quest.id);

      expect(reward, const Reward(coin: 5, xp: 10));
      final user = await users.fetchUser('u');
      expect(user.coin, 5);
      expect(user.xp, 10);
    });

    test('어려움을 완료하면 코인 10 · XP 20이 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      final reward = await repo.completeQuest('u', quest.id);

      expect(reward, const Reward(coin: 10, xp: 20));
      final user = await users.fetchUser('u');
      expect(user.coin, 10);
      expect(user.xp, 20);
    });

    test('완료하면 status=done + completedAt이 기록된다', () async {
      final (repo, _) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.easy,
      );

      await repo.completeQuest('u', quest.id);

      final updated = (await repo.fetchQuests('u')).single;
      expect(updated.status, QuestStatus.done);
      expect(updated.done, isTrue);
      // completedAt은 지급 여부를 판단하는 근거이므로 반드시 남아야 한다.
      expect(updated.completedAt, isNotNull);
    });

    test('기존 잔액 위에 누적된다 (덮어쓰지 않는다)', () async {
      final users = InMemoryUserRepository(
        seed: const AppUser(uid: 'u', coin: 100, xp: 40),
      );
      final repo = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.normal,
      );
      await repo.completeQuest('u', quest.id);

      final user = await users.fetchUser('u');
      expect(user.coin, 105);
      expect(user.xp, 50);
    });

    test('여러 퀘스트를 완료하면 보상이 합산된다', () async {
      final (repo, users) = makeRepos();
      final easy = await repo.createQuest(
        'u',
        title: 'e',
        difficulty: Difficulty.easy,
      );
      final hard = await repo.createQuest(
        'u',
        title: 'h',
        difficulty: Difficulty.hard,
      );

      await repo.completeQuest('u', easy.id);
      await repo.completeQuest('u', hard.id);

      final user = await users.fetchUser('u');
      expect(user.coin, 13); // 3 + 10
      expect(user.xp, 25); // 5 + 20
    });

    test('★ 같은 퀘스트를 두 번 완료해도 보상은 한 번만 지급된다', () async {
      // 중복 지급 차단. 이게 뚫리면 체크를 껐다 켰다 하며 코인을 무한 파밍할 수 있다.
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      final first = await repo.completeQuest('u', quest.id);
      final second = await repo.completeQuest('u', quest.id);

      expect(first, const Reward(coin: 10, xp: 20));
      // 두 번째는 "이번에 지급한 보상 없음" = null.
      expect(second, isNull);

      final user = await users.fetchUser('u');
      expect(user.coin, 10, reason: '재증가하면 안 된다');
      expect(user.xp, 20, reason: '재증가하면 안 된다');
    });

    test('★ 완료 → 해제 → 재완료해도 재지급되지 않는다 (파밍 차단)', () async {
      // 재지급 차단선은 `completedAt`이 아니라 `rewardedAt`이다.
      // completedAt은 "언제 완료했나"라 완료 해제 시 지워지므로, 여기에 보상을
      // 묶으면 체크를 껐다 켜는 것만으로 코인을 무한히 벌 수 있다.
      // rewardedAt은 한번 찍히면 어떤 상태 전이에서도 지워지지 않는다.
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.easy,
      );

      await repo.completeQuest('u', quest.id);
      expect((await users.fetchUser('u')).coin, 3);
      final firstRewardedAt = (await repo.fetchQuests('u')).single.rewardedAt;
      expect(firstRewardedAt, isNotNull);

      // 완료 해제 → 완료 시각은 지워지지만 지급 이력은 남는다.
      await repo.setStatus('u', quest.id, QuestStatus.todo);
      final released = (await repo.fetchQuests('u')).single;
      expect(released.completedAt, isNull, reason: '완료 시각은 지워진다');
      expect(released.rewardedAt, firstRewardedAt, reason: '지급 이력은 남는다');

      // 다시 완료 → 상태는 done이 되지만 보상은 없다.
      final again = await repo.completeQuest('u', quest.id);

      expect(again, isNull, reason: '이번엔 지급된 보상이 없다');
      final user = await users.fetchUser('u');
      expect(user.coin, 3, reason: '재증가하면 안 된다');
      expect(user.xp, 5, reason: '재증가하면 안 된다');

      final refinished = (await repo.fetchQuests('u')).single;
      expect(refinished.done, isTrue);
      // completedAt은 "언제 완료했나"라 다시 찍히고, rewardedAt은 최초 값 그대로다.
      expect(refinished.completedAt, isNotNull);
      expect(refinished.rewardedAt, firstRewardedAt);
    });

    test('완료하면 rewardedAt이 기록된다 (지급의 유일한 근거)', () async {
      final (repo, _) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.normal,
      );

      expect((await repo.fetchQuests('u')).single.isRewarded, isFalse);

      await repo.completeQuest('u', quest.id);

      final updated = (await repo.fetchQuests('u')).single;
      expect(updated.isRewarded, isTrue);
      expect(updated.rewardedAt, isNotNull);
    });

    test('rewardedAt이 이미 있는 퀘스트는 처음 완료해도 지급되지 않는다', () async {
      // 예: 다른 기기에서 이미 지급된 뒤 동기화된 문서.
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final repo = InMemoryQuestRepository(
        seed: [
          Quest(
            id: 'q1',
            title: '이미 지급된 퀘스트',
            difficulty: Difficulty.hard,
            rewardedAt: DateTime(2026, 1, 1),
          ),
        ],
        users: users,
      );
      addTearDown(users.dispose);
      addTearDown(repo.dispose);

      expect(await repo.completeQuest('u', 'q1'), isNull);
      expect((await users.fetchUser('u')).coin, 0);
    });

    test('없는 퀘스트를 완료하면 NotFoundFailure', () async {
      final (repo, _) = makeRepos();

      expect(
        () => repo.completeQuest('u', '없는id'),
        throwsA(isA<NotFoundFailure>()),
      );
    });

    test('저장소가 실패하면 AppFailure를 던지고 잔액은 그대로다', () async {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final repo = InMemoryQuestRepository(
        seed: const [Quest(id: 'q1', title: 'x', difficulty: Difficulty.hard)],
        failWith: const NetworkFailure(),
        users: users,
      );
      addTearDown(users.dispose);
      addTearDown(repo.dispose);

      await expectLater(
        repo.completeQuest('u', 'q1'),
        throwsA(isA<NetworkFailure>()),
      );

      // 트랜잭션이 커밋되지 않았으므로 잔액은 건드려지지 않는다.
      final user = await users.fetchUser('u');
      expect(user.coin, 0);
      expect(user.xp, 0);
    });

    test('사용자 저장소를 주입하지 않아도 보상 계산·중복 차단은 동작한다', () async {
      // users는 선택 주입이다. 없으면 잔액 적립만 생략된다(하위호환).
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.normal,
      );

      expect(await repo.completeQuest('u', quest.id), const Reward(coin: 5, xp: 10));
      expect(await repo.completeQuest('u', quest.id), isNull);
    });
  });

  group('메모 인증 보너스 + 성취 기록 (3주차-B)', () {
    (InMemoryQuestRepository, InMemoryUserRepository) makeRepos() {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final quests = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(quests.dispose);
      return (quests, users);
    }

    Future<Quest> seedNormal(InMemoryQuestRepository repo) =>
        repo.createQuest('u', title: '지원서 초안 쓰기', difficulty: Difficulty.normal);

    test('★ 메모가 있으면 기본 보상 + 인증 보너스가 합산 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      final reward = await repo.completeQuest('u', quest.id, memo: '초안 1장 썼다');

      // 보통(5/10) + 보너스(3/3) = 8/13.
      expect(reward, const Reward(coin: 8, xp: 13));
      final user = await users.fetchUser('u');
      expect(user.coin, 8);
      expect(user.xp, 13);
    });

    test('메모가 없으면 기본 보상만 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      final reward = await repo.completeQuest('u', quest.id);

      expect(reward, const Reward(coin: 5, xp: 10));
      expect((await users.fetchUser('u')).coin, 5);
    });

    test('★ 공백만 있는 메모는 인증으로 치지 않는다', () async {
      // 스페이스 몇 개로 보너스를 받을 수 있으면 인증의 의미가 사라진다.
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      final reward = await repo.completeQuest('u', quest.id, memo: '   ');

      expect(reward, const Reward(coin: 5, xp: 10));
      expect((await users.fetchUser('u')).coin, 5);

      final saved = (await repo.fetchQuests('u')).single;
      expect(saved.memo, isNull, reason: '공백은 저장되지 않고 null로 정규화된다');
      expect(repo.achievementsOf('u').single.verified, isFalse);
    });

    test('메모는 퀘스트 문서에 저장되고 앞뒤 공백이 정리된다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.completeQuest('u', quest.id, memo: '  카페에서 2시간  ');

      expect((await repo.fetchQuests('u')).single.memo, '카페에서 2시간');
    });

    test('★ 완료를 해제해도 남긴 메모는 지워지지 않는다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);
      await repo.completeQuest('u', quest.id, memo: '기록해 둔 글');

      await repo.setStatus('u', quest.id, QuestStatus.todo);

      final saved = (await repo.fetchQuests('u')).single;
      expect(saved.done, isFalse);
      expect(saved.memo, '기록해 둔 글');
    });

    test('★ 성취 기록이 1건 생성되고 필드가 정확하다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.completeQuest('u', quest.id, memo: '초안 1장 썼다');

      final records = repo.achievementsOf('u');
      expect(records, hasLength(1));

      final record = records.single;
      expect(record.questId, quest.id);
      // 제목은 그 시점 스냅샷이라 퀘스트가 지워져도 남는다.
      expect(record.questTitle, '지원서 초안 쓰기');
      // 기록의 금액은 **실제 지급액**(보너스 포함)이라야 잔액과 합계가 맞는다.
      expect(record.coin, 8);
      expect(record.xp, 13);
      expect(record.memo, '초안 1장 썼다');
      expect(record.verified, isTrue);
      expect(record.completedAt, isNotNull);
    });

    test('메모 없이 완료해도 기록은 남는다 (verified=false)', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.completeQuest('u', quest.id);

      final record = repo.achievementsOf('u').single;
      expect(record.verified, isFalse);
      expect(record.memo, isNull);
      expect(record.coin, 5);
    });

    test('★ 재완료해도 보너스가 재지급되지 않고 기록도 늘지 않는다', () async {
      // 파밍 시나리오: 메모 없이 완료 → 해제 → 메모를 붙여 재완료.
      // rewardedAt 가드가 보너스까지 함께 막아야 한다.
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.completeQuest('u', quest.id);
      await repo.setStatus('u', quest.id, QuestStatus.todo);
      final second = await repo.completeQuest('u', quest.id, memo: '이제 와서 인증');

      expect(second, isNull, reason: '이미 지급된 퀘스트는 아무것도 주지 않는다');
      final user = await users.fetchUser('u');
      expect(user.coin, 5, reason: '보너스 3이 추가로 붙으면 안 된다');
      expect(user.xp, 10);

      // 기록 = 지급 횟수. 재완료로 기록이 늘면 보관함·지표가 부풀려진다.
      expect(repo.achievementsOf('u'), hasLength(1));
      expect(repo.achievementsOf('u').single.verified, isFalse);
    });

    test('같은 메모로 여러 번 완료해도 기록은 1건이다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.completeQuest('u', quest.id, memo: '했다');
      await repo.completeQuest('u', quest.id, memo: '했다');
      await repo.completeQuest('u', quest.id, memo: '했다');

      expect(repo.achievementsOf('u'), hasLength(1));
    });

    test('기록은 사용자별로 분리된다', () async {
      final (repo, _) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.easy,
      );

      await repo.completeQuest('u', quest.id, memo: '완료');

      expect(repo.achievementsOf('u'), hasLength(1));
      expect(repo.achievementsOf('다른uid'), isEmpty);
    });
  });

  group('createQuests — AI 분해 결과 일괄 등록', () {
    test('★ 기존 퀘스트 뒤에 이어 붙는다 (order가 겹치지 않는다)', () async {
      // 이 오프셋이 없으면 AI가 뱉은 order 0,1,2가 기존 퀘스트의 0,1,2와 겹쳐
      // 목록 순서가 뒤엉킨다. 마이크로 퀘스트는 순서가 곧 실행 경로다.
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      // 기존 퀘스트 2개
      await repo.createQuest('u', title: '기존1', difficulty: Difficulty.easy);
      await repo.createQuest('u', title: '기존2', difficulty: Difficulty.easy);

      // AI 분해 결과 3개 (draft의 order는 0,1,2)
      final created = await repo.createQuests('u', const [
        QuestDraft(
          localId: 'd0',
          title: 'AI1',
          difficulty: Difficulty.easy,
          order: 0,
        ),
        QuestDraft(
          localId: 'd1',
          title: 'AI2',
          difficulty: Difficulty.normal,
          order: 1,
        ),
        QuestDraft(
          localId: 'd2',
          title: 'AI3',
          difficulty: Difficulty.hard,
          order: 2,
        ),
      ], goalId: 'goal-1');

      // 2,3,4로 밀려야 한다.
      expect(created.map((q) => q.order), [2, 3, 4]);

      final all = await repo.fetchQuests('u');
      expect(all.map((q) => q.title), ['기존1', '기존2', 'AI1', 'AI2', 'AI3']);
      // order 중복 없음
      expect(all.map((q) => q.order).toSet(), hasLength(5));
    });

    test('등록된 퀘스트가 goalId로 원본 목표와 연결된다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final created = await repo.createQuests('u', const [
        QuestDraft(localId: 'd0', title: 'x', difficulty: Difficulty.easy),
      ], goalId: 'goal-42');

      expect(created.single.goalId, 'goal-42');
      expect(created.single.status, QuestStatus.todo);
    });

    test('빈 목록을 등록하면 아무 일도 일어나지 않는다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final created = await repo.createQuests('u', const []);

      expect(created, isEmpty);
      expect(await repo.fetchQuests('u'), isEmpty);
    });

    test('실패 시 아무것도 저장되지 않는다 (원자성)', () async {
      final repo = InMemoryQuestRepository(failWith: const NetworkFailure());
      addTearDown(repo.dispose);

      expect(
        () => repo.createQuests('u', const [
          QuestDraft(localId: 'd0', title: 'x', difficulty: Difficulty.easy),
        ]),
        throwsA(isA<NetworkFailure>()),
      );
    });
  });

  group('실패 주입 — 2·3주차 실패 경로 테스트의 토대', () {
    test('failWith를 주면 조회가 AppFailure를 던진다', () async {
      final repo = InMemoryQuestRepository(failWith: const NetworkFailure());
      addTearDown(repo.dispose);

      expect(
        () => repo.fetchQuests('u'),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('failWith를 주면 등록도 AppFailure를 던진다', () async {
      final repo = InMemoryQuestRepository(failWith: const PermissionFailure());
      addTearDown(repo.dispose);

      expect(
        () => repo.createQuest('u', title: 'x', difficulty: Difficulty.easy),
        throwsA(isA<PermissionFailure>()),
      );
    });

    test('AppFailure 메시지는 그대로 사용자에게 보여줄 수 있다', () {
      expect(const NetworkFailure().message, '인터넷 연결을 확인해 주세요.');
    });
  });

  group('InMemoryUserRepository', () {
    test('ensureUser는 신규 사용자를 기본값으로 만든다', () async {
      final repo = InMemoryUserRepository();
      addTearDown(repo.dispose);

      final user = await repo.ensureUser('uid-1');

      expect(user.level, 1);
      expect(user.xp, 0);
      expect(user.coin, 0);
      expect(user.createdAt, isNotNull);
    });

    test('ensureUser를 두 번 불러도 기존 문서를 덮어쓰지 않는다 (멱등)', () async {
      final repo = InMemoryUserRepository();
      addTearDown(repo.dispose);

      final first = await repo.ensureUser('uid-1');
      repo.put(first.copyWith(coin: 999));

      final second = await repo.ensureUser('uid-1');

      expect(second.coin, 999);
    });

    test('문서가 없어도 watchUser는 기본값을 흘린다', () async {
      final repo = InMemoryUserRepository();
      addTearDown(repo.dispose);

      final user = await repo.watchUser('uid-new').first;

      expect(user.level, 1);
      expect(user.coin, 0);
    });
  });
}
