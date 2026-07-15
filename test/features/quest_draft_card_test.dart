import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/difficulty_pill.dart';
import 'package:one_step/core/widgets/reward_chip.dart';
import 'package:one_step/features/quest/widgets/quest_draft_card.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest_draft.dart';

/// 커밋5 · 분해 결과 카드 컴포넌트화 — [QuestDraftCard] 표시 검증.
/// - 제목이 렌더된다.
/// - 난이도 pill(라벨 포함)이 렌더된다.
/// - 보상 칩이 렌더되고 수치가 난이도에 맞다(easy +3/XP+5, hard +10/XP+20).
/// - 저장소가 필요 없는 순수 표시 위젯이라 테마만 감싸 직접 띄운다.
void main() {
  Future<void> pumpCard(WidgetTester tester, QuestDraft draft) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: QuestDraftCard(draft: draft)),
      ),
    );
  }

  QuestDraft draftOf(Difficulty difficulty) => QuestDraft(
    localId: 'draft-0',
    title: '공고 페이지 열어 지원 자격 확인하기',
    difficulty: difficulty,
    order: 0,
  );

  testWidgets('제목과 난이도 pill·보상 칩이 렌더된다', (tester) async {
    await pumpCard(tester, draftOf(Difficulty.easy));

    expect(find.text('공고 페이지 열어 지원 자격 확인하기'), findsOneWidget);
    expect(find.byType(DifficultyPill), findsOneWidget);
    expect(find.byType(RewardChip), findsOneWidget);
    // 난이도 pill 라벨(• 쉬움).
    expect(find.text('• 쉬움'), findsOneWidget);
  });

  testWidgets('easy 보상은 +3 / XP +5로 표시된다', (tester) async {
    await pumpCard(tester, draftOf(Difficulty.easy));

    expect(find.text('+3'), findsOneWidget);
    expect(find.text('XP +5'), findsOneWidget);
  });

  testWidgets('hard 보상은 +10 / XP +20으로 표시된다', (tester) async {
    await pumpCard(tester, draftOf(Difficulty.hard));

    expect(find.text('• 어려움'), findsOneWidget);
    expect(find.text('+10'), findsOneWidget);
    expect(find.text('XP +20'), findsOneWidget);
  });

  testWidgets('서로 다른 난이도 3개가 각자 맞는 보상을 표시한다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Column(
            children: [
              QuestDraftCard(
                draft: QuestDraft(
                  localId: 'd-easy',
                  title: '쉬운 퀘스트',
                  difficulty: Difficulty.easy,
                ),
              ),
              QuestDraftCard(
                draft: QuestDraft(
                  localId: 'd-normal',
                  title: '보통 퀘스트',
                  difficulty: Difficulty.normal,
                ),
              ),
              QuestDraftCard(
                draft: QuestDraft(
                  localId: 'd-hard',
                  title: '어려운 퀘스트',
                  difficulty: Difficulty.hard,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // 세 카드 모두 렌더.
    expect(find.byType(QuestDraftCard), findsNWidgets(3));

    // easy 3/5 · normal 5/10 · hard 10/20 각각 정확히 한 번씩.
    expect(find.text('+3'), findsOneWidget);
    expect(find.text('XP +5'), findsOneWidget);
    expect(find.text('+5'), findsOneWidget);
    expect(find.text('XP +10'), findsOneWidget);
    expect(find.text('+10'), findsOneWidget);
    expect(find.text('XP +20'), findsOneWidget);
  });
}
