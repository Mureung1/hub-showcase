import 'dart:async';

import '../../core/error/app_failure.dart';
import '../../models/goal.dart';
import '../goal_repository.dart';

/// Firebase 없이 도는 목표 저장소.
///
/// [failWith]를 주면 모든 호출이 그 실패를 던진다 —
/// "네트워크 오류 시 오류 화면이 뜨는가" 같은 테스트가 한 줄로 끝난다:
///
/// ```dart
/// InMemoryGoalRepository(failWith: const NetworkFailure())
/// ```
class InMemoryGoalRepository implements GoalRepository {
  InMemoryGoalRepository({this.failWith, List<Goal> seed = const []}) {
    for (final goal in seed) {
      _goals.putIfAbsent(goal.id, () => goal);
    }
  }

  final AppFailure? failWith;

  final Map<String, Goal> _goals = {};
  final _controller = StreamController<void>.broadcast();
  int _seq = 0;

  void _check() {
    if (failWith != null) throw failWith!;
  }

  /// 테스트가 끝날 때 호출한다(`addTearDown(repo.dispose)`).
  /// InMemoryQuestRepository와 같은 규약.
  void dispose() => _controller.close();

  List<Goal> get _all => List.unmodifiable(_goals.values);

  @override
  Stream<List<Goal>> watchGoals(String uid) async* {
    _check();
    yield _all;
    await for (final _ in _controller.stream) {
      yield _all;
    }
  }

  @override
  Future<Goal> createGoal(String uid, String text) async {
    _check();
    final goal = Goal(
      id: 'mem-goal-${++_seq}',
      text: text.trim(),
      createdAt: DateTime.now(),
    );
    _goals[goal.id] = goal;
    _controller.add(null);
    return goal;
  }

  @override
  Future<Goal> fetchGoal(String uid, String goalId) async {
    _check();
    final goal = _goals[goalId];
    if (goal == null) throw const NotFoundFailure();
    return goal;
  }
}
