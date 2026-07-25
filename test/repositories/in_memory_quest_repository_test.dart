import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/constants/proof_rules.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/achievement.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/models/quest_source.dart';
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

  group('archiveQuests — 완료 = 보관함으로 이동 (2단계)', () {
    test('여러 퀘스트를 한 번에 보관하고 스트림을 1회만 방출한다 (원자성)', () async {
      final repo = InMemoryQuestRepository(
        seed: const [
          Quest(id: 'q1', title: '하나', order: 0),
          Quest(id: 'q2', title: '둘', order: 1),
          Quest(id: 'q3', title: '셋', order: 2),
        ],
      );

      final emissions = <List<Quest>>[];
      final sub = repo.watchQuests('u').listen(emissions.add);
      // 순서 중요: 컨트롤러를 먼저 닫아야 watchQuests의 `await for`가 끝나 cancel이
      // 완료된다(반대 순서면 tearDown이 영원히 기다린다 — 기존 emission 테스트와 동일).
      addTearDown(() async {
        repo.dispose();
        await sub.cancel();
      });
      await Future<void>.delayed(Duration.zero);
      expect(emissions, hasLength(1)); // 최초 목록.

      await repo.archiveQuests('u', {'q1', 'q2'});
      await Future<void>.delayed(Duration.zero);

      // ★ 한 목표를 보관할 때 "절반만 옮겨진" 중간 프레임이 없다 — 보관은 1회만 방출.
      expect(emissions, hasLength(2));
      final list = emissions.last;
      expect(list.firstWhere((q) => q.id == 'q1').archived, isTrue);
      expect(list.firstWhere((q) => q.id == 'q2').archived, isTrue);
      // 지목하지 않은 것은 그대로다.
      expect(list.firstWhere((q) => q.id == 'q3').archived, isFalse);
    });

    test('빈 집합은 아무 일도 하지 않는다 (헛방출 없음)', () async {
      final repo = InMemoryQuestRepository(
        seed: const [Quest(id: 'q1', title: 'x')],
      );

      final emissions = <List<Quest>>[];
      final sub = repo.watchQuests('u').listen(emissions.add);
      addTearDown(() async {
        repo.dispose();
        await sub.cancel();
      });
      await Future<void>.delayed(Duration.zero);
      expect(emissions, hasLength(1)); // 최초 목록.

      await repo.archiveQuests('u', const {});
      await Future<void>.delayed(Duration.zero);

      expect(emissions, hasLength(1), reason: '빈 집합은 방출하지 않는다');
    });

    test('없는 ID가 섞여도 있는 것만 보관한다 (멱등)', () async {
      final repo = InMemoryQuestRepository(
        seed: const [Quest(id: 'q1', title: 'x')],
      );
      addTearDown(repo.dispose);

      await repo.archiveQuests('u', {'q1', '없는id'});

      final quests = await repo.fetchQuests('u');
      expect(quests.single.archived, isTrue);
    });

    test('보관은 영속된다 — 다시 읽어도 archived가 유지된다', () async {
      final repo = InMemoryQuestRepository(
        seed: const [Quest(id: 'q1', title: 'x')],
      );
      addTearDown(repo.dispose);

      await repo.archiveQuests('u', {'q1'});

      // 재조회(앱 재실행 동치)에도 archived가 남는다.
      expect((await repo.fetchQuests('u')).single.archived, isTrue);
    });

    test('보관은 상태·지급 이력을 건드리지 않는다', () async {
      final repo = InMemoryQuestRepository(
        seed: [
          Quest(
            id: 'q1',
            title: 'x',
            status: QuestStatus.done,
            rewardedAt: DateTime(2026, 1, 1),
            memo: '인증 메모',
          ),
        ],
      );
      addTearDown(repo.dispose);

      await repo.archiveQuests('u', {'q1'});

      final q = (await repo.fetchQuests('u')).single;
      expect(q.archived, isTrue);
      expect(q.status, QuestStatus.done);
      expect(q.rewardedAt, DateTime(2026, 1, 1));
      expect(q.memo, '인증 메모');
    });

    test('★ 자동완료(setStatus done)는 코인·XP·성취를 건드리지 않는다 (뮤테이션 방어)', () async {
      // 재분해 원본 자동완료는 completeQuest(지급)가 아니라 setStatus여야 한다.
      // 이 경로가 지급을 타면 아래 잔액/기록 단언이 깨진다.
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final repo = InMemoryQuestRepository(
        seed: const [
          Quest(id: 'p', title: '재분해 원본', status: QuestStatus.stuck),
        ],
        users: users,
      );
      addTearDown(users.dispose);
      addTearDown(repo.dispose);

      await repo.setStatus('u', 'p', QuestStatus.done);

      final p = (await repo.fetchQuests('u')).single;
      expect(p.done, isTrue);
      // 보상은 지급되지 않는다.
      expect(p.rewardedAt, isNull);
      final user = await users.fetchUser('u');
      expect(user.coin, 0);
      expect(user.xp, 0);
      // 성취 기록도 남지 않는다.
      expect(repo.achievementsOf('u'), isEmpty);
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

      // reward는 "이번에 준 XP"(5)로 불변. user.xp는 레벨업 후 레벨 내 잔여 XP다.
      // 쉬움 5XP는 알 단계 임계(5)와 같아 정확히 Lv2로 올라가고 잔여 XP는 0.
      expect(reward!.reward, const Reward(coin: 3, xp: 5));
      final user = await users.fetchUser('u');
      expect(user.coin, 3);
      expect(user.level, 2);
      expect(user.xp, 0);
    });

    test('보통을 완료하면 코인 5 · XP 10이 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.normal,
      );

      final reward = await repo.completeQuest('u', quest.id);

      // 보통 10XP → 알 단계 5/레벨이라 Lv1에서 두 칸 올라 Lv3, 잔여 XP 0.
      expect(reward!.reward, const Reward(coin: 5, xp: 10));
      final user = await users.fetchUser('u');
      expect(user.coin, 5);
      expect(user.level, 3);
      expect(user.xp, 0);
    });

    test('어려움을 완료하면 코인 10 · XP 20이 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      final reward = await repo.completeQuest('u', quest.id);

      // 어려움 20XP → 알 단계 5/레벨이라 Lv1에서 네 칸 올라 Lv5, 잔여 XP 0.
      expect(reward!.reward, const Reward(coin: 10, xp: 20));
      final user = await users.fetchUser('u');
      expect(user.coin, 10);
      expect(user.level, 5);
      expect(user.xp, 0);
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

      // coin은 단순 누적: 100 + 5 = 105.
      // xp는 레벨업으로 소비된다: 시작 xp40 + 10 = 50을 알 단계 5/레벨로 소비하면
      // Lv1→Lv10(45 소비)까지 오르고 참새 임계 10 미만인 잔여 5가 남는다.
      final user = await users.fetchUser('u');
      expect(user.coin, 105);
      expect(user.level, 10);
      expect(user.xp, 5);
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
      // XP 25(5+20)가 순차로 들어와 알 단계 5/레벨을 다섯 칸 소비 → Lv6, 잔여 0.
      expect(user.level, 6);
      expect(user.xp, 0);
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

      expect(first!.reward, const Reward(coin: 10, xp: 20));
      // 두 번째는 "이번에 지급한 보상 없음" = null.
      expect(second, isNull);

      final user = await users.fetchUser('u');
      expect(user.coin, 10, reason: '재증가하면 안 된다');
      // 어려움 20XP는 알 단계에서 Lv5로 올라 잔여 XP 0. 재완료로도 불변.
      expect(user.level, 5, reason: '재증가하면 안 된다');
      expect(user.xp, 0, reason: '재증가하면 안 된다');
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
      // 쉬움 5XP는 알 단계 임계와 같아 Lv2 잔여 XP 0. 재완료로도 불변.
      expect(user.level, 2, reason: '재증가하면 안 된다');
      expect(user.xp, 0, reason: '재증가하면 안 된다');

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

      expect(
        (await repo.completeQuest('u', quest.id))!.reward,
        const Reward(coin: 5, xp: 10),
      );
      expect(await repo.completeQuest('u', quest.id), isNull);
    });
  });

  group('completeQuest — 받은 XP가 레벨업으로 반영된다 (4주차 캐릭터 성장)', () {
    (InMemoryQuestRepository, InMemoryUserRepository) makeRepos({AppUser? seed}) {
      final users = InMemoryUserRepository(seed: seed ?? AppUser.initial('u'));
      final quests = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(quests.dispose);
      return (quests, users);
    }

    test('★ 어려움(20XP) 완료 시 알 단계(5/레벨)에서 여러 레벨이 오른다', () async {
      // Lv1 xp0 + 20 = 5씩 4번 → Lv5, 레벨 내 XP 0.
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      await repo.completeQuest('u', quest.id);

      final user = await users.fetchUser('u');
      expect(user.level, 5);
      expect(user.xp, 0);
      expect(user.coin, 10);
      expect(user.stage.name, '알');
    });

    test('임계 미만 XP는 레벨을 올리지 않고 XP만 쌓는다', () async {
      // 쉬움 5XP지만 알 단계 임계도 5라 정확히 Lv2가 되는 대신,
      // 여기선 보통(10XP)을 써서 Lv3 xp0 확인. Lv1 xp0 + 10 = 5*2 → Lv3.
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.normal,
      );

      await repo.completeQuest('u', quest.id);

      final user = await users.fetchUser('u');
      expect(user.level, 3);
      expect(user.xp, 0);
    });

    test('진화 경계: 참새 진입 후 남은 XP가 새 임계(10) 기준으로 이월된다', () async {
      // Lv9 xp3에서 시작. 어려움 20XP → 3+20=23.
      // 알 임계 5: (5-3)=2 소비해 Lv10(참새), 남은 18.
      // 참새 임계 10: 10 소비해 Lv11, 남은 8 (8<10이라 정지).
      final (repo, users) = makeRepos(
        seed: const AppUser(uid: 'u', level: 9, xp: 3),
      );
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      await repo.completeQuest('u', quest.id);

      final user = await users.fetchUser('u');
      expect(user.level, 11);
      expect(user.xp, 8);
      expect(user.stage.name, '참새');
    });

    test('★ 재완료해도 레벨·XP가 다시 오르지 않는다 (rewardedAt 가드)', () async {
      final (repo, users) = makeRepos();
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      await repo.completeQuest('u', quest.id);
      await repo.setStatus('u', quest.id, QuestStatus.todo);
      final again = await repo.completeQuest('u', quest.id);

      expect(again, isNull);
      final user = await users.fetchUser('u');
      expect(user.level, 5, reason: '재완료로 레벨이 더 오르면 안 된다');
      expect(user.xp, 0);
      expect(user.coin, 10);
    });

    test('MAX(Lv50) 사용자는 완료해도 레벨·XP가 오르지 않고 코인만 쌓인다', () async {
      final (repo, users) = makeRepos(
        seed: const AppUser(uid: 'u', level: kMaxLevel, xp: 0, coin: 200),
      );
      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      await repo.completeQuest('u', quest.id);

      final user = await users.fetchUser('u');
      expect(user.level, kMaxLevel);
      expect(user.xp, 0);
      expect(user.coin, 210, reason: '코인은 계속 쌓인다');
      expect(user.canRebirth, isTrue);
    });
  });

  group('completeQuest — CompleteResult가 레벨업·진화 변화를 담는다 (4주차 연출)', () {
    // 반환 타입을 Reward → CompleteResult로 넓힌 이유는 화면이 완료 직후에
    // "레벨이 올랐나 · 진화했나"를 알아야 연출을 잇기 때문이다. 그 판정
    // (leveledUp/evolved)이 지급 전·후 레벨을 실제로 비교하는지 못 박는다 —
    // always-true/always-false로 바꾸면 이 그룹이 깨져야 한다(뮤테이션 방어).
    (InMemoryQuestRepository, InMemoryUserRepository) makeRepos({AppUser? seed}) {
      final users = InMemoryUserRepository(seed: seed ?? AppUser.initial('u'));
      final quests = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(quests.dispose);
      return (quests, users);
    }

    Future<Quest> seed(InMemoryQuestRepository repo, Difficulty d) =>
        repo.createQuest('u', title: 'x', difficulty: d);

    test('★ 레벨업이 없으면 leveledUp=false, from==to (뮤테이션: 항상 true면 실패)', () async {
      // 참새(Lv10, 10 XP/레벨) xp0에서 쉬움 5XP → 5 < 10이라 레벨이 그대로다.
      final (repo, _) = makeRepos(seed: const AppUser(uid: 'u', level: 10, xp: 0));
      final quest = await seed(repo, Difficulty.easy);

      final result = (await repo.completeQuest('u', quest.id))!;

      expect(result.leveledUp, isFalse);
      expect(result.fromLevel, 10);
      expect(result.toLevel, 10);
      // 레벨이 안 올랐으니 진화도 없다.
      expect(result.evolved, isFalse);
    });

    test('★ 큰 XP로 여러 레벨이 오르면 from<to로 표현된다 (다단계 상승)', () async {
      // Lv1 xp0 + 어려움 20XP → 알 단계 5/레벨을 네 칸 소비 → Lv5.
      final (repo, _) = makeRepos();
      final quest = await seed(repo, Difficulty.hard);

      final result = (await repo.completeQuest('u', quest.id))!;

      expect(result.leveledUp, isTrue);
      expect(result.fromLevel, 1);
      expect(result.toLevel, 5);
      // 알(Lv1~9) 안에서만 올랐으므로 진화는 아니다.
      expect(result.evolved, isFalse);
    });

    test('★ 진화 경계(Lv9→Lv10)를 넘으면 evolved=true, 단계가 알→참새 (뮤테이션: 항상 false면 실패)', () async {
      // Lv9(알) xp0 + 쉬움 5XP → 정확히 Lv10(참새).
      final (repo, _) = makeRepos(seed: const AppUser(uid: 'u', level: 9, xp: 0));
      final quest = await seed(repo, Difficulty.easy);

      final result = (await repo.completeQuest('u', quest.id))!;

      expect(result.evolved, isTrue);
      expect(result.leveledUp, isTrue);
      expect(result.fromStage.name, '알');
      expect(result.toStage.name, '참새');
    });

    test('★ 같은 단계 안에서 레벨만 오르면 leveledUp=true지만 evolved=false', () async {
      // Lv1(알) → Lv2(알). 레벨업과 진화 판정이 서로 독립임을 못 박는다
      // (evolved == leveledUp로 뭉뚱그리면 이 테스트가 깨진다).
      final (repo, _) = makeRepos();
      final quest = await seed(repo, Difficulty.easy);

      final result = (await repo.completeQuest('u', quest.id))!;

      expect(result.leveledUp, isTrue);
      expect(result.fromLevel, 1);
      expect(result.toLevel, 2);
      expect(result.evolved, isFalse);
      expect(result.fromStage.name, '알');
      expect(result.toStage.name, '알');
    });

    test('cutCoin이 결과에 실린다 (절삭 전 총액 - 실지급액)', () async {
      // 오늘 68코인 받은 상태에서 어려움(10) 완료 → 2코인만 지급, 8 절삭.
      // 날짜 경계에 의존하지 않도록 고정 시계로 배선한다(makeRepos의 기본 시계는
      // '오늘'이 dailyCoinDate와 어긋날 수 있어 카운터가 만료돼 버린다).
      final users = InMemoryUserRepository(
        seed: const AppUser(
          uid: 'v',
          dailyCoinDate: '2026-07-21',
          dailyCoinEarned: 68,
        ),
        clock: () => DateTime.utc(2026, 7, 21, 3),
      );
      final quests = InMemoryQuestRepository(
        users: users,
        clock: () => DateTime.utc(2026, 7, 21, 3),
      );
      addTearDown(users.dispose);
      addTearDown(quests.dispose);
      final quest = await quests.createQuest(
        'v',
        title: 'x',
        difficulty: Difficulty.hard,
      );

      final result = (await quests.completeQuest('v', quest.id))!;

      expect(result.reward.coin, 2);
      expect(result.cutCoin, 8);
    });

    test('재완료는 여전히 null이다 (연출도 뜨지 않는다)', () async {
      final (repo, _) = makeRepos();
      final quest = await seed(repo, Difficulty.easy);

      expect(await repo.completeQuest('u', quest.id), isNotNull);
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
      expect(reward!.reward, const Reward(coin: 8, xp: 13));
      final user = await users.fetchUser('u');
      expect(user.coin, 8);
      // XP 13을 알 단계 5/레벨로 소비 → Lv3(10 소비), 잔여 XP 3.
      expect(user.level, 3);
      expect(user.xp, 3);
    });

    test('메모가 없으면 기본 보상만 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      final reward = await repo.completeQuest('u', quest.id);

      expect(reward!.reward, const Reward(coin: 5, xp: 10));
      expect((await users.fetchUser('u')).coin, 5);
    });

    test('★ 공백만 있는 메모는 인증으로 치지 않는다', () async {
      // 스페이스 몇 개로 보너스를 받을 수 있으면 인증의 의미가 사라진다.
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      final reward = await repo.completeQuest('u', quest.id, memo: '   ');

      expect(reward!.reward, const Reward(coin: 5, xp: 10));
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
      // 보통 10XP → 알 단계에서 Lv3 잔여 0. 재완료로도 불변.
      expect(user.level, 3);
      expect(user.xp, 0);

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

  group('사진 인증 (3주차)', () {
    (InMemoryQuestRepository, InMemoryUserRepository) makeRepos() {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final quests = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(quests.dispose);
      return (quests, users);
    }

    Future<Quest> seedNormal(InMemoryQuestRepository repo) =>
        repo.createQuest('u', title: '지원서 초안 쓰기', difficulty: Difficulty.normal);

    // 실제 압축 썸네일을 흉내 낸 짧은 base64. 크기 판정과 무관하게 잘 통과한다.
    const smallPhoto = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAA';

    test('★ 사진만 있고 메모가 없어도 인증이 성립해 보너스가 지급된다', () async {
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      final reward = await repo.completeQuest(
        'u',
        quest.id,
        photoBase64: smallPhoto,
      );

      // 보통(5/10) + 보너스(3/3) = 8/13. 메모 없이 사진만으로 성립한다.
      expect(reward!.reward, const Reward(coin: 8, xp: 13));
      final user = await users.fetchUser('u');
      expect(user.coin, 8);
      // XP 13 → 알 단계에서 Lv3, 잔여 XP 3.
      expect(user.level, 3);
      expect(user.xp, 3);

      // 사진은 별도 proof에 저장되고, 성취 기록엔 유무 플래그만 남는다.
      expect(repo.proofOf('u', quest.id), smallPhoto);
      final record = repo.achievementsOf('u').single;
      expect(record.verified, isTrue);
      expect(record.hasPhoto, isTrue);
      expect(record.memo, isNull, reason: '메모는 없었다');
    });

    test('메모와 사진을 둘 다 줘도 보너스는 1회만 붙는다', () async {
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      final reward = await repo.completeQuest(
        'u',
        quest.id,
        memo: '초안 1장 썼다',
        photoBase64: smallPhoto,
      );

      // 중복이 아니다 — 보통(5/10) + 보너스(3/3) = 8/13.
      expect(reward!.reward, const Reward(coin: 8, xp: 13));
      expect((await users.fetchUser('u')).coin, 8);

      final record = repo.achievementsOf('u').single;
      expect(record.verified, isTrue);
      expect(record.hasPhoto, isTrue);
      expect(record.memo, '초안 1장 썼다');
      expect(repo.proofOf('u', quest.id), smallPhoto);
    });

    test('사진 없이 완료하면 proof도 hasPhoto도 남지 않는다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.completeQuest('u', quest.id, memo: '메모만');

      expect(repo.proofOf('u', quest.id), isNull);
      expect(repo.achievementsOf('u').single.hasPhoto, isFalse);
    });

    test('★ 크기 상한을 넘긴 사진은 거부되고 상태·잔액이 불변한다', () async {
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      // 상한을 1바이트 넘긴 base64.
      final tooBig = 'A' * (kMaxProofBase64Bytes + 1);

      await expectLater(
        repo.completeQuest('u', quest.id, photoBase64: tooBig),
        throwsA(isA<AppFailure>()),
      );

      // 트랜잭션 전에 막았으므로 아무것도 바뀌지 않았다.
      final saved = (await repo.fetchQuests('u')).single;
      expect(saved.done, isFalse, reason: '완료 처리되면 안 된다');
      expect(saved.isRewarded, isFalse);
      final user = await users.fetchUser('u');
      expect(user.coin, 0);
      expect(user.xp, 0);
      expect(repo.proofOf('u', quest.id), isNull);
      expect(repo.achievementsOf('u'), isEmpty);
    });

    test('경계값: 상한과 정확히 같은 크기는 허용된다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      final exact = 'A' * kMaxProofBase64Bytes;

      // 초과(>)만 거부하므로 상한과 같으면 통과해야 한다.
      final reward = await repo.completeQuest(
        'u',
        quest.id,
        photoBase64: exact,
      );
      expect(reward!.reward, const Reward(coin: 8, xp: 13));
      expect(repo.proofOf('u', quest.id), exact);
    });

    test('★ 재완료해도 proof·기록이 중복되지 않고 보너스도 재지급되지 않는다', () async {
      // 파밍 시나리오: 사진으로 완료 → 해제 → 다른 사진으로 재완료.
      // rewardedAt 가드가 보너스·proof·기록 저장을 모두 막아야 한다.
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.completeQuest('u', quest.id, photoBase64: smallPhoto);
      await repo.setStatus('u', quest.id, QuestStatus.todo);
      final second = await repo.completeQuest(
        'u',
        quest.id,
        photoBase64: 'ZZZdifferentZZZ',
      );

      expect(second, isNull, reason: '이미 지급된 퀘스트는 아무것도 주지 않는다');
      final user = await users.fetchUser('u');
      expect(user.coin, 8, reason: '보너스가 다시 붙으면 안 된다');
      // XP 13 → Lv3 잔여 3. 재완료로도 불변.
      expect(user.level, 3);
      expect(user.xp, 3);
      expect(repo.achievementsOf('u'), hasLength(1));
      // 재완료 경로는 proof를 다시 쓰지 않는다 — 최초 사진이 그대로 남는다.
      expect(repo.proofOf('u', quest.id), smallPhoto);
    });

    test('fetchProof는 저장된 사진 base64를 돌려준다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);
      await repo.completeQuest('u', quest.id, photoBase64: smallPhoto);

      expect(await repo.fetchProof('u', quest.id), smallPhoto);
    });

    test('fetchProof는 사진 없는 퀘스트에 null을 돌려준다(에러 아님)', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);
      await repo.completeQuest('u', quest.id); // 사진 없이 완료

      expect(await repo.fetchProof('u', quest.id), isNull);
    });

    test('fetchProof는 저장소 실패 시 AppFailure를 던진다', () async {
      final repo = InMemoryQuestRepository(failWith: const NetworkFailure());
      addTearDown(repo.dispose);

      expect(
        () => repo.fetchProof('u', 'q1'),
        throwsA(isA<AppFailure>()),
      );
    });
  });

  // ===== proof 독립 갱신 — 보관함 기록 편집 (3단계-b) =====
  //
  // updateProof는 completeQuest와 완전히 별개인 단건 쓰기다. 완료·보상이 끝난 뒤
  // 이미 보관된 기록의 사진만 나중에 고친다. rewardedAt·coin·xp·성취 기록을 절대
  // 건드리지 않는 것이 최대 방어선이라 회귀 단언을 함께 둔다.
  group('updateProof — 사진 독립 교체·제거', () {
    (InMemoryQuestRepository, InMemoryUserRepository) makeRepos() {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final quests = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(quests.dispose);
      return (quests, users);
    }

    Future<Quest> seedNormal(InMemoryQuestRepository repo) =>
        repo.createQuest('u', title: '지원서 초안 쓰기', difficulty: Difficulty.normal);

    const smallPhoto = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAA';

    test('교체: 새 base64가 fetchProof에 반영된다', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      await repo.updateProof('u', quest.id, smallPhoto);
      expect(await repo.fetchProof('u', quest.id), smallPhoto);

      // 다른 값으로 다시 교체하면 덮어쓴다(퀘스트당 사진 1장).
      await repo.updateProof('u', quest.id, 'BBBBnewBBBB');
      expect(await repo.fetchProof('u', quest.id), 'BBBBnewBBBB');
    });

    test('★ 제거: null을 주면 삭제돼 fetchProof가 null이 된다 (뮤테이션 방어)', () async {
      // 이 단언이 updateProof의 null→삭제 분기를 지킨다. 삭제 분기를 무력화해
      // (null도 교체로 처리) 두면 사진이 남아 이 테스트가 실패해야 한다.
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);
      await repo.updateProof('u', quest.id, smallPhoto);
      expect(await repo.fetchProof('u', quest.id), smallPhoto);

      await repo.updateProof('u', quest.id, null);

      expect(await repo.fetchProof('u', quest.id), isNull);
    });

    test('없던 사진을 제거해도 실패하지 않는다 (멱등)', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);

      // 애초에 사진이 없는 퀘스트에 제거(null) — 조용히 통과한다.
      await repo.updateProof('u', quest.id, null);
      expect(await repo.fetchProof('u', quest.id), isNull);
    });

    test('★ 크기 상한을 넘긴 사진은 거부된다 (AppFailure)', () async {
      final (repo, _) = makeRepos();
      final quest = await seedNormal(repo);
      final tooBig = 'A' * (kMaxProofBase64Bytes + 1);

      await expectLater(
        repo.updateProof('u', quest.id, tooBig),
        throwsA(isA<AppFailure>()),
      );
      // 거부됐으므로 아무것도 저장되지 않았다.
      expect(await repo.fetchProof('u', quest.id), isNull);
    });

    test('저장소 실패 시 AppFailure를 던진다', () async {
      final repo = InMemoryQuestRepository(failWith: const NetworkFailure());
      addTearDown(repo.dispose);

      await expectLater(
        repo.updateProof('u', 'q1', smallPhoto),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('★ 사진을 갈아끼워도 완료·보상(rewardedAt·coin·xp·성취)이 불변한다 (회귀 방어)', () async {
      // 최대 방어선: updateProof가 completeQuest 경로를 절대 건드리지 않는다.
      // 아래 "불변" 단언을 뒤집으면(예: coin이 변한다고 기대) 반드시 실패해야 한다.
      final (repo, users) = makeRepos();
      final quest = await seedNormal(repo);

      // 사진 인증으로 완료 → 보상 지급(보통 5/10 + 보너스 3/3 = 8/13).
      await repo.completeQuest('u', quest.id, photoBase64: smallPhoto);
      final questAfterComplete = (await repo.fetchQuests('u')).single;
      final userAfterComplete = await users.fetchUser('u');
      final achievementsAfterComplete = repo.achievementsOf('u').length;
      expect(userAfterComplete.coin, 8);
      expect(achievementsAfterComplete, 1);

      // 이제 사진만 교체 → 다시 제거.
      await repo.updateProof('u', quest.id, 'ZZZreplacedZZZ');
      await repo.updateProof('u', quest.id, null);

      // 사진은 바뀌었지만…
      expect(await repo.fetchProof('u', quest.id), isNull);

      // …완료·보상은 손끝 하나 안 댔다.
      final questNow = (await repo.fetchQuests('u')).single;
      expect(questNow.rewardedAt, questAfterComplete.rewardedAt);
      expect(questNow.status, questAfterComplete.status);
      expect(questNow.memo, questAfterComplete.memo);

      final userNow = await users.fetchUser('u');
      expect(userNow.coin, userAfterComplete.coin);
      expect(userNow.xp, userAfterComplete.xp);
      expect(userNow.level, userAfterComplete.level);

      // 성취 기록도 늘거나 줄지 않는다.
      expect(repo.achievementsOf('u').length, achievementsAfterComplete);
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

    test('★ source를 주면 모든 퀘스트에 출처가 심긴다 (회귀 A · manual)', () async {
      // 직접 등록 경로는 source: manual을 넘긴다. goalId가 있어도 출처는 직접이어야
      // 카드가 "✎직접"으로 표시된다(goalId 추론이 아니라 명시 신호).
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final created = await repo.createQuests(
        'u',
        const [
          QuestDraft(localId: 'd0', title: 'x', difficulty: Difficulty.easy),
          QuestDraft(localId: 'd1', title: 'y', difficulty: Difficulty.normal),
        ],
        goalId: 'goal-1',
        source: QuestSource.manual,
      );

      expect(created.map((q) => q.source), [
        QuestSource.manual,
        QuestSource.manual,
      ]);
      expect(created.every((q) => !q.isAiGenerated), isTrue);
    });

    test('source를 생략하면 기본값 AI가 심긴다 (분해 경로의 주 사용처)', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final created = await repo.createQuests('u', const [
        QuestDraft(localId: 'd0', title: 'x', difficulty: Difficulty.easy),
      ], goalId: 'goal-1');

      expect(created.single.source, QuestSource.ai);
      expect(created.single.isAiGenerated, isTrue);
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

    // ===== 재분해 자식 등록 (B-5) =====

    test('★ parentQuestId를 주면 모든 자식에 원본 ID가 심긴다', () async {
      // 이 값이 「재분해 복귀율」의 분자다. 하나라도 비면 지표가 어긋난다.
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final created = await repo.createQuests(
        'u',
        const [
          QuestDraft(localId: 'd0', title: '한 문단만 쓰기', difficulty: Difficulty.easy),
          QuestDraft(localId: 'd1', title: '다음 문단 쓰기', difficulty: Difficulty.easy),
        ],
        goalId: 'goal-1',
        parentQuestId: 'parent-1',
      );

      expect(created.map((q) => q.parentQuestId), ['parent-1', 'parent-1']);
      // 자식은 원본의 goalId를 물려받아 **같은 목표 폴더에 남는다.**
      expect(created.map((q) => q.goalId), ['goal-1', 'goal-1']);
      // 자식은 언제나 미완료로 시작한다(원본의 상태를 물려받지 않는다).
      expect(created.map((q) => q.status), [
        QuestStatus.todo,
        QuestStatus.todo,
      ]);

      // 다시 읽어도 계보가 남아 있다(앱 재실행 동치).
      final stored = await repo.fetchQuests('u');
      expect(stored.map((q) => q.parentQuestId), ['parent-1', 'parent-1']);
    });

    test('parentQuestId를 주지 않으면 null이다 (기존 큰 목표 분해 경로)', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final created = await repo.createQuests('u', const [
        QuestDraft(localId: 'd0', title: 'x', difficulty: Difficulty.easy),
      ], goalId: 'goal-1');

      expect(created.single.parentQuestId, isNull);
    });

    test('★ 여러 개를 등록해도 목록 스트림은 한 번만 갱신된다 (부분 반영 없음)', () async {
      // 원자성의 관찰 가능한 신호다. 한 건씩 쓰도록 바꾸면 방출이 3번이 되고,
      // 그 중간 프레임은 "일부만 저장된 목록"이다.
      final repo = InMemoryQuestRepository();
      final emissions = <List<Quest>>[];
      final sub = repo.watchQuests('u').listen(emissions.add);
      // 순서가 중요하다: 컨트롤러를 먼저 닫아야 watchQuests의 `await for`가 끝나고
      // 그제서야 cancel이 완료된다(반대 순서면 tearDown이 영원히 기다린다).
      addTearDown(() async {
        repo.dispose();
        await sub.cancel();
      });
      await Future<void>.delayed(Duration.zero);
      expect(emissions, hasLength(1)); // 최초 빈 목록

      await repo.createQuests(
        'u',
        const [
          QuestDraft(localId: 'd0', title: 'a', difficulty: Difficulty.easy),
          QuestDraft(localId: 'd1', title: 'b', difficulty: Difficulty.easy),
          QuestDraft(localId: 'd2', title: 'c', difficulty: Difficulty.easy),
        ],
        parentQuestId: 'parent-1',
      );
      await Future<void>.delayed(Duration.zero);

      expect(emissions, hasLength(2));
      expect(emissions.last, hasLength(3));
    });
  });

  // ===== 계보 원자 삭제 (B-5b) =====
  //
  // 재분해 원본을 지울 때 그 하위 계보를 함께 지운다. 계보 계산은 화면 몫이고,
  // 저장소는 "이 ID들을 원자적으로 지운다"만 책임진다(createQuests와 대칭).
  group('deleteQuests — 여러 퀘스트 원자 삭제', () {
    test('여러 ID를 한 번에 지운다', () async {
      final repo = InMemoryQuestRepository(
        seed: const [
          Quest(id: 'a', title: 'a', order: 0),
          Quest(id: 'b', title: 'b', order: 1),
          Quest(id: 'c', title: 'c', order: 2),
        ],
      );
      addTearDown(repo.dispose);

      await repo.deleteQuests('u', ['a', 'c']);

      expect((await repo.fetchQuests('u')).map((q) => q.id), ['b']);
    });

    test('없는 ID가 섞여 있어도 실패하지 않고 나머지를 지운다', () async {
      // 삭제는 멱등이다 — 이미 지워졌거나 존재하지 않는 ID가 섞여도 통과한다.
      final repo = InMemoryQuestRepository(
        seed: const [
          Quest(id: 'a', title: 'a', order: 0),
          Quest(id: 'b', title: 'b', order: 1),
        ],
      );
      addTearDown(repo.dispose);

      await repo.deleteQuests('u', ['a', 'ghost']);

      expect((await repo.fetchQuests('u')).map((q) => q.id), ['b']);
    });

    test('★ 여러 개를 지워도 목록 스트림은 한 번만 갱신된다 (부분 삭제 없음)', () async {
      // 원자성의 관찰 가능한 신호. 한 건씩 지우면 방출이 여러 번이 되고,
      // 그 중간 프레임은 "부모는 지워졌는데 자식은 남은" 목록이다.
      final repo = InMemoryQuestRepository(
        seed: const [
          Quest(id: 'a', title: 'a', order: 0),
          Quest(id: 'b', title: 'b', order: 1),
          Quest(id: 'c', title: 'c', order: 2),
        ],
      );
      final emissions = <List<Quest>>[];
      final sub = repo.watchQuests('u').listen(emissions.add);
      addTearDown(() async {
        repo.dispose();
        await sub.cancel();
      });
      await Future<void>.delayed(Duration.zero);
      expect(emissions, hasLength(1)); // 최초 목록(3개)

      await repo.deleteQuests('u', ['a', 'b']);
      await Future<void>.delayed(Duration.zero);

      expect(emissions, hasLength(2));
      expect(emissions.last.map((q) => q.id), ['c']);
    });

    test('빈 목록을 지우면 아무 일도 없고 스트림도 방출하지 않는다', () async {
      final repo = InMemoryQuestRepository(
        seed: const [Quest(id: 'a', title: 'a', order: 0)],
      );
      final emissions = <List<Quest>>[];
      final sub = repo.watchQuests('u').listen(emissions.add);
      addTearDown(() async {
        repo.dispose();
        await sub.cancel();
      });
      await Future<void>.delayed(Duration.zero);
      expect(emissions, hasLength(1));

      await repo.deleteQuests('u', const []);
      await Future<void>.delayed(Duration.zero);

      // 헛방출 없음 — 여전히 최초 1회 그대로.
      expect(emissions, hasLength(1));
      expect((await repo.fetchQuests('u')).map((q) => q.id), ['a']);
    });

    test('failWith가 있으면 AppFailure를 던진다', () async {
      final repo = InMemoryQuestRepository(
        seed: const [Quest(id: 'a', title: 'a')],
        failWith: const NetworkFailure(),
      );
      addTearDown(repo.dispose);

      await expectLater(
        repo.deleteQuests('u', ['a']),
        throwsA(isA<NetworkFailure>()),
      );
    });
  });

  // ===== 멈춤 상태 전이 (B-5) =====
  //
  // 멈춤은 **보상과 완전히 무관한 경로**다. 여기가 흔들리면 재지급 가드가
  // 뚫리거나(파밍) 멈춤 표시가 완료로 오인된다.
  group('멈춤 상태 전이 — todo ↔ stuck', () {
    test('todo → stuck → todo 로 오갈 수 있다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: '지원서 초안 쓰기',
        difficulty: Difficulty.hard,
      );
      expect(quest.status, QuestStatus.todo);

      await repo.setStatus('u', quest.id, QuestStatus.stuck);
      expect((await repo.fetchQuests('u')).single.isStuck, isTrue);

      await repo.setStatus('u', quest.id, QuestStatus.todo);
      final back = (await repo.fetchQuests('u')).single;
      expect(back.status, QuestStatus.todo);
      expect(back.isStuck, isFalse);
      expect(back.done, isFalse);
    });

    test('★ 멈춤 표시는 보상을 주지도 지급 이력을 지우지도 않는다', () async {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final repo = InMemoryQuestRepository(users: users);
      addTearDown(repo.dispose);
      addTearDown(users.dispose);

      final quest = await repo.createQuest(
        'u',
        title: '지원서 초안 쓰기',
        difficulty: Difficulty.normal,
      );

      // 아직 완료 전: 멈춤으로 바꿔도 잔액은 0 그대로다.
      await repo.setStatus('u', quest.id, QuestStatus.stuck);
      expect((await users.fetchUser('u')).coin, 0);
      expect((await repo.fetchQuests('u')).single.isRewarded, isFalse);

      // 완료해서 보상을 받은 뒤,
      await repo.setStatus('u', quest.id, QuestStatus.todo);
      final paid = await repo.completeQuest('u', quest.id);
      expect(paid, isNotNull);
      final coinAfterPay = (await users.fetchUser('u')).coin;
      expect(coinAfterPay, greaterThan(0));

      // 멈춤 → 재완료를 거쳐도 **재지급은 없다**(rewardedAt 가드 회귀 방어).
      await repo.setStatus('u', quest.id, QuestStatus.stuck);
      final stuck = (await repo.fetchQuests('u')).single;
      expect(stuck.isStuck, isTrue);
      expect(stuck.isRewarded, isTrue); // 지급 이력은 상태 전이로 지워지지 않는다

      expect(await repo.completeQuest('u', quest.id), isNull);
      expect((await users.fetchUser('u')).coin, coinAfterPay);
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

  // ===== 보관함 조회 경로 (watchAchievements) =====
  //
  // 완료 트랜잭션이 남긴 성취 기록을 보관함이 읽는 경로. 쓰기(completeQuest)는
  // 이미 위에서 검증했으니, 여기서는 **읽기 계약**만 못 박는다.
  group('watchAchievements — 보관함 조회 경로', () {
    Achievement ach(String id, {required DateTime? at, String title = 'x'}) =>
        Achievement(
          id: id,
          questId: 'q-$id',
          questTitle: title,
          coin: 5,
          xp: 10,
          completedAt: at,
        );

    test('★ 최신순(completedAt 내림차순)으로 흐른다 (뮤테이션: 정렬을 뒤집으면 실패)', () async {
      // 일부러 저장 순서(오래된→최신)와 반대가 되도록 심는다. 정렬이 없거나
      // 뒤집혀 있으면 이 순서가 어긋난다.
      final repo = InMemoryQuestRepository(
        seedAchievements: {
          'u': [
            ach('old', at: DateTime.utc(2026, 7, 10), title: '가장 오래됨'),
            ach('new', at: DateTime.utc(2026, 7, 20), title: '가장 최신'),
            ach('mid', at: DateTime.utc(2026, 7, 15), title: '중간'),
          ],
        },
      );
      addTearDown(repo.dispose);

      final list = await repo.watchAchievements('u').first;

      expect(list.map((a) => a.questTitle), ['가장 최신', '중간', '가장 오래됨']);
    });

    test('completedAt이 없는 기록은 맨 뒤로 간다', () async {
      final repo = InMemoryQuestRepository(
        seedAchievements: {
          'u': [
            ach('n', at: null, title: '시각 없음'),
            ach('a', at: DateTime.utc(2026, 7, 20), title: '있음'),
          ],
        },
      );
      addTearDown(repo.dispose);

      final list = await repo.watchAchievements('u').first;
      expect(list.map((a) => a.questTitle), ['있음', '시각 없음']);
    });

    test('★ 제목이 유실된 기록도 목록에 남는다 (관대한 취급)', () async {
      // 저장된 기록 하나가 손상돼도(제목 유실 등) 보관함 전체가 비지 않아야 한다.
      // 진짜 깨진 문서(id 없음)의 드롭은 Firestore _parseAchievements가
      // Achievement.tryParse로 처리하며, 그 계약은 achievement_test가 못 박는다.
      final repo = InMemoryQuestRepository(
        seedAchievements: {
          'u': [
            ach('good', at: DateTime.utc(2026, 7, 20), title: '정상'),
            ach('degraded', at: DateTime.utc(2026, 7, 19), title: ''),
          ],
        },
      );
      addTearDown(repo.dispose);

      final list = await repo.watchAchievements('u').first;
      expect(list, hasLength(2));
      expect(list.first.questTitle, '정상');
      expect(list.last.questTitle, '');
    });

    test('빈 계정은 빈 목록을 흘린다', () async {
      final repo = InMemoryQuestRepository();
      addTearDown(repo.dispose);

      expect(await repo.watchAchievements('u').first, isEmpty);
    });

    test('★ 퀘스트를 완료하면 스트림에 새 기록이 반영된다', () async {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final repo = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(repo.dispose);

      // 퀘스트 생성은 구독 전에 끝내 둔다 — 생성이 흘리는 (성취) 빈 목록 방출을
      // 검증 대상에서 빼기 위해서다. 관심사는 "완료가 기록을 흘리는가"다.
      final quest = await repo.createQuest(
        'u',
        title: '완료할 도전',
        difficulty: Difficulty.normal,
      );

      unawaited(
        expectLater(
          repo.watchAchievements('u'),
          emitsInOrder([
            isEmpty,
            predicate<List<Achievement>>(
              (list) => list.length == 1 && list.single.questTitle == '완료할 도전',
              '완료 기록 1건',
            ),
          ]),
        ),
      );
      await Future<void>.delayed(Duration.zero);

      await repo.completeQuest('u', quest.id);
      await Future<void>.delayed(Duration.zero);
    });

    test('★ 재완료해도 기록이 늘지 않는다 (지급 횟수 = 기록 수 회귀 방어)', () async {
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final repo = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);
      addTearDown(repo.dispose);

      final quest = await repo.createQuest(
        'u',
        title: 'x',
        difficulty: Difficulty.easy,
      );
      await repo.completeQuest('u', quest.id);
      // 해제 → 재완료(파밍 시나리오).
      await repo.setStatus('u', quest.id, QuestStatus.todo);
      await repo.completeQuest('u', quest.id);

      expect(await repo.watchAchievements('u').first, hasLength(1));
    });

    test('★ 재완료(alreadyPaid)도 스트림을 재방출한다 (뮤테이션: alreadyPaid 방출 제거 시 실패)', () async {
      // 재완료는 기록을 늘리지 않지만(위 테스트), 퀘스트 상태·메모는 바뀔 수 있어
      // watchQuests·watchAchievements가 **재방출**해야 화면이 갱신된다. 이 방출이
      // 없으면 "메모를 고쳐 다시 완료했는데 화면이 안 바뀐다"가 되고, 지금까지
      // 아무 테스트도 그걸 잡지 못했다(무테스트 방출). 여기서 못 박는다.
      final users = InMemoryUserRepository(seed: AppUser.initial('u'));
      final repo = InMemoryQuestRepository(users: users);
      addTearDown(users.dispose);

      // 먼저 지급까지 끝낸다 → 이후 완료는 alreadyPaid 경로로만 흐른다.
      final quest = await repo.createQuest(
        'u',
        title: '메모 고칠 도전',
        difficulty: Difficulty.easy,
      );
      await repo.completeQuest('u', quest.id);

      // 지급이 끝난 뒤 구독을 시작한다 → 첫 방출은 이미 있는 기록 1건.
      final achEmissions = <List<Achievement>>[];
      final questEmissions = <List<Quest>>[];
      final achSub = repo.watchAchievements('u').listen(achEmissions.add);
      final questSub = repo.watchQuests('u').listen(questEmissions.add);
      addTearDown(() async {
        repo.dispose();
        await achSub.cancel();
        await questSub.cancel();
      });
      await Future<void>.delayed(Duration.zero);
      expect(achEmissions, hasLength(1), reason: '구독 시 최초 방출');
      expect(questEmissions, hasLength(1));

      // 재완료(alreadyPaid) — 메모를 붙여 다시 완료한다.
      final result = await repo.completeQuest('u', quest.id, memo: '이제 인증 메모');
      await Future<void>.delayed(Duration.zero);

      // 재완료라 지급은 없다(가드는 그대로).
      expect(result, isNull, reason: 'alreadyPaid 경로여야 이 테스트가 의미 있다');
      // 그러나 두 스트림 모두 **재방출**해야 한다(alreadyPaid 분기의 방출).
      expect(achEmissions, hasLength(2), reason: '재완료도 성취 스트림을 재방출한다');
      expect(questEmissions, hasLength(2), reason: '재완료도 퀘스트 스트림을 재방출한다');
      // 기록 수는 그대로 1건(재완료는 기록을 늘리지 않는다).
      expect(achEmissions.last, hasLength(1));
    });

    test('기록은 사용자별로 분리된다', () async {
      final repo = InMemoryQuestRepository(
        seedAchievements: {
          'u': [ach('a', at: DateTime.utc(2026, 7, 20))],
        },
      );
      addTearDown(repo.dispose);

      expect(await repo.watchAchievements('u').first, hasLength(1));
      expect(await repo.watchAchievements('다른uid').first, isEmpty);
    });

    test('failWith가 있으면 조회가 AppFailure를 던진다', () async {
      final repo = InMemoryQuestRepository(failWith: const NetworkFailure());
      addTearDown(repo.dispose);

      await expectLater(
        repo.watchAchievements('u').first,
        throwsA(isA<NetworkFailure>()),
      );
    });
  });

  group('InMemoryUserRepository', () {
    test('ensureUser는 신규 사용자를 기본값으로 만들고 created=true를 알린다', () async {
      final repo = InMemoryUserRepository();
      addTearDown(repo.dispose);

      final result = await repo.ensureUser('uid-1');

      // created=true는 signup 계측의 근거다.
      expect(result.created, isTrue);
      final user = result.user;
      expect(user.level, 1);
      expect(user.xp, 0);
      expect(user.coin, 0);
      expect(user.createdAt, isNotNull);
    });

    test('ensureUser를 두 번 불러도 기존 문서를 덮어쓰지 않고 created=false다 (멱등)', () async {
      final repo = InMemoryUserRepository();
      addTearDown(repo.dispose);

      final first = await repo.ensureUser('uid-1');
      repo.put(first.user.copyWith(coin: 999));

      final second = await repo.ensureUser('uid-1');

      // 이미 있던 문서라 만들지 않았다 → created=false, 기존 값 보존.
      expect(second.created, isFalse);
      expect(second.user.coin, 999);
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
