import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/features/quest/decompose_notifier.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/goal.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';
import 'package:one_step/repositories/decompose/quest_templates.dart';
import 'package:one_step/repositories/goal_repository.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';
import 'package:one_step/repositories/quest_decomposer.dart';

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

/// 호출마다 다른 응답을 내는 테스트용 분해기.
///
/// 하나의 컨테이너에서 **첫 분해와 재생성이 서로 다른 결과**를 내야 하는데
/// (예: 첫 분해 성공 → 재생성 실패), `overrideWithValue`는 인스턴스 하나로 고정된다.
/// 그래서 호출 순서대로 진짜 [FakeQuestDecomposer]에 위임해 시나리오를 갈아 끼운다.
/// 스텝을 넘겨 호출하면 마지막 스텝을 반복한다.
class _ScriptedDecomposer implements QuestDecomposer {
  _ScriptedDecomposer(this._steps);

  final List<QuestDecomposer> _steps;
  int _call = 0;

  @override
  Future<List<QuestDraft>> decompose(String goal) {
    final i = _call < _steps.length ? _call : _steps.length - 1;
    _call++;
    return _steps[i].decompose(goal);
  }

  // 이 스크립트형 분해기는 decompose 순서만 다룬다. redecompose를 쓰는 테스트는
  // 아래 [_SplitScenarioDecomposer]를 쓰므로 여기선 마지막 스텝에 위임만 한다.
  @override
  Future<List<QuestDraft>> redecompose({
    required String goalText,
    required QuestDraft item,
  }) {
    final i = _call < _steps.length ? _call : _steps.length - 1;
    _call++;
    return _steps[i].redecompose(goalText: goalText, item: item);
  }
}

/// decompose와 redecompose에 **서로 다른 시나리오**를 물리는 테스트용 분해기.
///
/// "첫 분해는 성공(카드가 떠야 함) + 재분해만 실패(원본 보존 검증)"처럼 두 경로의
/// 결과가 달라야 하는 케이스용이다. 호출 순서(call count)로 스크립트하는
/// [_ScriptedDecomposer]와 달리, **어느 메서드냐**로 갈라 위임한다.
class _SplitScenarioDecomposer implements QuestDecomposer {
  _SplitScenarioDecomposer({required this.onDecompose, required this.onRedecompose});

  final QuestDecomposer onDecompose;
  final QuestDecomposer onRedecompose;

  @override
  Future<List<QuestDraft>> decompose(String goal) => onDecompose.decompose(goal);

  @override
  Future<List<QuestDraft>> redecompose({
    required String goalText,
    required QuestDraft item,
  }) => onRedecompose.redecompose(goalText: goalText, item: item);
}

