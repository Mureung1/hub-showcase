import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/reward_chip.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/quest/quest_split_screen.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/decompose/fake_quest_decomposer.dart';

import '../helpers/pump_app.dart';

/// checklist 2주차 · AI Quest Splitter 화면
/// - 입력 검증(빈 값/공백 → 버튼 비활성)
/// - 중복 탭 방지(분해 중 버튼 비활성 + 블루 스피너)
/// - 분해 결과 표시(난이도 pill + 보상 칩)
/// - 폴백 배너는 source=template일 때만 (checklist #13)
void main() {
  /// [scenario] Fake 분해기를 주입해 화면을 띄운다.
  /// questDecomposerProvider 기본값은 throw이므로 반드시 override한다.
  Future<void> pumpSplit(
    WidgetTester tester,
    FakeDecomposeScenario scenario, {
    Duration? delay,
  }) async {
    await pumpScreen(
      tester,
      const QuestSplitScreen(),
      extraOverrides: [
        questDecomposerProvider.overrideWithValue(
          FakeQuestDecomposer(scenario: scenario, delay: delay),
        ),
      ],
    );
    await tester.pumpAndSettle();
  }

  // 분해 중에는 버튼 라벨이 스피너로 바뀌므로 텍스트가 아니라 타입으로 찾는다.
  // 이 화면에서 FilledButton은 분해 버튼 하나뿐이다(결과·빈 상태 전에는).
  FilledButton splitButton(WidgetTester tester) =>
      tester.widget<FilledButton>(find.byType(FilledButton));

  testWidgets('초기: 입력이 비어 "분해하기" 버튼이 비활성이다', (tester) async {
    await pumpSplit(tester, FakeDecomposeScenario.success);

    expect(splitButton(tester).onPressed, isNull);
    // 아직 분해 전이므로 결과 섹션도 없다.
    expect(find.textContaining('이렇게 나눠봤어요'), findsNothing);
  });

  testWidgets('목표를 입력하면 버튼이 활성된다', (tester) async {
    await pumpSplit(tester, FakeDecomposeScenario.success);

    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();

    expect(splitButton(tester).onPressed, isNotNull);
  });

  testWidgets('공백만 입력하면 여전히 비활성이다', (tester) async {
    await pumpSplit(tester, FakeDecomposeScenario.success);

    await tester.enterText(find.byType(TextField), '     ');
    await tester.pump();

    expect(splitButton(tester).onPressed, isNull);
  });

  testWidgets('분해하기(AI 성공) → 결과 목록에 draft가 표시된다', (tester) async {
    await pumpSplit(tester, FakeDecomposeScenario.success);

    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();

    // 섹션 제목 + draft 제목(공모전 템플릿 첫 항목) + 난이도/보상 위젯.
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsOneWidget);
    expect(find.byType(DifficultyPill), findsWidgets);
    expect(find.byType(RewardChip), findsWidgets);

    // AI 성공이므로 폴백 배너는 뜨지 않는다.
    expect(find.text('AI가 잠시 쉬어가요 — 추천 퀘스트로 시작해 볼까요?'), findsNothing);
  });

  testWidgets('폴백(timeout) → 크래시 없이 폴백 배너 + 템플릿 draft가 보인다', (tester) async {
    await pumpSplit(tester, FakeDecomposeScenario.timeout);

    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();

    // source=template 경로 → 폴백 배너가 뜬다.
    expect(find.text('AI가 잠시 쉬어가요 — 추천 퀘스트로 시작해 볼까요?'), findsOneWidget);
    // 그래도 퀘스트는 나온다.
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    expect(find.byType(DifficultyPill), findsWidgets);
  });

  testWidgets('분해 중에는 로딩 인디케이터가 뜨고 버튼이 중복 실행을 막는다', (tester) async {
    await pumpSplit(
      tester,
      FakeDecomposeScenario.success,
      delay: const Duration(milliseconds: 300),
    );

    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pump(); // 로딩 프레임

    // 분해 중: 로딩 안내 + 결과 카드 실루엣 스켈레톤 + 버튼 비활성(중복 탭 방지).
    expect(find.text('AI가 목표를 나누고 있어요'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsWidgets);
    expect(find.byType(SkeletonBox), findsWidgets);
    expect(splitButton(tester).onPressed, isNull);

    // 지연이 끝나면 결과가 나온다(대기 타이머 정리).
    await tester.pumpAndSettle();
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
  });

  testWidgets('결과가 뜬 뒤에도 화면이 크래시하지 않는다(빈/오류 방어)', (tester) async {
    // empty 시나리오도 Notifier가 템플릿으로 폴백하므로 EmptyView가 아닌 결과가 뜬다.
    await pumpSplit(tester, FakeDecomposeScenario.empty);

    await tester.enterText(find.byType(TextField), '자격증 공부하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();

    expect(find.byType(EmptyView), findsNothing);
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    // empty도 폴백 경로 → 배너가 뜬다.
    expect(find.text('AI가 잠시 쉬어가요 — 추천 퀘스트로 시작해 볼까요?'), findsOneWidget);
  });
}
