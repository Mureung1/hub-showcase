import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';
import 'package:one_step/repositories/decompose/quest_templates.dart';

void main() {
  group('FakeQuestDecomposer — success (데모 모드)', () {
    test('비어있지 않고 모든 draft의 난이도가 유효하다', () async {
      final ai = FakeQuestDecomposer();

      final drafts = await ai.decompose('무언가 도전하기');

      expect(drafts, isNotEmpty);
      // parseStrict를 통과한 것만 나오므로 난이도는 항상 유효하지만,
      // 회귀 방지를 위해 명시적으로 단언한다.
      expect(
        drafts.every((d) => Difficulty.values.contains(d.difficulty)),
        isTrue,
      );
    });

    test('목표 키워드로 유형이 매칭된다 (공모전 지원하기 → 공모전 유형)', () async {
      final ai = FakeQuestDecomposer();

      final drafts = await ai.decompose('공모전 지원하기');

      // 공모전 템플릿의 특징 문구가 포함돼야 한다.
      expect(
        drafts.any((d) => d.title.contains('공고')),
        isTrue,
        reason: '공모전 유형 템플릿이 선택되어야 한다',
      );
      // templateFor와 동일한 결과여야 한다(데모 모드가 템플릿을 그대로 노출).
      expect(drafts, equals(templateFor('공모전 지원하기')));
    });

    test('키워드가 매칭 안 되면 범용 세트를 반환한다 (비어있지 않음)', () async {
      final ai = FakeQuestDecomposer();

      final drafts = await ai.decompose('그냥 뭔가 해보기');

      expect(drafts, isNotEmpty);
      expect(drafts, equals(templateFor('그냥 뭔가 해보기')));
    });

    test('localId는 tpl-0부터, order는 0부터 순서대로 매겨진다', () async {
      final ai = FakeQuestDecomposer();

      final drafts = await ai.decompose('자격증 공부하기');

      for (var i = 0; i < drafts.length; i++) {
        expect(drafts[i].localId, 'tpl-$i');
        expect(drafts[i].order, i);
      }
    });
  });

  group('FakeQuestDecomposer — empty', () {
    test('빈 리스트를 반환한다 (던지지 않는다)', () async {
      final ai = FakeQuestDecomposer(scenario: FakeDecomposeScenario.empty);

      expect(await ai.decompose('아무거나'), isEmpty);
    });
  });

  group('FakeQuestDecomposer — 응답 검증(실제 parseList 통과)', () {
    test('brokenJson → ParseFailure', () async {
      final ai = FakeQuestDecomposer(scenario: FakeDecomposeScenario.brokenJson);

      expect(
        () => ai.decompose('x'),
        throwsA(isA<ParseFailure>()),
      );
    });

    test('missingField → 불량은 제외되고 정상 항목만 살아남는다', () async {
      final ai = FakeQuestDecomposer(scenario: FakeDecomposeScenario.missingField);

      final drafts = await ai.decompose('x');

      // 원본 4개 중 title/difficulty 누락 2개는 제외 → 정상 2개만.
      expect(drafts, hasLength(2));
      expect(drafts[0].title, '공고 페이지 열어 지원 자격 확인하기');
      expect(drafts[0].difficulty, Difficulty.easy);
      expect(drafts[1].title, '지원서 초안 한 단락 작성하기');
      expect(drafts[1].difficulty, Difficulty.hard);
      // 버려진 항목 때문에 order에 구멍이 나지 않는다.
      expect(drafts.map((d) => d.order), [0, 1]);
    });

    test('difficultyPollution → 오염 난이도 항목은 normal로 안 바뀌고 제외된다', () async {
      // 회귀 테스트: "매우어려움"을 조용히 normal로 떨어뜨리면 보상이 왜곡된다.
      final ai = FakeQuestDecomposer(
        scenario: FakeDecomposeScenario.difficultyPollution,
      );

      final drafts = await ai.decompose('x');

      // 정상 2개만 남는다.
      expect(drafts, hasLength(2));
      // 오염 항목("기출문제 한 회분 풀어 보기")이 결과에 절대 없어야 한다.
      expect(
        drafts.any((d) => d.title == '기출문제 한 회분 풀어 보기'),
        isFalse,
        reason: '오염 난이도 항목은 normal 폴백 없이 완전히 제외되어야 한다',
      );
      expect(drafts.map((d) => d.difficulty), [
        Difficulty.easy,
        Difficulty.normal,
      ]);
    });
  });

  group('FakeQuestDecomposer — 네트워크/서버 실패', () {
    test('timeout → NetworkFailure', () async {
      final ai = FakeQuestDecomposer(scenario: FakeDecomposeScenario.timeout);

      expect(
        () => ai.decompose('x'),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('serverError → UnknownFailure', () async {
      final ai = FakeQuestDecomposer(scenario: FakeDecomposeScenario.serverError);

      expect(
        () => ai.decompose('x'),
        throwsA(isA<UnknownFailure>()),
      );
    });

    test('delay가 지정되면 지연 후 정상 동작한다', () async {
      final ai = FakeQuestDecomposer(
        delay: const Duration(milliseconds: 20),
      );

      final sw = Stopwatch()..start();
      final drafts = await ai.decompose('공모전 지원하기');
      sw.stop();

      expect(drafts, isNotEmpty);
      expect(sw.elapsedMilliseconds, greaterThanOrEqualTo(15));
    });

    test('delay가 지정되면 timeout도 지연 후 던진다', () async {
      final ai = FakeQuestDecomposer(
        scenario: FakeDecomposeScenario.timeout,
        delay: const Duration(milliseconds: 20),
      );

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<NetworkFailure>()),
      );
    });
  });
}
