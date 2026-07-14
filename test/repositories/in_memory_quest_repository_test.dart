import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
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
