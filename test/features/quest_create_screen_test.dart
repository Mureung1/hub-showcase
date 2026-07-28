import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/app_segmented_button.dart';
import 'package:one_step/core/widgets/gradient_button.dart';
import 'package:one_step/features/quest/quest_create_screen.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest_source.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';

import '../helpers/pump_app.dart';

/// 직접 퀘스트 등록 화면 (3단계-c · 목표 폴더 단위).
///
/// AI 없이 사용자가 **목표명 + 하위 퀘스트들을 직접 타이핑**해 한 번에 등록한다.
/// 저장 경로는 AI 분해와 공용: 목표(Goal) 저장 → 그 goalId로 초안 일괄 저장.
///
/// 검증 대상:
/// - 목표명이 비면 등록 불가 · 퀘스트 제목이 비면 등록 불가
/// - 퀘스트 추가/삭제(최소 1개 유지) · 난이도별 예상 보상
/// - 등록 시 createGoal 호출 + 모든 퀘스트가 **같은 goalId**로 묶임
/// - 등록 실패 시 스낵바 + 입력 유지 · 성공 시 pop
void main() {
  const uid = 'test-uid';

  // 주 버튼은 그린 그라디언트 버튼(GradientButton)이다 — AI 분해 결과 화면의
  // 「등록하기」와 같은 위젯이다.
  Finder submitButton() => find.widgetWithText(GradientButton, '등록하기');
  Finder goalField() => find.byType(TextField).first;
  Finder questField(int i) => find.byType(TextField).at(i + 1);

  /// 여러 행을 동시에 다루는 테스트용 — 기본 800x600 뷰포트에서는 아래쪽 행이
  /// 화면 밖으로 밀려 ListView가 지연 빌드/히트하지 못한다. 세로로 넉넉한 표면을
  /// 깔아 모든 행이 빌드·탭 가능하게 한다(실기기에서는 사용자가 스크롤한다).
  void setTallSurface(WidgetTester tester) {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets('초기에는 목표명이 비어 등록 버튼이 비활성이다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    final button = tester.widget<GradientButton>(submitButton());
    expect(button.onPressed, isNull);
  });

  testWidgets('목표명만 입력하고 퀘스트 제목이 비면 여전히 비활성이다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(goalField(), '공모전 지원하기');
    await tester.pumpAndSettle();

    // 퀘스트 제목이 비어 있으므로 아직 등록할 수 없다.
    final button = tester.widget<GradientButton>(submitButton());
    expect(button.onPressed, isNull);
  });

  testWidgets('퀘스트 제목만 입력하고 목표명이 비면 비활성이다(목표 강제)', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(questField(0), '공고 3개 찾기');
    await tester.pumpAndSettle();

    final button = tester.widget<GradientButton>(submitButton());
    expect(button.onPressed, isNull);
  });

  testWidgets('목표명 + 퀘스트 제목을 모두 채우면 활성화된다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(goalField(), '공모전 지원하기');
    await tester.enterText(questField(0), '공고 3개 찾기');
    await tester.pumpAndSettle();

    final button = tester.widget<GradientButton>(submitButton());
    expect(button.onPressed, isNotNull);
  });

  testWidgets('목표명이 공백만이면 비활성이다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(goalField(), '    ');
    await tester.enterText(questField(0), '공고 3개 찾기');
    await tester.pumpAndSettle();

    final button = tester.widget<GradientButton>(submitButton());
    expect(button.onPressed, isNull);
  });

  testWidgets('난이도 기본값은 보통이고, 예상 보상이 코인5/XP10으로 표시된다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    final segmented = tester.widget<AppSegmentedButton<Difficulty>>(
      find.byType(AppSegmentedButton<Difficulty>),
    );
    expect(segmented.selected, Difficulty.normal);

    expect(find.text('+5'), findsOneWidget);
    expect(find.text('XP +10'), findsOneWidget);
  });

  testWidgets('난이도를 바꾸면 예상 보상 표시도 함께 갱신된다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.tap(find.text('어려움'));
    await tester.pumpAndSettle();

    // 어려움 = 코인10 / XP20
    expect(find.text('+10'), findsOneWidget);
    expect(find.text('XP +20'), findsOneWidget);
    expect(find.text('XP +10'), findsNothing);
  });

  testWidgets('퀘스트 추가로 행이 늘어나고, 삭제로 줄어든다(최소 1개 유지)', (tester) async {
    setTallSurface(tester);
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    // 초기 1개.
    expect(find.byType(AppSegmentedButton<Difficulty>), findsOneWidget);

    // 삭제 버튼은 행이 1개뿐일 땐 숨겨진다.
    expect(find.byTooltip('삭제'), findsNothing);

    await tester.tap(find.widgetWithText(OutlinedButton, '퀘스트 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, '퀘스트 추가'));
    await tester.pumpAndSettle();

    // 이제 3개 행.
    expect(find.byType(AppSegmentedButton<Difficulty>), findsNWidgets(3));
    // 삭제 버튼은 행마다 하나씩.
    expect(find.byTooltip('삭제'), findsNWidgets(3));

    // 하나 삭제 → 2개.
    await tester.tap(find.byTooltip('삭제').first);
    await tester.pumpAndSettle();
    expect(find.byType(AppSegmentedButton<Difficulty>), findsNWidgets(2));
  });

  testWidgets('여러 퀘스트를 등록하면 목표가 생기고 모두 같은 goalId로 묶인다', (tester) async {
    setTallSurface(tester);
    final repo = await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(goalField(), '공모전 지원하기');
    await tester.enterText(questField(0), '공고 3개 찾기');

    // 둘째 퀘스트 추가 후 제목 입력.
    await tester.tap(find.widgetWithText(OutlinedButton, '퀘스트 추가'));
    await tester.pumpAndSettle();
    await tester.enterText(questField(1), '지원서 초안 쓰기');
    await tester.pumpAndSettle();

    // 둘째 퀘스트 난이도를 어려움으로.
    await tester.tap(find.text('어려움').last);
    await tester.pumpAndSettle();

    await tester.tap(submitButton());
    await tester.pumpAndSettle();

    final quests = await repo.fetchQuests(uid);
    expect(quests, hasLength(2));
    // 둘 다 목표에 묶인다.
    expect(quests.every((q) => q.goalId != null), isTrue);
    // 같은 목표 폴더로 묶인다(같은 goalId).
    expect(quests.map((q) => q.goalId).toSet(), hasLength(1));
    // 회귀 A: goalId가 있어도 출처는 manual이라 카드에서 "직접"으로 표시된다.
    expect(quests.every((q) => q.source == QuestSource.manual), isTrue);
    expect(quests.every((q) => !q.isAiGenerated), isTrue);

    final byTitle = {for (final q in quests) q.title: q};
    expect(byTitle['공고 3개 찾기']!.difficulty, Difficulty.normal);
    expect(byTitle['지원서 초안 쓰기']!.difficulty, Difficulty.hard);
    // 순서(order)는 입력 순서대로 매겨진다.
    expect(byTitle['공고 3개 찾기']!.order, 0);
    expect(byTitle['지원서 초안 쓰기']!.order, 1);
  });

  testWidgets('제목 앞뒤 공백은 잘려서 저장된다', (tester) async {
    final repo = await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(goalField(), '  목표  ');
    await tester.enterText(questField(0), '  공백 있는 제목  ');
    await tester.pumpAndSettle();
    await tester.tap(submitButton());
    await tester.pumpAndSettle();

    final quests = await repo.fetchQuests(uid);
    expect(quests.single.title, '공백 있는 제목');
  });

  testWidgets('저장 실패 시 스낵바가 뜨고 입력이 유지된다', (tester) async {
    // createGoal이 실패하는 저장소를 덮어씌운다(quest 저장소는 정상이라 실패 원인이
    // goal 저장임을 고정한다).
    final failingGoalRepo = InMemoryGoalRepository(
      failWith: const NetworkFailure(),
    );
    addTearDown(failingGoalRepo.dispose);

    await pumpScreen(
      tester,
      const QuestCreateScreen(),
      extraOverrides: [
        goalRepositoryProvider.overrideWithValue(failingGoalRepo),
      ],
    );
    await tester.pumpAndSettle();

    await tester.enterText(goalField(), '실패할 목표');
    await tester.enterText(questField(0), '살아남을 제목');
    await tester.pumpAndSettle();

    await tester.tap(submitButton());
    await tester.pumpAndSettle();

    // 실패 스낵바가 뜬다.
    expect(find.byType(SnackBar), findsOneWidget);
    // 화면은 닫히지 않고 입력이 유지된다.
    expect(find.byType(QuestCreateScreen), findsOneWidget);
    expect(find.text('실패할 목표'), findsOneWidget);
    expect(find.text('살아남을 제목'), findsOneWidget);
  });
}
