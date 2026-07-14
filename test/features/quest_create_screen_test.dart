import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/features/quest/quest_create_screen.dart';
import 'package:one_step/models/difficulty.dart';

import '../helpers/pump_app.dart';

/// checklist 1주차 · 퀘스트 등록 화면
/// - 제목 미입력 시 등록 버튼이 비활성 또는 오류 메시지가 노출된다
/// - 난이도를 선택할 수 있고 기본값이 지정된다
/// - 등록 성공 시 목록에 즉시 반영된다
void main() {
  Finder submitButton() => find.widgetWithText(FilledButton, '등록하기');

  testWidgets('제목이 비어 있으면 등록 버튼이 비활성이다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    final button = tester.widget<FilledButton>(submitButton());
    expect(button.onPressed, isNull);
  });

  testWidgets('제목을 입력하면 등록 버튼이 활성화된다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField), '공모전 공고 찾기');
    await tester.pumpAndSettle();

    final button = tester.widget<FilledButton>(submitButton());
    expect(button.onPressed, isNotNull);
  });

  testWidgets('공백만 입력하면 여전히 비활성이다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField), '     ');
    await tester.pumpAndSettle();

    final button = tester.widget<FilledButton>(submitButton());
    expect(button.onPressed, isNull);
  });

  testWidgets('난이도 기본값은 보통이고, 예상 보상이 코인5/XP10으로 표시된다', (tester) async {
    await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    final segmented = tester.widget<SegmentedButton<Difficulty>>(
      find.byType(SegmentedButton<Difficulty>),
    );
    expect(segmented.selected, {Difficulty.normal});

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

  testWidgets('등록하면 저장소에 반영된다', (tester) async {
    final repo = await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField), '지원서 초안 쓰기');
    await tester.pumpAndSettle();

    await tester.tap(find.text('어려움'));
    await tester.pumpAndSettle();

    await tester.tap(submitButton());
    await tester.pumpAndSettle();

    final quests = await repo.fetchQuests('test-uid');
    expect(quests, hasLength(1));
    expect(quests.single.title, '지원서 초안 쓰기');
    expect(quests.single.difficulty, Difficulty.hard);
  });

  testWidgets('제목 앞뒤 공백은 잘려서 저장된다', (tester) async {
    final repo = await pumpScreen(tester, const QuestCreateScreen());
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField), '  공백 있는 제목  ');
    await tester.pumpAndSettle();
    await tester.tap(submitButton());
    await tester.pumpAndSettle();

    final quests = await repo.fetchQuests('test-uid');
    expect(quests.single.title, '공백 있는 제목');
  });
}
