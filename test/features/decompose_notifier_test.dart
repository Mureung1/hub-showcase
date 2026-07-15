import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/features/quest/decompose_notifier.dart';
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
}
