import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/reward_chip.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/quest/quest_split_screen.dart';
import 'package:one_step/models/difficulty.dart';
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

  // ===== 커밋6 · 편집 통합(분해 후 조작) =====

  /// success로 분해까지 끝낸 상태로 만든다. 공모전 템플릿 6개가 뜬다.
  Future<void> decomposeSuccess(WidgetTester tester) async {
    await pumpSplit(tester, FakeDecomposeScenario.success);
    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();
  }

  testWidgets('삭제 버튼 탭 → 해당 카드가 목록에서 사라지고 개수가 준다', (tester) async {
    await decomposeSuccess(tester);

    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsOneWidget);
    expect(find.textContaining('이렇게 나눠봤어요 · 6개'), findsOneWidget);

    // 첫 카드의 삭제 버튼을 누른다.
    await tester.tap(find.byTooltip('삭제').first);
    await tester.pumpAndSettle();

    // 그 항목이 사라지고 개수 표시가 갱신된다.
    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsNothing);
    expect(find.textContaining('이렇게 나눠봤어요 · 5개'), findsOneWidget);
  });

  testWidgets('난이도 변경 → RewardChip 수치가 함께 갱신된다', (tester) async {
    await decomposeSuccess(tester);

    // 첫 항목은 easy(공고 확인) → 보상 +3. hard로 바꾸면 +10.
    // easy 코인 +3이 최소 하나 있다.
    expect(find.text('+3'), findsWidgets);

    // 첫 카드의 난이도 팝업을 연다.
    await tester.tap(find.byType(PopupMenuButton<Difficulty>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('어려움').last);
    await tester.pumpAndSettle();

    // 첫 카드의 난이도 라벨이 어려움으로, 보상이 hard(+10/XP+20)로 갱신.
    expect(find.text('• 어려움'), findsWidgets);
    // hard로 바뀐 카드의 보상이 표시된다.
    expect(find.text('+10'), findsWidgets);
  });

  testWidgets('제목 수정 다이얼로그: 저장 → 상태와 화면이 갱신된다', (tester) async {
    await decomposeSuccess(tester);

    // 첫 제목을 탭해 편집 다이얼로그를 연다. (헤더에 "다시 나누기"가 생겨 목록이
    // 아래로 밀리므로 먼저 스크롤해 대상 카드를 뷰포트로 올린다.)
    await tester.drag(find.byType(ListView), const Offset(0, -200));
    await tester.pumpAndSettle();
    await tester.tap(find.text('공고 페이지 열어 지원 자격 확인하기'));
    await tester.pumpAndSettle();

    // 다이얼로그 TextField에 새 제목 입력.
    await tester.enterText(find.byType(TextField).last, '새로 고친 제목');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();

    expect(find.text('새로 고친 제목'), findsOneWidget);
    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsNothing);
  });

  testWidgets('제목 수정 다이얼로그: 빈 제목이면 저장 버튼이 비활성', (tester) async {
    await decomposeSuccess(tester);

    await tester.drag(find.byType(ListView), const Offset(0, -200));
    await tester.pumpAndSettle();
    await tester.tap(find.text('공고 페이지 열어 지원 자격 확인하기'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).last, '   ');
    await tester.pump();

    final saveButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '저장'),
    );
    expect(saveButton.onPressed, isNull);
  });

  testWidgets('전체 삭제 → 빈 상태(EmptyView)가 표시된다', (tester) async {
    await decomposeSuccess(tester);

    // 6개 카드를 모두 삭제한다. 삭제할 때마다 목록이 줄어 첫 버튼을 반복해 누른다.
    for (var i = 0; i < 6; i++) {
      await tester.tap(find.byTooltip('삭제').first);
      await tester.pumpAndSettle();
    }

    // 전부 지우면 drafts가 비어 EmptyView로 전환된다(checklist #16 전체 삭제).
    expect(find.byType(EmptyView), findsOneWidget);
    expect(find.byType(DifficultyPill), findsNothing);
  });

  // ===== 커밋7 · 전체 재생성(다시 나누기) =====

  testWidgets('분해(success) 후 "다시 나누기" 버튼이 보인다', (tester) async {
    await decomposeSuccess(tester);

    expect(find.widgetWithText(OutlinedButton, '다시 나누기'), findsOneWidget);
  });

  testWidgets('다시 나누기 탭(success) → 크래시 없이 결과가 유지된다', (tester) async {
    await decomposeSuccess(tester);

    await tester.tap(find.widgetWithText(OutlinedButton, '다시 나누기'));
    await tester.pumpAndSettle();

    // 재생성 경로가 크래시 없이 돌고 결과 섹션이 그대로 보인다.
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    expect(find.byType(DifficultyPill), findsWidgets);
    // 성공이므로 실패 스낵바는 없다.
    expect(find.text('다시 나누지 못했어요. 기존 결과를 유지할게요.'), findsNothing);
  });

  testWidgets('재생성 실패(timeout) → 스낵바 노출 + 기존 카드 유지', (tester) async {
    // timeout Fake는 첫 분해에서 템플릿 폴백을 만들고, 재생성도 실패시킨다.
    await pumpSplit(tester, FakeDecomposeScenario.timeout);
    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();

    // 재생성 전 카드 개수/내용을 확인.
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    final beforeCards = tester.widgetList(find.byType(DifficultyPill)).length;

    await tester.tap(find.widgetWithText(OutlinedButton, '다시 나누기'));
    await tester.pumpAndSettle();

    // 실패 안내 스낵바 + 기존 결과 보존(카드 그대로).
    expect(find.text('다시 나누지 못했어요. 기존 결과를 유지할게요.'), findsOneWidget);
    expect(find.textContaining('이렇게 나눠봤어요'), findsOneWidget);
    expect(tester.widgetList(find.byType(DifficultyPill)).length, beforeCards);
  });

  testWidgets('재생성 중에는 "다시 나누기" 버튼이 비활성이다(중복요청 방지)', (tester) async {
    // delay를 줘 재생성 in-flight 프레임을 관찰한다.
    await pumpSplit(
      tester,
      FakeDecomposeScenario.success,
      delay: const Duration(milliseconds: 300),
    );
    await tester.enterText(find.byType(TextField), '공모전 지원하기');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '분해하기'));
    await tester.pumpAndSettle();

    // 재생성 시작 → 다음 프레임에서 버튼 비활성 + 카드는 그대로 보인다.
    await tester.tap(find.widgetWithText(OutlinedButton, '다시 나누기'));
    await tester.pump();

    final button = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, '다시 나누기'),
    );
    expect(button.onPressed, isNull);
    // 전체 로딩으로 숨기지 않는다 — 카드는 계속 보인다.
    expect(find.byType(DifficultyPill), findsWidgets);

    // 지연이 끝나면 재생성 완료(대기 타이머 정리).
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