/// decompose·redecompose 시나리오를 따로 주입한 컨테이너.
ProviderContainer _redecomposeContainer({
  required FakeQuestDecomposer onDecompose,
  required FakeQuestDecomposer onRedecompose,
}) {
  final container = ProviderContainer(
    overrides: [
      questDecomposerProvider.overrideWithValue(
        _SplitScenarioDecomposer(
          onDecompose: onDecompose,
          onRedecompose: onRedecompose,
        ),
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

/// 스크립트형 분해기를 주입한 컨테이너.
ProviderContainer _scriptedContainer(List<QuestDecomposer> steps) {
  final container = ProviderContainer(
    overrides: [
      questDecomposerProvider.overrideWithValue(_ScriptedDecomposer(steps)),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

FakeQuestDecomposer _fake(
  FakeDecomposeScenario scenario, {
  Duration? delay,
}) => FakeQuestDecomposer(scenario: scenario, delay: delay);

/// confirm() 테스트는 분해기 하나로는 부족하다 — 저장 경로(session·goal·quest)가
/// 전부 필요하다. 그래서 저장소 4종 + 분해기를 모두 주입한 컨테이너를 만들고,
/// 저장 결과를 들여다볼 수 있도록 quest·goal 저장소 참조를 함께 돌려준다.
typedef _SavingSetup = ({
  ProviderContainer container,
  InMemoryQuestRepository questRepo,
  InMemoryGoalRepository goalRepo,
});

_SavingSetup _savingContainer({
  FakeDecomposeScenario scenario = FakeDecomposeScenario.success,
  AppFailure? goalFail,
  AppFailure? questFail,
  GoalRepository? goalRepoOverride,
  List<Quest> seedQuests = const [],
}) {
  const uid = 'test-uid';
  final questRepo = InMemoryQuestRepository(
    seed: seedQuests,
    failWith: questFail,
  );
  final goalRepo = InMemoryGoalRepository(failWith: goalFail);
  final userRepo = InMemoryUserRepository(seed: AppUser.initial(uid));
  addTearDown(questRepo.dispose);
  addTearDown(userRepo.dispose);

  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(
        FakeAuthRepository(initialUid: uid),
      ),
      userRepositoryProvider.overrideWithValue(userRepo),
      questRepositoryProvider.overrideWithValue(questRepo),
      goalRepositoryProvider.overrideWithValue(goalRepoOverride ?? goalRepo),
      questDecomposerProvider.overrideWithValue(
        FakeQuestDecomposer(scenario: scenario),
      ),
    ],
  );
  addTearDown(container.dispose);
  return (container: container, questRepo: questRepo, goalRepo: goalRepo);
}

/// createGoal이 [delay] 뒤에 완료되는 느린 목표 저장소.
///
/// confirm()의 저장 경로를 일부러 지연시켜 **in-flight(isSaving=true)** 프레임을
/// 관찰하기 위한 것이다(중복 탭 방지 테스트). regenerateAll의 delay가 분해기에
/// 걸렸던 것과 달리, confirm의 느린 지점은 저장소라 여기에 지연을 준다.
class _SlowGoalRepository implements GoalRepository {
  _SlowGoalRepository(this.delay);

  final Duration delay;
  final InMemoryGoalRepository _inner = InMemoryGoalRepository();

  @override
  Future<Goal> createGoal(String uid, String text) async {
    await Future<void>.delayed(delay);
    return _inner.createGoal(uid, text);
  }

  @override
  Future<Goal> fetchGoal(String uid, String goalId) =>
      _inner.fetchGoal(uid, goalId);
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

  group('DecomposeNotifier — 전체 재생성 (regenerateAll)', () {
    List<QuestDraft> drafts(ProviderContainer c) =>
        c.read(decomposeNotifierProvider).value!.drafts;
    DecomposeState state(ProviderContainer c) =>
        c.read(decomposeNotifierProvider).value!;

    test('성공: 편집한 목록이 새 결과로 대체되고 source=ai, isRegenerating=false', () async {
      // 첫 분해 성공 → 재생성도 성공(같은 결정적 결과).
      final container = _scriptedContainer([
        _fake(FakeDecomposeScenario.success),
        _fake(FakeDecomposeScenario.success),
      ]);
      final notifier = container.read(decomposeNotifierProvider.notifier);
      await container.read(decomposeNotifierProvider.future);
      await notifier.decompose('공모전 지원하기');

      // 편집으로 목록을 바꿔 둔다(제목 수정).
      final targetId = drafts(container).first.localId;
      notifier.editTitle(targetId, '내가 고친 제목');
      expect(
        drafts(container).first.title,
        '내가 고친 제목',
        reason: '재생성 전에는 편집이 반영돼 있어야 한다',
      );

      final ok = await notifier.regenerateAll();

      expect(ok, isTrue);
      // 재생성 성공 = do-over: 편집이 새(편집 전) 목록으로 대체된다.
      expect(drafts(container), equals(templateFor('공모전 지원하기')));
      expect(drafts(container).first.title, isNot('내가 고친 제목'));
      expect(state(container).source, DecomposeSource.ai);
      expect(state(container).isRegenerating, isFalse);
    });

    test('실패 시 보존(핵심): drafts 불변 + false 반환 + isRegenerating=false', () async {
      // 첫 분해 성공 → 재생성은 timeout(NetworkFailure)으로 실패.
      final container = _scriptedContainer([
        _fake(FakeDecomposeScenario.success),
        _fake(FakeDecomposeScenario.timeout),
      ]);
      final notifier = container.read(decomposeNotifierProvider.notifier);
      await container.read(decomposeNotifierProvider.future);
      await notifier.decompose('공모전 지원하기');

      // 사용자가 편집한 상태를 만든다 — 이걸 실패 때문에 날리면 안 된다.
      final targetId = drafts(container).first.localId;
      notifier.editTitle(targetId, '지켜야 할 편집');
      notifier.remove(drafts(container).last.localId);
      final before = drafts(container); // 재생성 직전 스냅샷(값 비교용).

      final ok = await notifier.regenerateAll();

      expect(ok, isFalse, reason: '재생성 실패 → false');
      // 실패했으므로 편집한 목록이 그대로 보존된다(템플릿으로 덮이지 않음).
      expect(drafts(container), equals(before));
      expect(drafts(container).first.title, '지켜야 할 편집');
      expect(state(container).isRegenerating, isFalse);
    });

    test('빈 결과 시 보존: 재생성이 빈 리스트를 내면 false + 기존 유지', () async {
      // 첫 분해 성공 → 재생성은 empty([]) 반환.
      final container = _scriptedContainer([
        _fake(FakeDecomposeScenario.success),
        _fake(FakeDecomposeScenario.empty),
      ]);
      final notifier = container.read(decomposeNotifierProvider.notifier);
      await container.read(decomposeNotifierProvider.future);
      await notifier.decompose('공모전 지원하기');
      final before = drafts(container);

      final ok = await notifier.regenerateAll();

      expect(ok, isFalse);
      // 빈 결과로 덮지 않는다 — 기존 결과 보존.
      expect(drafts(container), equals(before));
      expect(state(container).isRegenerating, isFalse);
    });

    test('중복요청 방지: isRegenerating 중 재호출은 즉시 false + 상태 불변', () async {
      // 재생성이 오래 걸리게 delay를 준다 → in-flight 상태를 관찰한다.
      final container = _scriptedContainer([
        _fake(FakeDecomposeScenario.success),
        _fake(
          FakeDecomposeScenario.success,
          delay: const Duration(milliseconds: 50),
        ),
      ]);
      final notifier = container.read(decomposeNotifierProvider.notifier);
      await container.read(decomposeNotifierProvider.future);
      await notifier.decompose('공모전 지원하기');

      // 첫 재생성 시작 — await 전에 isRegenerating이 true로 켜진다.
      final first = notifier.regenerateAll();
      expect(state(container).isRegenerating, isTrue);
      final snapshot = state(container);

      // 진행 중 재호출 → 즉시 false, 상태 불변.
      final second = await notifier.regenerateAll();
      expect(second, isFalse);
      expect(state(container), equals(snapshot));

      // 첫 요청은 정상 완료.
      expect(await first, isTrue);
      expect(state(container).isRegenerating, isFalse);
    });

    test('null 상태(분해 전): regenerateAll은 false를 반환하고 크래시 없다', () async {
      final container = _containerFor(FakeDecomposeScenario.success);
      final notifier = container.read(decomposeNotifierProvider.notifier);
      await container.read(decomposeNotifierProvider.future);

      final ok = await notifier.regenerateAll();

      expect(ok, isFalse);
      expect(container.read(decomposeNotifierProvider).value, isNull);
    });
  });

  group('DecomposeNotifier — 확정 등록 (confirm)', () {
    const uid = 'test-uid';

    DecomposeState state(ProviderContainer c) =>
        c.read(decomposeNotifierProvider).value!;

    /// success로 분해까지 끝낸 setup을 준다(공모전 템플릿 6개 로드).
    Future<_SavingSetup> decomposed(_SavingSetup setup) async {
      await setup.container.read(decomposeNotifierProvider.future);
      await setup.container
          .read(decomposeNotifierProvider.notifier)
          .decompose('공모전 지원하기');
      return setup;
    }

    test('성공: true 반환 + quests가 goalId와 함께 저장 + goal 저장 + 상태 null 리셋', () async {
      final setup = await decomposed(_savingContainer());
      final notifier = setup.container.read(decomposeNotifierProvider.notifier);
      final drafts = state(setup.container).drafts;

      final ok = await notifier.confirm();

      expect(ok, isTrue);
      // 성공 시 상태는 null로 리셋된다(화면 pop 후 재진입이 깨끗하도록).
      expect(setup.container.read(decomposeNotifierProvider).value, isNull);

      // quests에 draft 전부가 저장됐고, 모두 같은 goalId를 가리킨다.
      final saved = await setup.questRepo.fetchQuests(uid);
      expect(saved.length, drafts.length);
      final goalId = saved.first.goalId;
      expect(goalId, isNotNull);
      expect(saved.every((q) => q.goalId == goalId), isTrue);

      // 그 goalId가 실제 goalRepo의 원본 목표(텍스트 보존)를 가리킨다.
      final goal = await setup.goalRepo.fetchGoal(uid, goalId!);
      expect(goal.text, '공모전 지원하기');
    });

    test('순서 오프셋: 기존 퀘스트 뒤에 이어 붙는다', () async {
      final existing = Quest(
        id: 'existing-1',
        title: '기존 퀘스트',
        difficulty: Difficulty.easy,
        order: 0,
        createdAt: DateTime(2024),
      );
      final setup = await decomposed(_savingContainer(seedQuests: [existing]));
      final notifier = setup.container.read(decomposeNotifierProvider.notifier);
      final draftCount = state(setup.container).drafts.length;

      final ok = await notifier.confirm();

      expect(ok, isTrue);
      final saved = await setup.questRepo.fetchQuests(uid);
      // 기존 1개 + 새로 저장된 것. 새 항목의 order는 1부터 시작한다(구멍 없음).
      expect(saved.length, draftCount + 1);
      for (var i = 0; i < saved.length; i++) {
        expect(saved[i].order, i);
      }
    });

    test('goal 저장 실패: false 반환 + drafts 보존 + isSaving=false + quests 미저장', () async {
      final setup = await decomposed(
        _savingContainer(goalFail: const NetworkFailure()),
      );
      final notifier = setup.container.read(decomposeNotifierProvider.notifier);
      final before = state(setup.container).drafts;

      final ok = await notifier.confirm();

      expect(ok, isFalse);
      // 실패했으므로 편집 결과가 그대로 보존된다(날아가지 않음).
      expect(state(setup.container).drafts, equals(before));
      expect(state(setup.container).isSaving, isFalse);
      // goal 단계에서 실패했으니 quests에는 아무것도 저장되지 않았다.
      expect(await setup.questRepo.fetchQuests(uid), isEmpty);
    });

    test('quest 저장 실패(orphan goal 무해): false 반환 + drafts 보존', () async {
      final setup = await decomposed(
        _savingContainer(questFail: const NetworkFailure()),
      );
      final notifier = setup.container.read(decomposeNotifierProvider.notifier);
      final before = state(setup.container).drafts;

      final ok = await notifier.confirm();

      // quests는 원자적 batch라 부분 저장이 없다(실패 = 전무). goal은 orphan으로
      // 남지만 무해하다. failWith 저장소는 fetchQuests도 던지므로 여기선 개수 대신
      // "false + 편집 결과 보존"으로 실패 처리를 검증한다.
      expect(ok, isFalse);
      // 편집 결과는 보존되어 사용자가 다시 등록을 시도할 수 있다.
      expect(state(setup.container).drafts, equals(before));
      expect(state(setup.container).isSaving, isFalse);
    });

    test('중복 탭 방지: isSaving 중 재호출은 즉시 false + 상태 불변', () async {
      // 저장 경로를 지연시켜 in-flight 상태를 관찰한다(느린 goal 저장소).
      final setup = await decomposed(
        _savingContainer(
          goalRepoOverride: _SlowGoalRepository(
            const Duration(milliseconds: 50),
          ),
        ),
      );
      final notifier = setup.container.read(decomposeNotifierProvider.notifier);

      // 첫 등록 시작 — await 전에 isSaving이 동기적으로 켜진다.
      final first = notifier.confirm();
      expect(state(setup.container).isSaving, isTrue);
      final snapshot = state(setup.container);

      // 진행 중 재호출 → 즉시 false, 상태 불변(요청은 한 번만 나간다).
      final second = await notifier.confirm();
      expect(second, isFalse);
      expect(state(setup.container), equals(snapshot));

      // 첫 요청은 정상 완료 → 성공 시 상태 null 리셋.
      expect(await first, isTrue);
      expect(setup.container.read(decomposeNotifierProvider).value, isNull);
    });

    test('분해 전(null): confirm은 false + 크래시 없음 + quests 미저장', () async {
      final setup = _savingContainer();
      final notifier = setup.container.read(decomposeNotifierProvider.notifier);
      await setup.container.read(decomposeNotifierProvider.future);

      final ok = await notifier.confirm();

      expect(ok, isFalse);
      expect(setup.container.read(decomposeNotifierProvider).value, isNull);
      expect(await setup.questRepo.fetchQuests(uid), isEmpty);
    });

    test('빈 목록(전부 삭제 후): confirm은 false + quests 미저장', () async {
      final setup = await decomposed(_savingContainer());
      final notifier = setup.container.read(decomposeNotifierProvider.notifier);
      // 모든 draft를 지워 빈 목록으로 만든다.
      for (final d in [...state(setup.container).drafts]) {
        notifier.remove(d.localId);
      }
      expect(state(setup.container).drafts, isEmpty);

      final ok = await notifier.confirm();

      expect(ok, isFalse);
      expect(await setup.questRepo.fetchQuests(uid), isEmpty);
    });
  });

  group('DecomposeNotifier — 개별 항목 재분해 (redecomposeOne)', () {
    List<QuestDraft> drafts(ProviderContainer c) =>
        c.read(decomposeNotifierProvider).value!.drafts;
    DecomposeState state(ProviderContainer c) =>
        c.read(decomposeNotifierProvider).value!;

    /// decompose·redecompose 시나리오를 지정해 success로 분해까지 끝낸 컨테이너를 준다.
    /// (첫 분해는 항상 success, 재분해 시나리오만 골라 주입한다.)
    Future<ProviderContainer> decomposed({
      FakeDecomposeScenario redecompose = FakeDecomposeScenario.success,
      Duration? redecomposeDelay,
    }) async {
      final container = _redecomposeContainer(
        onDecompose: _fake(FakeDecomposeScenario.success),
        onRedecompose: _fake(redecompose, delay: redecomposeDelay),
      );
      await container.read(decomposeNotifierProvider.future);
      await container
          .read(decomposeNotifierProvider.notifier)
          .decompose('공모전 지원하기');
      return container;
    }

    test('성공: 대상이 하위 여러 개로 교체 + 개수 증가 + order 0..m 연속', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      // 중간 항목을 고른다 — splice/재번호가 실제로 필요한 위치.
      final target = before[2];
      final targetTitle = target.title;

      final ok = await notifier.redecomposeOne(target.localId);

      expect(ok, isTrue);
      final after = drafts(container);
      // subTemplateFor는 3개를 낸다 → 1개 자리에 3개 = 개수 +2.
      expect(after.length, before.length + 2);
      // 원본 항목 제목은 사라진다(교체됨).
      expect(after.where((d) => d.title == targetTitle), isEmpty);
      // 전체 order가 구멍 없이 0..m 연속.
      for (var i = 0; i < after.length; i++) {
        expect(after[i].order, i);
      }
      // 진행 표시는 해제된다.
      expect(state(container).regeneratingItemId, isNull);
    });

    test('성공: 형제(앞·뒤) 항목은 제목/난이도가 보존된다', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      final target = before[2];
      final prevTitle = before[1].title;
      final nextTitle = before[3].title;

      await notifier.redecomposeOne(target.localId);

      final after = drafts(container);
      // 교체 앞/뒤 형제는 그대로 남아 있다(제목으로 확인).
      expect(after.where((d) => d.title == prevTitle), hasLength(1));
      expect(after.where((d) => d.title == nextTitle), hasLength(1));
    });

    test('성공: 하위 항목 localId가 서로 유일하다', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final target = drafts(container)[2];

      await notifier.redecomposeOne(target.localId);

      final ids = drafts(container).map((d) => d.localId).toList();
      // 전체 localId에 중복이 없다(splice로 부여한 '::r$i' 포함).
      expect(ids.toSet().length, ids.length);
    });

    test('실패(timeout): 원본 항목 보존 + false + regeneratingItemId=null', () async {
      // 첫 분해는 성공, 재분해만 timeout(NetworkFailure)으로 실패시킨다.
      final container = await decomposed(
        redecompose: FakeDecomposeScenario.timeout,
      );
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      final target = before[2];

      final ok = await notifier.redecomposeOne(target.localId);

      expect(ok, isFalse);
      // 실패했으니 목록이 통째로 보존된다(원본 항목 그대로).
      expect(drafts(container), equals(before));
      expect(state(container).regeneratingItemId, isNull);
    });

    test('빈 결과(empty): 원본 보존 + false', () async {
      final container = await decomposed(
        redecompose: FakeDecomposeScenario.empty,
      );
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);
      final target = before[2];

      final ok = await notifier.redecomposeOne(target.localId);

      expect(ok, isFalse);
      expect(drafts(container), equals(before));
      expect(state(container).regeneratingItemId, isNull);
    });

    test('single-flight: 재분해 중 재호출은 즉시 false + 상태 불변', () async {
      // 재분해에 delay를 줘 in-flight 상태를 관찰한다.
      final container = await decomposed(
        redecomposeDelay: const Duration(milliseconds: 50),
      );
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final target = drafts(container)[2];

      // 첫 재분해 시작 — await 전에 regeneratingItemId가 켜진다.
      final first = notifier.redecomposeOne(target.localId);
      expect(state(container).regeneratingItemId, target.localId);
      final snapshot = state(container);

      // 진행 중 (다른 항목이든 같은 항목이든) 재호출 → 즉시 false, 상태 불변.
      final second = await notifier.redecomposeOne(drafts(container)[0].localId);
      expect(second, isFalse);
      expect(state(container), equals(snapshot));

      // 첫 요청은 정상 완료.
      expect(await first, isTrue);
      expect(state(container).regeneratingItemId, isNull);
    });

    test('없는 localId: false + 목록 불변', () async {
      final container = await decomposed();
      final notifier = container.read(decomposeNotifierProvider.notifier);
      final before = drafts(container);

      final ok = await notifier.redecomposeOne('없는-id');

      expect(ok, isFalse);
      expect(drafts(container), equals(before));
    });

    test('null 상태(분해 전): false + 크래시 없음', () async {
      final container = _containerFor(FakeDecomposeScenario.success);
      final notifier = container.read(decomposeNotifierProvider.notifier);
      await container.read(decomposeNotifierProvider.future);

      final ok = await notifier.redecomposeOne('anything');

      expect(ok, isFalse);
      expect(container.read(decomposeNotifierProvider).value, isNull);
    });
  });
}
