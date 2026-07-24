import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_group.dart';
import 'package:one_step/models/quest_status.dart';

/// `resolveArchiveOnComplete` — "완료 한 건이 무엇을 자동완료·보관하는가"의 규칙.
///
/// 규칙 자체는 UI와 무관하니 순수 함수로 여기서 검증한다(위젯 테스트로만 확인하면
/// "왜 이 집합인가"를 아무도 못 읽는다 — arrangeQuestTree·descendantIds와 같은 이유).
void main() {
  Quest quest(
    String id, {
    String? goalId,
    String? parentQuestId,
    QuestStatus status = QuestStatus.todo,
    bool archived = false,
  }) => Quest(
    id: id,
    title: '퀘스트 $id',
    goalId: goalId,
    parentQuestId: parentQuestId,
    status: status,
    archived: archived,
  );

  group('직접 등록 (goalId == null)', () {
    test('완료한 낱개 하나만 보관한다 (연출 없음)', () {
      final r = resolveArchiveOnComplete([
        quest('a'),
        quest('b'),
      ], 'a');

      expect(r.archiveIds, {'a'});
      expect(r.autoCompleteIds, isEmpty);
      expect(r.goalCompleted, isFalse);
    });

    test('재분해된 직접 원본은 자식을 다 끝내면 함께 자동완료·보관된다', () {
      // p(직접·stuck) → c1(done), c2(방금 완료). c1·c2가 모두 done이면 p 자동완료.
      // 직접 등록이라 "방금 완료(c2)" + "자동완료된 직접 원본(p)"이 함께 이동한다.
      final r = resolveArchiveOnComplete([
        quest('p', status: QuestStatus.stuck),
        quest('c1', parentQuestId: 'p', status: QuestStatus.done),
        quest('c2', parentQuestId: 'p'),
      ], 'c2');

      expect(r.autoCompleteIds, {'p'});
      expect(r.archiveIds, {'c2', 'p'});
      expect(r.goalCompleted, isFalse); // 직접 등록엔 목표 완수 연출이 없다.
    });
  });

  group('목표 소속 (goalId != null)', () {
    test('일부만 done이면 아무것도 보관하지 않는다', () {
      final r = resolveArchiveOnComplete([
        quest('a', goalId: 'g1'),
        quest('b', goalId: 'g1'),
      ], 'a');

      expect(r.archiveIds, isEmpty);
      expect(r.goalCompleted, isFalse);
    });

    test('모든 퀘스트가 done이면 목표 전체를 보관하고 goalCompleted가 참이다', () {
      // a는 이미 done, b를 방금 완료 → 목표 전부 완료.
      final r = resolveArchiveOnComplete([
        quest('a', goalId: 'g1', status: QuestStatus.done),
        quest('b', goalId: 'g1'),
      ], 'b');

      expect(r.archiveIds, {'a', 'b'});
      expect(r.goalCompleted, isTrue);
    });

    test('다른 목표의 퀘스트는 보관 집합에 섞이지 않는다', () {
      final r = resolveArchiveOnComplete([
        quest('a', goalId: 'g1', status: QuestStatus.done),
        quest('b', goalId: 'g1'),
        quest('x', goalId: 'g2'), // 다른 목표 — 완료와 무관.
      ], 'b');

      expect(r.archiveIds, {'a', 'b'});
      expect(r.archiveIds, isNot(contains('x')));
    });
  });

  group('재분해 원본 자동완료', () {
    test('자식이 전부 done인 stuck 원본만 자동완료된다', () {
      final r = resolveArchiveOnComplete([
        quest('p', goalId: 'g1', status: QuestStatus.stuck),
        quest('c1', goalId: 'g1', parentQuestId: 'p', status: QuestStatus.done),
        quest('c2', goalId: 'g1', parentQuestId: 'p'), // 방금 완료.
      ], 'c2');

      expect(r.autoCompleteIds, {'p'});
      // p 자동완료로 목표 전부 완료 → 폴더째 이동.
      expect(r.archiveIds, {'p', 'c1', 'c2'});
      expect(r.goalCompleted, isTrue);
    });

    test('자식이 일부만 done이면 원본은 자동완료되지 않는다', () {
      final r = resolveArchiveOnComplete([
        quest('p', goalId: 'g1', status: QuestStatus.stuck),
        quest('c1', goalId: 'g1', parentQuestId: 'p'), // 방금 완료.
        quest('c2', goalId: 'g1', parentQuestId: 'p'), // 아직 todo.
      ], 'c1');

      expect(r.autoCompleteIds, isEmpty);
      expect(r.archiveIds, isEmpty);
      expect(r.goalCompleted, isFalse);
    });

    test('자식 없는 stuck은 자동완료 대상이 아니다', () {
      // p는 stuck이지만 재분해된 적이 없어(자식 없음) 자동완료되면 안 된다.
      final r = resolveArchiveOnComplete([
        quest('p', goalId: 'g1', status: QuestStatus.stuck),
        quest('q', goalId: 'g1'), // 방금 완료.
      ], 'q');

      expect(r.autoCompleteIds, isEmpty);
      expect(r.goalCompleted, isFalse); // p가 stuck으로 남아 목표 미완.
    });

    test('2단계 중첩: 안쪽 원본부터 차례로 자동완료된다', () {
      // p(stuck) → m(stuck, p의 자식) → leaf(m의 자식). leaf를 완료하면
      // m이 먼저 자동완료되고, 그 뒤 p가 자동완료된다(고정점 반복).
      final r = resolveArchiveOnComplete([
        quest('p', goalId: 'g1', status: QuestStatus.stuck),
        quest('m', goalId: 'g1', parentQuestId: 'p', status: QuestStatus.stuck),
        quest('leaf', goalId: 'g1', parentQuestId: 'm'), // 방금 완료.
      ], 'leaf');

      expect(r.autoCompleteIds, {'m', 'p'});
      expect(r.archiveIds, {'p', 'm', 'leaf'});
      expect(r.goalCompleted, isTrue);
    });
  });

  group('방어', () {
    test('목록에 없는 ID로 불리면 아무것도 보관하지 않는다', () {
      final r = resolveArchiveOnComplete([quest('a')], 'ghost');
      expect(r.archiveIds, isEmpty);
      expect(r.goalCompleted, isFalse);
    });

    test('순환 참조가 있어도 멈추지 않는다', () {
      // a↔b 서로를 부모로 가리키는 오염 데이터. descendantIds의 방문 방어를
      // 물려받아 무한 루프 없이 계산이 끝나야 한다(결과가 무엇이든 크래시 없음).
      final r = resolveArchiveOnComplete([
        quest('a', goalId: 'g1', parentQuestId: 'b', status: QuestStatus.stuck),
        quest('b', goalId: 'g1', parentQuestId: 'a', status: QuestStatus.stuck),
        quest('c', goalId: 'g1'), // 방금 완료.
      ], 'c');

      // 크래시 없이 결과를 낸다. c만 done이라 목표는 미완(a·b가 stuck).
      expect(r.goalCompleted, isFalse);
    });
  });
}
