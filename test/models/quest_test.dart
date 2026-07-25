import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_source.dart';
import 'package:one_step/models/quest_status.dart';

/// checklist 1주차 · 퀘스트 데이터 모델
/// - "JSON ↔ 모델 직렬화/역직렬화가 왕복 손실 없이 동작한다"
/// - "필드 누락·타입 불일치 시 파싱이 예외를 던지거나 기본값으로 안전 처리한다"
void main() {
  group('JSON 왕복', () {
    test('모든 필드가 손실 없이 복원된다', () {
      final original = Quest(
        id: 'q1',
        title: '공모전 공고 3개 찾아보기',
        difficulty: Difficulty.hard,
        deadline: DateTime.utc(2026, 8, 1),
        status: QuestStatus.done,
        order: 2,
        goalId: 'goal-1',
        parentQuestId: 'q0',
        createdAt: DateTime.utc(2026, 7, 14, 9),
        completedAt: DateTime.utc(2026, 7, 14, 18),
        rewardedAt: DateTime.utc(2026, 7, 14, 18),
      );

      final restored = Quest.fromJson('q1', original.toJson());

      expect(restored, original);
      expect(restored.toJson(), original.toJson());
    });

    test('선택 필드가 null인 퀘스트도 왕복한다', () {
      const original = Quest(id: 'q1', title: '제목만 있는 퀘스트');

      final restored = Quest.fromJson('q1', original.toJson());

      expect(restored, original);
      expect(restored.deadline, isNull);
      expect(restored.done, isFalse);
    });
  });

  group('rewardedAt — 보상 지급 이력 (파밍 차단의 근거)', () {
    test('rewardedAt이 왕복 직렬화된다', () {
      final original = Quest(
        id: 'q1',
        title: '보상 받은 퀘스트',
        status: QuestStatus.done,
        completedAt: DateTime.utc(2026, 7, 14, 18),
        rewardedAt: DateTime.utc(2026, 7, 14, 18),
      );

      final restored = Quest.fromJson('q1', original.toJson());

      expect(restored.rewardedAt, DateTime.utc(2026, 7, 14, 18));
      expect(restored.isRewarded, isTrue);
      expect(restored, original);
    });

    test('rewardedAt이 없으면 키를 남기지 않고 미지급으로 읽힌다', () {
      const original = Quest(id: 'q1', title: '아직 미지급');

      expect(original.toJson().containsKey('rewardedAt'), isFalse);
      expect(Quest.fromJson('q1', original.toJson()).isRewarded, isFalse);
    });

    test('rewardedAt이 없는 구버전 문서도 그대로 읽힌다 (하위호환)', () {
      // 이 필드 도입 전에 저장된 문서. 미지급으로 취급된다 —
      // 데모 단계에서 수용하기로 한 알려진 손실이다.
      final quest = Quest.fromJson('q1', {
        'title': '구버전 완료 퀘스트',
        'status': 'done',
        'completedAt': DateTime.utc(2026, 1, 1),
      });

      expect(quest.done, isTrue);
      expect(quest.isRewarded, isFalse);
    });

    test('★ 완료를 해제해도 rewardedAt은 지워지지 않는다', () {
      // 여기가 파밍 차단의 핵심이다. completedAt은 지워지지만 지급 이력은 남는다.
      final rewarded = Quest(
        id: 'q1',
        title: 'x',
        rewardedAt: DateTime.utc(2026, 7, 14, 18),
      ).withStatus(QuestStatus.done);

      final undone = rewarded.withStatus(QuestStatus.todo);

      expect(undone.completedAt, isNull, reason: '완료 시각은 지워진다');
      expect(undone.rewardedAt, DateTime.utc(2026, 7, 14, 18));
      expect(undone.isRewarded, isTrue);
    });

    test('★ 멈춤으로 전이해도 rewardedAt은 지워지지 않는다', () {
      final quest = Quest(
        id: 'q1',
        title: 'x',
        rewardedAt: DateTime.utc(2026, 7, 14, 18),
      ).withStatus(QuestStatus.stuck);

      expect(quest.completedAt, isNull);
      expect(quest.rewardedAt, DateTime.utc(2026, 7, 14, 18));
    });

    test('withStatus를 여러 번 오가도 rewardedAt은 최초 값을 유지한다', () {
      final at = DateTime.utc(2026, 7, 14, 18);
      var quest = Quest(id: 'q1', title: 'x', rewardedAt: at);

      for (var i = 0; i < 3; i++) {
        quest = quest
            .withStatus(QuestStatus.done)
            .withStatus(QuestStatus.todo)
            .withStatus(QuestStatus.stuck);
      }

      expect(quest.rewardedAt, at);
    });
  });

  group('memo — 인증 메모 (3주차-B)', () {
    test('메모가 왕복 직렬화된다', () {
      const original = Quest(
        id: 'q1',
        title: '인증한 퀘스트',
        memo: '카페에서 2시간 썼다',
      );

      final restored = Quest.fromJson('q1', original.toJson());

      expect(restored.memo, '카페에서 2시간 썼다');
      expect(restored.isVerified, isTrue);
      expect(restored, original);
    });

    test('메모가 없으면 키를 남기지 않고 미인증으로 읽힌다', () {
      const original = Quest(id: 'q1', title: '메모 없음');

      expect(original.toJson().containsKey('memo'), isFalse);
      expect(Quest.fromJson('q1', original.toJson()).isVerified, isFalse);
    });

    test('공백뿐인 메모는 null로 정규화된다 (인증 불성립)', () {
      // 스페이스만 쳐도 인증으로 쳐 주면 보너스가 공짜가 된다.
      // 모델 경계에서 미리 막는다.
      final quest = Quest.fromJson('q1', {'title': 'x', 'memo': '   '});

      expect(quest.memo, isNull);
      expect(quest.isVerified, isFalse);
    });

    test('★ 완료를 해제해도 메모는 지워지지 않는다', () {
      // 사용자가 직접 쓴 글이다. 체크를 잘못 눌렀다는 이유로 사라지면
      // 되돌릴 방법이 없다(rewardedAt을 보존하는 것과 같은 이유).
      final done = const Quest(
        id: 'q1',
        title: 'x',
        memo: '남긴 글',
      ).withStatus(QuestStatus.done);

      final undone = done.withStatus(QuestStatus.todo);

      expect(undone.completedAt, isNull, reason: '완료 시각은 지워진다');
      expect(undone.memo, '남긴 글');
    });

    test('★ 멈춤으로 전이해도 메모는 남는다', () {
      final quest = const Quest(
        id: 'q1',
        title: 'x',
        memo: '여기서 막혔다',
      ).withStatus(QuestStatus.stuck);

      expect(quest.memo, '여기서 막혔다');
    });

    test('copyWith로 메모를 덧붙일 수 있다', () {
      const quest = Quest(id: 'q1', title: 'x');

      expect(quest.copyWith(memo: '나중에 쓴 글').memo, '나중에 쓴 글');
      // null을 주면 기존 값이 유지된다(copyWith의 null 병합 규칙).
      expect(quest.copyWith(memo: '있음').copyWith(memo: null).memo, '있음');
    });

    test('메모가 다르면 다른 퀘스트로 취급된다', () {
      const a = Quest(id: 'q1', title: 'x', memo: 'A');
      const b = Quest(id: 'q1', title: 'x', memo: 'B');

      expect(a, isNot(b));
      expect(a, Quest(id: 'q1', title: 'x', memo: 'A'));
    });
  });

  group('진행 상태 3상태 (plan.md: 완료·미완료·멈춤)', () {
    test('기본 상태는 todo(미완료)다', () {
      final quest = Quest.fromJson('q1', {'title': 'x'});

      expect(quest.status, QuestStatus.todo);
      expect(quest.done, isFalse);
      expect(quest.isStuck, isFalse);
    });

    test('멈춤 상태를 저장하고 다시 읽을 수 있다', () {
      // 「재분해 복귀율」 지표의 분모가 이 상태다. 저장이 안 되면 지표를 못 만든다.
      const quest = Quest(id: 'q1', title: 'x', status: QuestStatus.stuck);

      final restored = Quest.fromJson('q1', quest.toJson());

      expect(restored.status, QuestStatus.stuck);
      expect(restored.isStuck, isTrue);
      expect(restored.done, isFalse);
    });

    test('완료를 해제하면 완료 시각도 지워진다', () {
      final done = const Quest(
        id: 'q1',
        title: 'x',
      ).withStatus(QuestStatus.done);
      expect(done.completedAt, isNotNull);

      final undone = done.withStatus(QuestStatus.todo);

      expect(undone.status, QuestStatus.todo);
      expect(undone.completedAt, isNull);
    });

    test('멈춤으로 전이해도 완료 시각은 남지 않는다', () {
      final stuck = const Quest(
        id: 'q1',
        title: 'x',
      ).withStatus(QuestStatus.done).withStatus(QuestStatus.stuck);

      expect(stuck.status, QuestStatus.stuck);
      expect(stuck.completedAt, isNull);
    });
  });

  group('하위호환 — status 도입 전에 저장된 문서', () {
    // 이미 Firestore에 `done: true/false`만 가진 문서가 있다.
    // 마이그레이션 없이 그 문서들이 그대로 읽혀야 한다.
    test('status가 없고 done: true면 완료로 읽힌다', () {
      final quest = Quest.fromJson('q1', {'title': 'x', 'done': true});

      expect(quest.status, QuestStatus.done);
      expect(quest.done, isTrue);
    });

    test('status가 없고 done: false면 미완료로 읽힌다', () {
      final quest = Quest.fromJson('q1', {'title': 'x', 'done': false});

      expect(quest.status, QuestStatus.todo);
    });

    test('status가 있으면 status가 이긴다 (done보다 우선)', () {
      final quest = Quest.fromJson('q1', {
        'title': 'x',
        'status': 'stuck',
        'done': false,
      });

      expect(quest.status, QuestStatus.stuck);
    });

    test('모르는 status 값은 todo로 떨어진다', () {
      final quest = Quest.fromJson('q1', {'title': 'x', 'status': '이상한값'});

      expect(quest.status, QuestStatus.todo);
    });
  });

  group('goalId · parentQuestId (재분해 추적)', () {
    test('직접 등록한 퀘스트는 goalId가 없다', () {
      final quest = Quest.fromJson('q1', {'title': 'x'});

      expect(quest.goalId, isNull);
      expect(quest.parentQuestId, isNull);
    });

    test('빈 문자열 goalId는 null로 읽힌다', () {
      // 빈 ID로 goals 문서를 조회하면 안 된다.
      final quest = Quest.fromJson('q1', {'title': 'x', 'goalId': '  '});

      expect(quest.goalId, isNull);
    });

    test('재분해 자식은 parentQuestId로 원본과 연결된다', () {
      const quest = Quest(
        id: 'q2',
        title: '더 작게 쪼갠 퀘스트',
        goalId: 'goal-1',
        parentQuestId: 'q1',
      );

      final restored = Quest.fromJson('q2', quest.toJson());

      expect(restored.goalId, 'goal-1');
      expect(restored.parentQuestId, 'q1');
    });
  });

  group('source — 출처 (회귀 A: 카드 출처 칩의 근거)', () {
    test('명시된 출처가 왕복 직렬화된다 (manual)', () {
      const original = Quest(
        id: 'q1',
        title: '직접 등록',
        goalId: 'g1',
        source: QuestSource.manual,
      );

      final restored = Quest.fromJson('q1', original.toJson());

      expect(original.toJson()['source'], 'manual');
      expect(restored.source, QuestSource.manual);
      expect(restored.effectiveSource, QuestSource.manual);
      expect(restored.isAiGenerated, isFalse);
      expect(restored, original);
    });

    test('명시된 출처가 왕복 직렬화된다 (ai)', () {
      const original = Quest(
        id: 'q1',
        title: 'AI 분해',
        goalId: 'g1',
        source: QuestSource.ai,
      );

      final restored = Quest.fromJson('q1', original.toJson());

      expect(original.toJson()['source'], 'ai');
      expect(restored.source, QuestSource.ai);
      expect(restored.isAiGenerated, isTrue);
    });

    test('source가 없으면 키를 남기지 않는다 (구 문서 스키마 유지)', () {
      const original = Quest(id: 'q1', title: 'x');

      expect(original.toJson().containsKey('source'), isFalse);
    });

    test('★ 하위호환: source 없고 goalId 있으면 AI로 폴백한다 (구 AI 데이터)', () {
      // 이 필드 도입 전에 저장된 AI 분해 문서. 계속 AI로 보여야 한다.
      final quest = Quest.fromJson('q1', {'title': '구 AI 데이터', 'goalId': 'g1'});

      expect(quest.source, isNull, reason: '문서엔 명시값이 없다');
      expect(quest.effectiveSource, QuestSource.ai);
      expect(quest.isAiGenerated, isTrue);
    });

    test('★ 하위호환: source 없고 goalId 없으면 직접으로 폴백한다 (구 낱개 데이터)', () {
      // 이 필드 도입 전에 저장된 직접 등록(낱개) 문서.
      final quest = Quest.fromJson('q1', {'title': '구 낱개 데이터'});

      expect(quest.source, isNull);
      expect(quest.effectiveSource, QuestSource.manual);
      expect(quest.isAiGenerated, isFalse);
    });

    test('명시된 source가 goalId 폴백을 이긴다 (goalId 있어도 manual이면 직접)', () {
      // 회귀 A의 정확한 상황: 직접 등록이지만 목표 폴더에 묶여 goalId가 있다.
      final quest = Quest.fromJson('q1', {
        'title': '직접 등록인데 폴더에 묶임',
        'goalId': 'g1',
        'source': 'manual',
      });

      expect(quest.effectiveSource, QuestSource.manual);
      expect(quest.isAiGenerated, isFalse);
    });

    test('모르는 source 값은 무시하고 goalId 폴백을 쓴다 (관대)', () {
      final quest = Quest.fromJson('q1', {
        'title': 'x',
        'goalId': 'g1',
        'source': '이상한값',
      });

      expect(quest.source, isNull, reason: '엄격 파싱 — 모르는 값은 버린다');
      expect(quest.effectiveSource, QuestSource.ai, reason: 'goalId 폴백');
    });

    test('withStatus 전이에도 source는 보존된다', () {
      const quest = Quest(
        id: 'q1',
        title: 'x',
        goalId: 'g1',
        source: QuestSource.manual,
      );

      final done = quest.withStatus(QuestStatus.done);
      final undone = done.withStatus(QuestStatus.todo);

      expect(done.source, QuestSource.manual);
      expect(undone.source, QuestSource.manual);
    });
  });

  group('필드 누락 · 기본값', () {
    test('난이도가 없으면 보통(normal)이다', () {
      final quest = Quest.fromJson('q1', {'title': '무언가 하기'});

      expect(quest.difficulty, Difficulty.normal);
      expect(quest.done, isFalse);
      expect(quest.deadline, isNull);
      expect(quest.order, 0);
    });

    test('모르는 난이도 값은 보통(normal)으로 떨어진다', () {
      final quest = Quest.fromJson('q1', {
        'title': '무언가 하기',
        'difficulty': '매우어려움',
      });

      expect(quest.difficulty, Difficulty.normal);
    });
  });

  group('타입 불일치 안전 처리', () {
    test('done이 문자열 "true"여도 bool로 변환된다', () {
      final quest = Quest.fromJson('q1', {'title': 'x', 'done': 'true'});

      expect(quest.done, isTrue);
    });

    test('order가 문자열이어도 int로 변환된다', () {
      final quest = Quest.fromJson('q1', {'title': 'x', 'order': '3'});

      expect(quest.order, 3);
    });

    test('difficulty가 숫자여도 크래시하지 않고 보통으로 떨어진다', () {
      final quest = Quest.fromJson('q1', {'title': 'x', 'difficulty': 42});

      expect(quest.difficulty, Difficulty.normal);
    });
  });

  group('필수 필드 검증 — 여기서는 예외를 던진다', () {
    test('title이 없으면 FormatException', () {
      expect(
        () => Quest.fromJson('q1', {'difficulty': 'easy'}),
        throwsFormatException,
      );
    });

    test('title이 공백뿐이면 FormatException', () {
      expect(
        () => Quest.fromJson('q1', {'title': '   '}),
        throwsFormatException,
      );
    });

    test('id가 비어 있으면 FormatException', () {
      expect(() => Quest.fromJson('', {'title': 'x'}), throwsFormatException);
    });

    test('tryParse는 예외 대신 null을 준다', () {
      expect(Quest.tryParse('q1', {'title': ''}), isNull);
      expect(Quest.tryParse('q1', {'title': '정상'}), isNotNull);
    });

    test('불량 항목만 걸러내고 정상 항목은 살린다 (2주차 AI 응답 대비)', () {
      // AI가 뱉은 목록에 제목 없는 항목이 섞여 있는 상황.
      final raw = <String, Map<String, dynamic>>{
        'q1': {'title': '공고 찾기', 'difficulty': 'easy'},
        'q2': {'difficulty': 'normal'}, // title 누락 → 버려져야 한다
        'q3': {'title': '지원서 초안', 'difficulty': 'hard'},
      };

      final quests = raw.entries
          .map((e) => Quest.tryParse(e.key, e.value))
          .whereType<Quest>()
          .toList();

      expect(quests, hasLength(2));
      expect(quests.map((q) => q.id), ['q1', 'q3']);
    });
  });

  group('난이도별 보상', () {
    test('쉬움 = 코인3 / XP5', () {
      const quest = Quest(id: 'q', title: 'x', difficulty: Difficulty.easy);

      expect(quest.reward.coin, 3);
      expect(quest.reward.xp, 5);
    });

    test('보통 = 코인5 / XP10', () {
      const quest = Quest(id: 'q', title: 'x', difficulty: Difficulty.normal);

      expect(quest.reward.coin, 5);
      expect(quest.reward.xp, 10);
    });

    test('어려움 = 코인10 / XP20', () {
      const quest = Quest(id: 'q', title: 'x', difficulty: Difficulty.hard);

      expect(quest.reward.coin, 10);
      expect(quest.reward.xp, 20);
    });
  });
}
