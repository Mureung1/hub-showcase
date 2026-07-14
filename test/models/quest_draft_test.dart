import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/models/quest_status.dart';

/// checklist 2주차 · 마이크로 퀘스트 JSON 스키마 정의
/// - "스키마 검증기가 **필수 필드 누락·잘못된 난이도 값을 거부**한다"
/// - "필수 필드 누락 응답을 감지해 **해당 항목을 제외**하거나 폴백 처리한다"
///
/// `Quest.fromJson`(저장 문서용)과 정반대 정책이다. 저장된 문서는 관대하게 읽어야
/// 하지만(깨졌다고 화면이 죽으면 안 됨), **AI 응답은 엄격하게 걸러야 한다.**
/// 난이도가 곧 보상 등급(코인 3/5/10)이라, 오염된 난이도를 조용히 normal로
/// 떨어뜨리면 사용자가 받는 보상이 왜곡되기 때문이다.
void main() {
  group('정상 응답', () {
    test('올바른 항목은 통과한다', () {
      final draft = QuestDraft.parseStrict(
        {'title': '공모전 공고 3개 찾아보기', 'difficulty': 'easy'},
        localId: 'd0',
        order: 0,
      );

      expect(draft, isNotNull);
      expect(draft!.title, '공모전 공고 3개 찾아보기');
      expect(draft.difficulty, Difficulty.easy);
      expect(draft.reward.coin, 3);
      expect(draft.reward.xp, 5);
    });

    test('제목 앞뒤 공백은 잘린다', () {
      final draft = QuestDraft.parseStrict(
        {'title': '  공백  ', 'difficulty': 'hard'},
        localId: 'd0',
        order: 0,
      );

      expect(draft!.title, '공백');
    });
  });

  group('필수 필드 누락 — 거부해야 한다', () {
    test('title이 없으면 거부', () {
      expect(
        QuestDraft.parseStrict(
          {'difficulty': 'easy'},
          localId: 'd0',
          order: 0,
        ),
        isNull,
      );
    });

    test('title이 공백뿐이면 거부', () {
      expect(
        QuestDraft.parseStrict(
          {'title': '   ', 'difficulty': 'easy'},
          localId: 'd0',
          order: 0,
        ),
        isNull,
      );
    });

    test('title이 문자열이 아니면 거부', () {
      expect(
        QuestDraft.parseStrict(
          {'title': 42, 'difficulty': 'easy'},
          localId: 'd0',
          order: 0,
        ),
        isNull,
      );
    });

    test('difficulty가 없으면 거부', () {
      expect(
        QuestDraft.parseStrict({'title': 'x'}, localId: 'd0', order: 0),
        isNull,
      );
    });

    test('항목이 Map이 아니면 거부', () {
      expect(QuestDraft.parseStrict('문자열', localId: 'd0', order: 0), isNull);
      expect(QuestDraft.parseStrict(null, localId: 'd0', order: 0), isNull);
    });
  });

  group('★ 난이도 오염 — 조용히 normal로 떨어뜨리지 않고 거부한다', () {
    // 이게 이 파일의 존재 이유다.
    // Quest.fromJson은 fromNameOrDefault를 써서 모르는 난이도를 normal로 만든다.
    // AI 응답에 그 정책을 쓰면, AI가 "매우어려움"(코인 10을 의도)을 뱉었을 때
    // 조용히 normal(코인 5)이 되어 사용자가 받을 보상이 절반으로 깎인다.
    test('모르는 난이도 문자열은 거부한다', () {
      expect(
        QuestDraft.parseStrict(
          {'title': 'x', 'difficulty': '매우어려움'},
          localId: 'd0',
          order: 0,
        ),
        isNull,
      );
    });

    test('난이도가 숫자면 거부한다', () {
      expect(
        QuestDraft.parseStrict(
          {'title': 'x', 'difficulty': 3},
          localId: 'd0',
          order: 0,
        ),
        isNull,
      );
    });

    test('빈 난이도는 거부한다', () {
      expect(
        QuestDraft.parseStrict(
          {'title': 'x', 'difficulty': ''},
          localId: 'd0',
          order: 0,
        ),
        isNull,
      );
    });

    test('대소문자·공백은 관대하게 받아준다 (오염이 아니다)', () {
      final draft = QuestDraft.parseStrict(
        {'title': 'x', 'difficulty': '  HARD '},
        localId: 'd0',
        order: 0,
      );

      expect(draft!.difficulty, Difficulty.hard);
    });
  });

  group('목록 파싱 — 불량 항목만 버리고 나머지는 살린다', () {
    test('정상 항목은 살리고 불량 항목은 제외한다', () {
      final drafts = QuestDraft.parseList([
        {'title': '공고 찾기', 'difficulty': 'easy'},
        {'difficulty': 'normal'}, // title 누락 → 제외
        {'title': '지원서 초안', 'difficulty': 'hard'},
        {'title': '제출하기', 'difficulty': '매우어려움'}, // 난이도 오염 → 제외
        {'title': '피드백 받기', 'difficulty': 'normal'},
      ]);

      expect(drafts, hasLength(3));
      expect(drafts.map((d) => d.title), ['공고 찾기', '지원서 초안', '피드백 받기']);
    });

    test('버려진 항목 때문에 order에 구멍이 나지 않는다', () {
      // 순서가 곧 실행 경로다. 0, 2, 4 처럼 구멍이 나면 안 된다.
      final drafts = QuestDraft.parseList([
        {'title': 'A', 'difficulty': 'easy'},
        {'title': '', 'difficulty': 'easy'}, // 제외
        {'title': 'B', 'difficulty': 'easy'},
        {'title': 'C', 'difficulty': '이상함'}, // 제외
        {'title': 'D', 'difficulty': 'easy'},
      ]);

      expect(drafts.map((d) => d.order), [0, 1, 2]);
      expect(drafts.map((d) => d.title), ['A', 'B', 'D']);
    });

    test('전부 불량이면 빈 목록 (폴백이 필요한 신호)', () {
      final drafts = QuestDraft.parseList([
        {'difficulty': 'easy'},
        {'title': 'x', 'difficulty': '이상함'},
      ]);

      expect(drafts, isEmpty);
    });

    test('배열이 아니면 빈 목록', () {
      expect(QuestDraft.parseList({'not': 'a list'}), isEmpty);
      expect(QuestDraft.parseList(null), isEmpty);
    });
  });

  group('확정 → Quest 변환', () {
    test('저장 가능한 Quest가 되고 goalId로 원본 목표와 연결된다', () {
      const draft = QuestDraft(
        localId: 'd0',
        title: '공고 찾기',
        difficulty: Difficulty.hard,
        order: 0,
      );

      final quest = draft.toQuest(id: 'q1', goalId: 'goal-1', order: 3);

      expect(quest.id, 'q1');
      expect(quest.title, '공고 찾기');
      expect(quest.difficulty, Difficulty.hard);
      expect(quest.status, QuestStatus.todo);
      expect(quest.goalId, 'goal-1');
      expect(quest.order, 3);
      expect(quest.reward.coin, 10);
    });
  });
}
