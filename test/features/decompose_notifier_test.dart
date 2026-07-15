import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/features/quest/decompose_notifier.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';
import 'package:one_step/repositories/decompose/quest_templates.dart';

/// [questDecomposerProvider]를 [scenario] Fake로 override한 컨테이너를 만든다.
/// 화면 없이 notifier만 직접 테스트한다.
ProviderContainer _containerFor(FakeDecomposeScenario scenario) {
  final container = ProviderContainer(
    overrides: [
      questDecomposerProvider.overrideWithValue(
        FakeQuestDecomposer(scenario: scenario),
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('DecomposeNotifier — 초기 상태', () {
    test('build가 null을 반환하므로 초기 상태는 AsyncData(null)', () async {
      final container = _containerFor(FakeDecomposeScenario.success);

      // 초기 build를 await한다.
      final initial = await container.read(decomposeNotifierProvider.future);
      expect(initial, isNull);

      final state = container.read(decomposeNotifierProvider);
      expect(state, isA<AsyncData<DecomposeState?>>());
      expect(state.value, isNull);
    });
  });

  group('DecomposeNotifier — success (AI 성공)', () {
    test('source=ai, drafts 비어있지 않음, goalText 보존', () async {
      final container = _containerFor(FakeDecomposeScenario.success);
      await container.read(decomposeNotifierProvider.future);

      await container
          .read(decomposeNotifierProvider.notifier)
          .decompose('공모전 지원하기');

      final state = container.read(decomposeNotifierProvider).value!;
      expect(state.source, DecomposeSource.ai);
      expect(state.drafts, isNotEmpty);
      expect(state.goalText, '공모전 지원하기');
    });
  });

  group('DecomposeNotifier — 폴백 경로 (모두 template으로 귀결)', () {
    test('empty → source=template, drafts는 templateFor 결과와 동일', () async {
      final container = _containerFor(FakeDecomposeScenario.empty);
      await container.read(decomposeNotifierProvider.future);

      await container
          .read(decomposeNotifierProvider.notifier)
          .decompose('아무거나 목표');

      final state = container.read(decomposeNotifierProvider).value!;
      expect(state.source, DecomposeSource.template);
      expect(state.drafts, isNotEmpty);
      // 폴백 시 drafts가 templateFor(goalText)와 값이 같은지 검증(데이터 공유).
      expect(state.drafts, equals(templateFor('아무거나 목표')));
    });

    test('timeout(NetworkFailure) → 예외가 밖으로 안 나오고 source=template', () async {
      final container = _containerFor(FakeDecomposeScenario.timeout);
      await container.read(decomposeNotifierProvider.future);

      // 크래시 없이 정상 완료되어야 한다(예외를 던지면 이 await에서 실패).
      await container
          .read(decomposeNotifierProvider.notifier)
          .decompose('공모전 지원하기');

      final state = container.read(decomposeNotifierProvider).value!;
      expect(state.source, DecomposeSource.template);
      expect(state.drafts, isNotEmpty);
      expect(state.drafts, equals(templateFor('공모전 지원하기')));
    });

    test('serverError(UnknownFailure) → source=template', () async {
      final container = _containerFor(FakeDecomposeScenario.serverError);
      await container.read(decomposeNotifierProvider.future);

      await container
          .read(decomposeNotifierProvider.notifier)
          .decompose('자격증 공부하기');

      final state = container.read(decomposeNotifierProvider).value!;
      expect(state.source, DecomposeSource.template);
      expect(state.drafts, equals(templateFor('자격증 공부하기')));
    });

    test('brokenJson(ParseFailure) → source=template', () async {
      final container = _containerFor(FakeDecomposeScenario.brokenJson);
      await container.read(decomposeNotifierProvider.future);

      await container
          .read(decomposeNotifierProvider.notifier)
          .decompose('포트폴리오 만들기');

      final state = container.read(decomposeNotifierProvider).value!;
      expect(state.source, DecomposeSource.template);
      expect(state.drafts, equals(templateFor('포트폴리오 만들기')));
    });
  });

  group('DecomposeNotifier — 편집 (저장 전 메모리 조작)', () {
    /// success 시나리오로 분해까지 끝낸 컨테이너를 준다.
    /// 공모전 템플릿(6개)이 로드된 상태.
    Future<ProviderContainer> decomposed() async {
      final container = _containerFor(FakeDecomposeScenario.success);
      await container.read(decomposeNotifierProvider.future);
      await container
          .read(decomposeNotifierProvider.notifier)
          .decompose('공모전 지원하기');
      return container;
    }

    List<QuestDraft> drafts(ProviderContainer c) =>
        c.read(decomposeNotifierProvider).value!.drafts;

    test('editTitle — 해당 draft만 제목이 바뀌고 나머지는 그대로', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      // 두 번째 항목만 바꾼다.
      final targetId = before[1].localId;
      final othersBefore = before.where((d) => d.localId != targetId).toList();

      notifier.editTitle(targetId, '새 제목');

      final after = drafts(container);
      final changed = after.firstWhere((d) => d.localId == targetId);
      expect(changed.title, '새 제목');
      // 나머지 항목은 값이 완전히 동일(== 로 단언 — QuestDraft가 값 비교).
      final othersAfter = after.where((d) => d.localId != targetId).toList();
      expect(othersAfter, equals(othersBefore));
      // 개수 불변.
      expect(after.length, before.length);
    });

    test('editTitle — 공백만 입력하면 무시(이전 값 유지)', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      final targetId = before.first.localId;
      final oldTitle = before.first.title;

      notifier.editTitle(targetId, '   ');

      final after = drafts(container);
      expect(after.first.title, oldTitle);
      // 목록 자체가 값으로 동일.
      expect(after, equals(before));
    });

    test('remove — 목록에서 사라지고 개수 -1, 남은 order가 0..n 연속', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      // 중간 항목을 지운다 — order 재색인이 실제로 필요한 위치.
      final targetId = before[2].localId;

      notifier.remove(targetId);

      final after = drafts(container);
      expect(after.length, before.length - 1);
      // 지운 항목은 없다.
      expect(after.where((d) => d.localId == targetId), isEmpty);
      // 남은 항목의 order가 구멍 없이 0,1,2,... 연속.
      for (var i = 0; i < after.length; i++) {
        expect(after[i].order, i);
      }
    });

    test('changeDifficulty — 해당 draft만 hard로, reward.coin==10', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      // easy 항목 하나를 고른다.
      final targetId = before
          .firstWhere((d) => d.difficulty == Difficulty.easy)
          .localId;
      final othersBefore = before.where((d) => d.localId != targetId).toList();

      notifier.changeDifficulty(targetId, Difficulty.hard);

      final after = drafts(container);
      final changed = after.firstWhere((d) => d.localId == targetId);
      expect(changed.difficulty, Difficulty.hard);
      // 보상도 파생되어 갱신된다.
      expect(changed.reward.coin, 10);
      expect(changed.reward.xp, 20);
      // 다른 항목은 불변.
      final othersAfter = after.where((d) => d.localId != targetId).toList();
      expect(othersAfter, equals(othersBefore));
    });

    test('상태가 null(초기)일 때 편집 메서드는 크래시 없이 무시된다', () {
      final container = _containerFor(FakeDecomposeScenario.success);
      final notifier = container.read(decomposeNotifierProvider.notifier);
      // 아직 분해 전 → state.valueOrNull == null.
      expect(
        () {
          notifier.editTitle('anything', '제목');
          notifier.remove('anything');
          notifier.changeDifficulty('anything', Difficulty.hard);
        },
        returnsNormally,
      );
      // 상태는 여전히 null.
      expect(container.read(decomposeNotifierProvider).value, isNull);
    });

    test('없는 localId로 편집해도 목록이 변하지 않는다', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);

      notifier.editTitle('없는-id', '무시됨');
      notifier.changeDifficulty('없는-id', Difficulty.hard);

      expect(drafts(container), equals(before));
    });
  });
}
