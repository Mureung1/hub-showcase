import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_group.dart';
import 'package:one_step/models/quest_status.dart';

/// 목록 화면의 **폴더 묶기 규칙**. 규칙 자체는 UI와 무관하니 여기서 검증한다
/// (위젯 테스트로만 확인하면 "왜 이 순서인가"를 아무도 못 읽는다).
void main() {
  Quest quest(
    String id, {
    String? goalId,
    QuestStatus status = QuestStatus.todo,
  }) => Quest(id: id, title: '퀘스트 $id', goalId: goalId, status: status);

  test('빈 목록은 빈 그룹을 낸다', () {
    expect(groupQuestsByGoal(const [], const {}), isEmpty);
  });

  test('같은 goalId를 가진 퀘스트가 한 그룹으로 묶인다', () {
    final groups = groupQuestsByGoal([
      quest('q1', goalId: 'g1'),
      quest('q2', goalId: 'g1'),
      quest('q3', goalId: 'g2'),
    ], const {'g1': '공모전 지원하기', 'g2': '토익 900점'});

    expect(groups, hasLength(2));
    expect(groups.first.goalId, 'g1');
    expect(groups.first.label, '공모전 지원하기');
    expect(groups.first.quests.map((q) => q.id), ['q1', 'q2']);
    expect(groups.last.label, '토익 900점');
    expect(groups.last.quests.map((q) => q.id), ['q3']);
  });

  test('그룹 순서는 "그룹 내 첫 퀘스트의 위치"를 따른다', () {
    // 저장소가 이미 order→createdAt으로 정렬해 준 것을 다시 뒤집지 않는다.
    // g2의 첫 퀘스트가 g1의 두 번째 퀘스트보다 앞에 있으므로 g2가 위다.
    final groups = groupQuestsByGoal([
      quest('a', goalId: 'g2'),
      quest('b', goalId: 'g1'),
      quest('c', goalId: 'g2'),
    ], const {'g1': '목표1', 'g2': '목표2'});

    expect(groups.map((g) => g.goalId), ['g2', 'g1']);
    expect(groups.first.quests.map((q) => q.id), ['a', 'c']);
  });

  test('goalId가 없는(직접 등록) 퀘스트는 항상 맨 아래 그룹이다', () {
    // 입력에서는 맨 앞에 있어도 아래로 내려간다.
    final groups = groupQuestsByGoal([
      quest('direct1'),
      quest('q1', goalId: 'g1'),
      quest('direct2'),
    ], const {'g1': '공모전 지원하기'});

    expect(groups, hasLength(2));
    expect(groups.first.goalId, 'g1');

    final last = groups.last;
    expect(last.goalId, isNull);
    expect(last.label, kDirectQuestGroupLabel);
    expect(last.key, isNot('g1'));
    // 그룹 내부 순서는 입력 순서를 유지한다.
    expect(last.quests.map((q) => q.id), ['direct1', 'direct2']);
  });

  test('직접 등록 퀘스트가 없으면 그 그룹은 아예 만들지 않는다', () {
    final groups = groupQuestsByGoal([
      quest('q1', goalId: 'g1'),
    ], const {'g1': '목표1'});

    expect(groups, hasLength(1));
    expect(groups.single.goalId, 'g1');
  });

  test('목표 문서를 못 찾으면 폴백 라벨을 쓰되 퀘스트를 숨기지 않는다', () {
    // 목표 문서 하나가 삭제·손상됐다고 퀘스트가 사라지면 사용자는 데이터를 잃은 걸로 본다.
    final groups = groupQuestsByGoal([
      quest('q1', goalId: 'ghost'),
    ], const {});

    expect(groups, hasLength(1));
    expect(groups.single.label, kUnknownGoalLabel);
    expect(groups.single.quests.map((q) => q.id), ['q1']);
  });

  test('진행률은 done 개수 / 전체 개수다', () {
    final groups = groupQuestsByGoal([
      quest('q1', goalId: 'g1', status: QuestStatus.done),
      quest('q2', goalId: 'g1'),
      quest('q3', goalId: 'g1'),
      quest('q4', goalId: 'g1'),
    ], const {'g1': '목표1'});

    final group = groups.single;
    expect(group.total, 4);
    expect(group.doneCount, 1);
    expect(group.progress, closeTo(0.25, 0.0001));
    expect(group.isAllDone, isFalse);
  });

  test('stuck(멈춤)은 완료로 세지 않는다', () {
    final group = groupQuestsByGoal([
      quest('q1', goalId: 'g1', status: QuestStatus.done),
      quest('q2', goalId: 'g1', status: QuestStatus.stuck),
    ], const {'g1': '목표1'}).single;

    expect(group.doneCount, 1);
    expect(group.isAllDone, isFalse);
  });

  test('전부 완료된 그룹은 isAllDone이 true고 진행률이 1이다', () {
    final group = groupQuestsByGoal([
      quest('q1', goalId: 'g1', status: QuestStatus.done),
      quest('q2', goalId: 'g1', status: QuestStatus.done),
    ], const {'g1': '목표1'}).single;

    expect(group.isAllDone, isTrue);
    expect(group.progress, 1);
  });

  test('그룹 키는 goalId별로 다르고 직접 등록 그룹도 키를 가진다', () {
    final groups = groupQuestsByGoal([
      quest('q1', goalId: 'g1'),
      quest('q2', goalId: 'g2'),
      quest('q3'),
    ], const {});

    final keys = groups.map((g) => g.key).toSet();
    expect(keys, hasLength(3));
  });
}
