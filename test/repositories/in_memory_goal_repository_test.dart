import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/goal.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';

void main() {
  group('InMemoryGoalRepository', () {
    test('목표를 저장하면 id가 부여된 Goal을 돌려준다', () async {
      final repo = InMemoryGoalRepository();

      final goal = await repo.createGoal('u', '공모전 지원하기');

      expect(goal.text, '공모전 지원하기');
      expect(goal.id, isNotEmpty);
      expect(goal.createdAt, isNotNull);
    });

    test('앞뒤 공백은 잘려서 저장된다', () async {
      final repo = InMemoryGoalRepository();

      final goal = await repo.createGoal('u', '  공모전 지원하기  ');

      expect(goal.text, '공모전 지원하기');
    });

    test('저장한 목표를 id로 다시 읽을 수 있다', () async {
      final repo = InMemoryGoalRepository();

      final created = await repo.createGoal('u', '대외활동 시작하기');
      final fetched = await repo.fetchGoal('u', created.id);

      expect(fetched.id, created.id);
      expect(fetched.text, '대외활동 시작하기');
    });

    test('없는 id를 조회하면 NotFoundFailure', () async {
      final repo = InMemoryGoalRepository();

      expect(
        () => repo.fetchGoal('u', '없는id'),
        throwsA(isA<NotFoundFailure>()),
      );
    });

    test('seed로 넣은 목표를 fetch로 읽을 수 있다', () async {
      final repo = InMemoryGoalRepository(
        seed: const [Goal(id: 'seed-1', text: '미리 넣은 목표')],
      );

      final fetched = await repo.fetchGoal('u', 'seed-1');

      expect(fetched.text, '미리 넣은 목표');
    });

    group('실패 주입 — 실패 경로 테스트의 토대', () {
      test('failWith를 주면 createGoal이 AppFailure를 던진다', () async {
        final repo = InMemoryGoalRepository(failWith: const NetworkFailure());

        expect(
          () => repo.createGoal('u', '공모전 지원하기'),
          throwsA(isA<NetworkFailure>()),
        );
      });

      test('failWith를 주면 fetchGoal도 AppFailure를 던진다', () async {
        final repo = InMemoryGoalRepository(failWith: const NetworkFailure());

        expect(
          () => repo.fetchGoal('u', 'any'),
          throwsA(isA<NetworkFailure>()),
        );
      });
    });
  });
}
