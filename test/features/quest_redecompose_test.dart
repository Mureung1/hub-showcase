import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/quest_card.dart';
import 'package:one_step/features/quest/decompose_notifier.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/quest/quest_split_screen.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/goal.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/models/quest_status.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

import '../helpers/pump_app.dart';

/// 조회·상태 변경은 정상이고 **일괄 등록(createQuests)만** 실패하는 저장소.
///
/// `failWith`는 모든 호출을 실패시켜 "원본은 그대로 보이는데 등록만 실패" 상황을
/// 만들 수 없다. 재분해 실패 시 **원본이 보존되는가**를 보려면 그 한 메서드만
/// 갈아끼워야 한다.
class _FailingCreateQuestsRepository extends InMemoryQuestRepository {
  _FailingCreateQuestsRepository({super.seed});

  @override
  Future<List<Quest>> createQuests(
    String uid,
    List<QuestDraft> drafts, {
    String? goalId,
    String? parentQuestId,
  }) async {
    throw const NetworkFailure();
  }
}

/// checklist 4주차 · 멈춘 퀘스트 재분해 (B-5)
/// - 카드 `⋮`로 멈춤 표시 / 멈춤 해제
/// - 멈춘 퀘스트를 더 작게 나눠 **원본의 자식으로** 등록
/// - 원본은 지우지도 상태를 바꾸지도 않는다(「재분해 복귀율」의 분모)
void main() {
  // ===== 목록 화면 · `⋮` 더보기 =====

  Quest todoQuest({String id = 'q1', String title = '지원서 초안 쓰기'}) =>
      Quest(id: id, title: title, difficulty: Difficulty.hard, order: 0);

  testWidgets('미완료 카드의 ⋮에는 「여기서 막혔어요」가 있고, 누르면 멈춤으로 저장된다', (tester) async {
    final repo = await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: [todoQuest()],
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('지원서 초안 쓰기 더보기'));
    await tester.pumpAndSettle();

    expect(find.text('여기서 막혔어요'), findsOneWidget);
    // 아직 멈춘 적이 없으니 해제·재분해 항목은 없다.
    expect(find.text('다시 진행할게요'), findsNothing);
    expect(find.text('더 작게 나누기'), findsNothing);

    await tester.tap(find.text('여기서 막혔어요'));
    await tester.pumpAndSettle();

    // 저장까지 됐는가(앱을 다시 열어도 남는다).
    final stored = (await repo.fetchQuests('test-uid')).single;
    expect(stored.status, QuestStatus.stuck);
    // 화면에도 상태가 보인다.
    expect(find.text('멈춤'), findsOneWidget);
  });

  testWidgets('멈춘 카드의 ⋮에는 「다시 진행할게요」와 「더 작게 나누기」가 있다', (tester) async {
    final repo = await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: [
        Quest(
          id: 'q1',
          title: '지원서 초안 쓰기',
          difficulty: Difficulty.hard,
          status: QuestStatus.stuck,
        ),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.text('멈춤'), findsOneWidget);

    await tester.tap(find.byTooltip('지원서 초안 쓰기 더보기'));
    await tester.pumpAndSettle();

    expect(find.text('다시 진행할게요'), findsOneWidget);
    expect(find.text('더 작게 나누기'), findsOneWidget);
    expect(find.text('여기서 막혔어요'), findsNothing);

    await tester.tap(find.text('다시 진행할게요'));
    await tester.pumpAndSettle();

    expect((await repo.fetchQuests('test-uid')).single.status, QuestStatus.todo);
    expect(find.text('멈춤'), findsNothing);
  });

  testWidgets('완료한 카드에는 ⋮ 자체가 없다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [
        Quest(id: 'q1', title: '공고 찾기', status: QuestStatus.done),
      ],
    );
    await tester.pumpAndSettle();

    // 전부 완료된 그룹은 기본 접힘이라 먼저 펼친다.
    await tester.tap(find.text('직접 등록한 퀘스트'));
    await tester.pumpAndSettle();

    expect(find.byType(QuestCard), findsOneWidget);
    expect(find.byTooltip('공고 찾기 더보기'), findsNothing);
  });

  testWidgets('★ 자식의 자식(깊이 2)에는 「더 작게 나누기」가 없다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [
        Quest(id: 'p', title: '원본', status: QuestStatus.stuck, order: 0),
        Quest(
          id: 'c',
          title: '자식',
          parentQuestId: 'p',
          status: QuestStatus.stuck,
          order: 1,
        ),
        Quest(
          id: 'g',
          title: '손자',
          parentQuestId: 'c',
          status: QuestStatus.stuck,
          order: 2,
        ),
      ],
    );
    await tester.pumpAndSettle();

    Future<void> openMenu(String title) async {
      final menu = find.byTooltip('$title 더보기');
      await tester.ensureVisible(menu);
      await tester.pumpAndSettle();
      await tester.tap(menu);
      await tester.pumpAndSettle();
    }

    Future<void> closeMenu() async {
      // 바깥 탭은 아래 화면의 버튼을 눌러 버릴 수 있어 Esc로 닫는다.
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
    }

    // 원본(깊이 0)과 자식(깊이 1)은 더 나눌 수 있다.
    for (final title in ['원본', '자식']) {
      await openMenu(title);
      expect(find.text('더 작게 나누기'), findsOneWidget, reason: '$title은 나눌 수 있어야 한다');
      await closeMenu();
    }

    // 손자(깊이 2)는 막힌다 — 무한 중첩은 목록이 감당하지 못한다.
    await openMenu('손자');
    expect(find.text('다시 진행할게요'), findsOneWidget); // 메뉴는 떠 있다
    expect(find.text('더 작게 나누기'), findsNothing);
  });

  testWidgets('★ 자식 카드는 부모 아래에 들여쓰기되어 그려진다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: const [
        Quest(id: 'p', title: '원본', status: QuestStatus.stuck, order: 0),
        Quest(id: 'other', title: '다른 퀘스트', order: 1),
        Quest(id: 'c', title: '자식', parentQuestId: 'p', order: 2),
      ],
    );
    await tester.pumpAndSettle();

    final parent = tester.getTopLeft(find.widgetWithText(QuestCard, '원본'));
    final child = tester.getTopLeft(find.widgetWithText(QuestCard, '자식'));
    final other = tester.getTopLeft(find.widgetWithText(QuestCard, '다른 퀘스트'));

    // 들여쓰기: 자식이 부모보다 오른쪽에서 시작한다.
    expect(child.dx, greaterThan(parent.dx));
    expect(other.dx, parent.dx);
    // 순서: 자식이 부모 바로 뒤에 오고, 무관한 퀘스트는 그 뒤다.
    expect(child.dy, greaterThan(parent.dy));
    expect(other.dy, greaterThan(child.dy));
  });

  // ===== 재분해 화면 =====

  const uid = 'test-uid';

  /// 재분해 모드의 [QuestSplitScreen]을 **라우터 스택 위에** 띄운다.
  ///
  /// 등록 성공 시 `context.pop()`이 일어나므로 돌아갈 화면이 필요하다
  /// (`MaterialApp(home:)`이면 pop 대상이 없어 크래시한다).
  /// 목표 저장소도 함께 돌려준다: **재분해 등록은 새 Goal을 만들면 안 된다.**
  /// 계보(target)가 유실되면 confirm이 큰 목표 분기로 떨어져 Goal이 하나 늘어나므로,
  /// 목표 개수가 계보 유실의 가장 예민한 감지기다.
  Future<({InMemoryQuestRepository quests, InMemoryGoalRepository goals})>
  pumpRedecompose(
    WidgetTester tester, {
    required RedecomposeTarget target,
    required List<Quest> seed,
    FakeDecomposeScenario scenario = FakeDecomposeScenario.success,
    InMemoryQuestRepository? questRepo,
  }) async {
    final repo = questRepo ?? InMemoryQuestRepository(seed: seed);
    final userRepo = InMemoryUserRepository(seed: AppUser.initial(uid));
    final goalRepo = InMemoryGoalRepository(
      seed: const [Goal(id: 'goal-1', text: '공모전 지원하기')],
    );
    addTearDown(repo.dispose);
    addTearDown(userRepo.dispose);
    addTearDown(goalRepo.dispose);

    final router = GoRouter(
      initialLocation: '/quest',
      routes: [
        GoRoute(
          path: '/quest',
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('퀘스트 목록 자리'))),
          routes: [
            GoRoute(
              path: 'split',
              builder: (context, state) {
                final extra = state.extra;
                return QuestSplitScreen(
                  target: extra is RedecomposeTarget ? extra : null,
                );
              },
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(userRepo),
          questRepositoryProvider.overrideWithValue(repo),
          goalRepositoryProvider.overrideWithValue(goalRepo),
          questDecomposerProvider.overrideWithValue(
            FakeQuestDecomposer(scenario: scenario),
          ),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    router.go('/quest/split', extra: target);
    await tester.pumpAndSettle();
    return (quests: repo, goals: goalRepo);
  }

  const stuckParent = Quest(
    id: 'p1',
    title: '지원서 초안 쓰기',
    difficulty: Difficulty.hard,
    status: QuestStatus.stuck,
    goalId: 'goal-1',
    order: 0,
  );

  const target = RedecomposeTarget(
    questId: 'p1',
    questTitle: '지원서 초안 쓰기',
    difficulty: Difficulty.hard,
    goalId: 'goal-1',
    goalText: '공모전 지원하기',
  );

  testWidgets('재분해 모드는 목표 입력란 대신 원본 퀘스트를 보여준다', (tester) async {
    await pumpRedecompose(tester, target: target, seed: const [stuckParent]);

    expect(find.text('멈춘 퀘스트 다시 나누기'), findsOneWidget);
    // 다시 타이핑할 이유가 없으므로 입력란이 없다.
    expect(find.byType(TextField), findsNothing);
    // 원본 제목과 목표 맥락이 보인다.
    expect(find.text('지원서 초안 쓰기'), findsOneWidget);
    expect(find.text('공모전 지원하기'), findsOneWidget);
    // 진입과 동시에 분해가 끝나 결과가 떠 있다.
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    expect(find.text('등록하기'), findsOneWidget);
  });

  testWidgets('★ 등록하면 자식이 원본의 parentQuestId·goalId를 갖고 저장된다', (tester) async {
    final repos = await pumpRedecompose(
      tester,
      target: target,
      seed: const [stuckParent],
    );

    await tester.tap(find.text('등록하기'));
    await tester.pumpAndSettle();

    final all = await repos.quests.fetchQuests(uid);
    final children = all.where((q) => q.id != 'p1').toList();

    // 개수 상한은 큰 목표 분해(5개)가 아니라 재분해(3개)다.
    expect(children, hasLength(3));
    expect(children.every((q) => q.parentQuestId == 'p1'), isTrue);
    // 같은 목표 폴더에 남는다.
    expect(children.every((q) => q.goalId == 'goal-1'), isTrue);
    expect(children.every((q) => q.status == QuestStatus.todo), isTrue);

    // ★ 원본은 지워지지도, 상태가 바뀌지도 않는다 —
    //   stuck 원본이 「재분해 복귀율」의 분모다.
    final origin = all.firstWhere((q) => q.id == 'p1');
    expect(origin.status, QuestStatus.stuck);
    expect(origin.title, '지원서 초안 쓰기');

    // 목록으로 돌아왔다.
    expect(find.text('퀘스트 목록 자리'), findsOneWidget);
  });

  // ===== 계보(target) 불변식 =====
  //
  // `DecomposeState.target`은 등록 경로를 가르는 유일한 값이다. 이 값이 상태 전이
  // 중간에 사라지면 confirm이 **큰 목표 분기**로 떨어져 ① 새 Goal 문서를 만들고
  // ② `parentQuestId` 없이 저장한다 — 원본과의 연결이 끊겨 「재분해 복귀율」의
  // 분자가 사라진다. 크래시도 오류 메시지도 없이 조용히 일어나므로,
  // **목표 개수 불변**을 가장 예민한 감지기로 함께 단언한다.

  /// 저장된 자식들이 원본 계보를 갖고 있고, 새 Goal이 생기지 않았음을 확인한다.
  Future<void> expectLineageKept(
    ({InMemoryQuestRepository quests, InMemoryGoalRepository goals}) repos, {
    required int expectedChildren,
  }) async {
    final all = await repos.quests.fetchQuests(uid);
    final children = all.where((q) => q.id != 'p1').toList();

    expect(children, hasLength(expectedChildren));
    expect(
      children.every((q) => q.parentQuestId == 'p1'),
      isTrue,
      reason: '자식이 원본을 가리키지 않는다 — 계보(target)가 유실됐다',
    );
    expect(
      children.every((q) => q.goalId == 'goal-1'),
      isTrue,
      reason: '자식이 원본의 목표 폴더를 벗어났다',
    );

    // 원본은 그대로 stuck.
    expect(all.firstWhere((q) => q.id == 'p1').status, QuestStatus.stuck);

    // ★ 재분해 등록은 새 목표를 만들지 않는다. 하나라도 늘었다면 confirm이
    //   큰 목표 분기로 떨어진 것이다.
    final goals = await repos.goals.watchGoals(uid).first;
    expect(goals, hasLength(1), reason: '재분해 등록이 새 Goal을 만들었다 — 계보(target) 유실');
    expect(goals.single.id, 'goal-1');
  }

  testWidgets('★ 초안을 편집해도 계보가 유지된다 (제목 수정 → 등록)', (tester) async {
    final repos = await pumpRedecompose(
      tester,
      target: target,
      seed: const [stuckParent],
    );

    // 초안 하나의 제목을 고친다(편집 헬퍼가 상태를 새로 만드는 경로).
    const original = '가장 작은 첫 단계 5분만 해보기';
    await tester.ensureVisible(find.text(original));
    await tester.pumpAndSettle();
    await tester.tap(find.text(original));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '딱 5분만 앉아 있기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();
    expect(find.text('딱 5분만 앉아 있기'), findsOneWidget);

    await tester.tap(find.text('등록하기'));
    await tester.pumpAndSettle();

    await expectLineageKept(repos, expectedChildren: 3);
    // 편집 결과가 실제로 저장됐는지도 함께 본다(편집이 무시된 게 아니다).
    final all = await repos.quests.fetchQuests(uid);
    expect(all.map((q) => q.title), contains('딱 5분만 앉아 있기'));
  });

  testWidgets('★ 「다시 나누기」 후에도 계보가 유지된다', (tester) async {
    final repos = await pumpRedecompose(
      tester,
      target: target,
      seed: const [stuckParent],
    );

    await tester.ensureVisible(find.text('다시 나누기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('다시 나누기'));
    await tester.pumpAndSettle();

    // 재생성 뒤에도 결과는 재분해 상한(3개) 그대로다.
    expect(find.textContaining('이렇게 나눠봤어요 · 3개'), findsOneWidget);

    await tester.tap(find.text('등록하기'));
    await tester.pumpAndSettle();

    await expectLineageKept(repos, expectedChildren: 3);
  });

  testWidgets('AI가 실패해도 템플릿으로 폴백하고 원본은 그대로다', (tester) async {
    final repos = await pumpRedecompose(
      tester,
      target: target,
      seed: const [stuckParent],
      scenario: FakeDecomposeScenario.timeout,
    );

    // 폴백 배너 + 템플릿 결과.
    expect(find.textContaining('대표 템플릿으로 준비했어요'), findsOneWidget);
    expect(find.textContaining('추천 퀘스트로 준비했어요'), findsOneWidget);

    // ★ 등록 전에는 아무것도 쓰지 않는다. 원본만 그대로 있다.
    final all = await repos.quests.fetchQuests(uid);
    expect(all, hasLength(1));
    expect(all.single.status, QuestStatus.stuck);
  });

  testWidgets('★ 등록이 실패하면 원본이 보존되고 결과 화면이 유지된다', (tester) async {
    final failing = _FailingCreateQuestsRepository(seed: const [stuckParent]);
    await pumpRedecompose(
      tester,
      target: target,
      seed: const [stuckParent],
      questRepo: failing,
    );

    await tester.tap(find.text('등록하기'));
    await tester.pumpAndSettle();

    expect(find.text('등록에 실패했어요. 잠시 후 다시 시도해 주세요.'), findsOneWidget);
    // 화면은 유지된다(pop 없음) — 편집 결과를 날리지 않는다.
    expect(find.text('퀘스트 목록 자리'), findsNothing);
    expect(find.text('등록하기'), findsOneWidget);

    // 원본은 손상 없이 그대로다.
    final all = await failing.fetchQuests(uid);
    expect(all, hasLength(1));
    expect(all.single.status, QuestStatus.stuck);
  });

  testWidgets('재분해 세션을 남긴 채 큰 목표 분해로 들어오면 이전 결과가 비워진다', (tester) async {
    // 그대로 두면 사용자가 그 결과를 등록해 **엉뚱한 퀘스트의 자식**이 생긴다.
    final repo = InMemoryQuestRepository(seed: const [stuckParent]);
    final userRepo = InMemoryUserRepository(seed: AppUser.initial(uid));
    final goalRepo = InMemoryGoalRepository();
    addTearDown(repo.dispose);
    addTearDown(userRepo.dispose);
    addTearDown(goalRepo.dispose);

    final router = GoRouter(
      initialLocation: '/quest',
      routes: [
        GoRoute(
          path: '/quest',
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('퀘스트 목록 자리'))),
          routes: [
            GoRoute(
              path: 'split',
              builder: (context, state) {
                final extra = state.extra;
                return QuestSplitScreen(
                  target: extra is RedecomposeTarget ? extra : null,
                );
              },
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(initialUid: uid),
          ),
          userRepositoryProvider.overrideWithValue(userRepo),
          questRepositoryProvider.overrideWithValue(repo),
          goalRepositoryProvider.overrideWithValue(goalRepo),
          questDecomposerProvider.overrideWithValue(
            FakeQuestDecomposer(scenario: FakeDecomposeScenario.success),
          ),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );

    // 1) 재분해 모드로 진입해 결과를 만든다.
    router.go('/quest/split', extra: target);
    await tester.pumpAndSettle();
    expect(find.text('등록하기'), findsOneWidget);

    // 2) 등록하지 않고 목록으로 나갔다가 큰 목표 분해(무인자)로 다시 들어온다.
    router.go('/quest');
    await tester.pumpAndSettle();
    router.go('/quest/split');
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsOneWidget); // 큰 목표 입력 화면
    expect(find.text('등록하기'), findsNothing); // 이전 재분해 결과는 사라졌다
  });
}
