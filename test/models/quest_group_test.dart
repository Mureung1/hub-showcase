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

  // ===== 재분해 계보 (B-5) =====
  //
  // 「재분해 복귀율」의 근거가 되는 부모-자식 관계를 목록에서 어떻게 펼치는가.
  // 규칙은 UI와 무관하므로 순수 함수로 검증한다(groupQuestsByGoal과 같은 이유).

  group('arrangeQuestTree — 부모-자식 정렬과 깊이', () {
    Quest child(String id, String parentId, {String? goalId}) => Quest(
      id: id,
      title: '퀘스트 $id',
      goalId: goalId,
      parentQuestId: parentId,
    );

    test('빈 목록은 빈 결과', () {
      expect(arrangeQuestTree(const []), isEmpty);
    });

    test('부모-자식이 없으면 입력 순서 그대로 깊이 0이다', () {
      final nodes = arrangeQuestTree([quest('a'), quest('b'), quest('c')]);

      expect(nodes.map((n) => n.quest.id), ['a', 'b', 'c']);
      expect(nodes.map((n) => n.depth), [0, 0, 0]);
    });

    test('자식은 입력 순서와 무관하게 부모 바로 뒤로 온다', () {
      // 저장소 정렬(order)상 자식이 부모에서 멀리 떨어져 있는 상황.
      // 그냥 입력 순서를 흘려보내면 이 단언이 깨진다.
      final nodes = arrangeQuestTree([
        quest('p'),
        quest('other1'),
        child('c2', 'p'),
        quest('other2'),
        child('c1', 'p'),
      ]);

      expect(nodes.map((n) => n.quest.id), [
        'p',
        'c2', // 자식끼리는 입력 순서를 지킨다
        'c1',
        'other1',
        'other2',
      ]);
      expect(nodes.map((n) => n.depth), [0, 1, 1, 0, 0]);
    });

    test('자식의 자식은 깊이 2이고 더 나눌 수 없다', () {
      final nodes = arrangeQuestTree([
        quest('p'),
        child('c', 'p'),
        child('g', 'c'),
      ]);

      expect(nodes.map((n) => n.quest.id), ['p', 'c', 'g']);
      expect(nodes.map((n) => n.depth), [0, 1, 2]);

      // 깊이 가드 — 손자(2)만 막힌다.
      expect(nodes[0].canRedecompose, isTrue);
      expect(nodes[1].canRedecompose, isTrue);
      expect(nodes[2].canRedecompose, isFalse);
      expect(nodes[0].isChild, isFalse);
      expect(nodes[1].isChild, isTrue);
    });

    test('부모를 못 찾는 고아 자식도 숨기지 않고 뿌리로 낸다', () {
      // 부모가 삭제된 상황. 데이터를 잃은 것처럼 보이면 안 된다.
      final nodes = arrangeQuestTree([quest('a'), child('orphan', 'gone')]);

      expect(nodes.map((n) => n.quest.id), ['a', 'orphan']);
      expect(nodes.map((n) => n.depth), [0, 0]);
    });

    test('자기 자신을 부모로 가리켜도 무한 루프에 빠지지 않는다', () {
      final nodes = arrangeQuestTree([child('self', 'self')]);

      expect(nodes.map((n) => n.quest.id), ['self']);
      expect(nodes.single.depth, 0);
    });

    test('순환 참조가 있어도 항목을 잃지 않는다', () {
      // a→b→a. 어느 쪽도 뿌리가 아니지만 둘 다 목록에 남아야 한다.
      final nodes = arrangeQuestTree([child('a', 'b'), child('b', 'a')]);

      expect(nodes.map((n) => n.quest.id).toSet(), {'a', 'b'});
      expect(nodes, hasLength(2));
    });

    test('그룹 안에서도 자식이 부모 뒤에 온다 (QuestGroup.nodes)', () {
      final group = groupQuestsByGoal([
        quest('p', goalId: 'g1'),
        quest('q', goalId: 'g1'),
        child('c', 'p', goalId: 'g1'),
      ], const {'g1': '공모전 지원하기'}).single;

      // 저장 순서(quests)는 손대지 않는다.
      expect(group.quests.map((q) => q.id), ['p', 'q', 'c']);
      // 화면 순서(nodes)만 계보를 반영한다.
      expect(group.nodes.map((n) => n.quest.id), ['p', 'c', 'q']);
      expect(group.nodes.map((n) => n.depth), [0, 1, 0]);
    });

    test('멈춘 부모는 자식을 다 끝내도 완료로 세지 않는다 (자동 완료 없음)', () {
      final group = groupQuestsByGoal([
        Quest(
          id: 'p',
          title: '지원서 초안 쓰기',
          goalId: 'g1',
          status: QuestStatus.stuck,
        ),
        Quest(
          id: 'c1',
          title: '한 문단만 쓰기',
          goalId: 'g1',
          parentQuestId: 'p',
          status: QuestStatus.done,
        ),
        Quest(
          id: 'c2',
          title: '다음 문단 쓰기',
          goalId: 'g1',
          parentQuestId: 'p',
          status: QuestStatus.done,
        ),
      ], const {'g1': '공모전 지원하기'}).single;

      expect(group.doneCount, 2);
      expect(group.total, 3);
      expect(group.isAllDone, isFalse);
    });
  });
}
