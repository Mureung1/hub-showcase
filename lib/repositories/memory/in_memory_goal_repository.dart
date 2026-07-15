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
  int _seq = 0;

  void _check() {
    if (failWith != null) throw failWith!;
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
