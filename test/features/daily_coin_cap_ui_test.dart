import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/features/quest/quest_list_screen.dart';
import 'package:one_step/features/quest/widgets/quest_complete_dialog.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';

import '../helpers/pump_app.dart';

/// 하루 코인 상한이 **화면에 정직하게 드러나는가**.
///
/// 핵심은 "표시와 실지급이 어긋나지 않는다"이다. 절삭이 일어났는데 다이얼로그가
/// 난이도표의 금액(10코인)을 그대로 보여 주면, 잔액과 맞지 않아 사용자는 보상
/// 규칙 자체를 못 믿게 된다.
void main() {
  // 저장소와 화면이 같이 볼 고정 시각(KST 2026-07-21 정오).
  final now = DateTime.utc(2026, 7, 21, 3);
  DateTime clock() => now;

  Future<void> completeSkippingMemo(WidgetTester tester) async {
    await tester.tap(find.byTooltip('완료'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('건너뛰기'));
    await tester.pumpAndSettle();
  }

  testWidgets('상한 경계에서 다이얼로그가 **실지급액**을 보여 준다 (68 + 어려움 → +2)', (
    tester,
  ) async {
    final repo = await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: [
        Quest(id: 'q1', title: '어려운 퀘스트', difficulty: Difficulty.hard),
      ],
      user: AppUser(
        uid: 'test-uid',
        coin: 68,
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: 68,
      ),
      clock: clock,
    );
    await tester.pumpAndSettle();

    await completeSkippingMemo(tester);

    expect(find.byType(QuestCompleteDialog), findsOneWidget);

    // 다이얼로그 **안**만 본다 — 뒤에 남아 있는 퀘스트 카드의 "예상 보상(+10)"과
    // 섞이면 검증이 무의미해진다. 지급 결과는 다이얼로그가 말한다.
    Finder inDialog(Finder matching) => find.descendant(
      of: find.byType(QuestCompleteDialog),
      matching: matching,
    );

    // 난이도표 금액(10)이 아니라 실제로 들어온 2를 보여 준다.
    expect(inDialog(find.text('+2')), findsOneWidget);
    expect(inDialog(find.text('+10')), findsNothing);
    // XP는 절삭되지 않았다.
    expect(inDialog(find.text('XP +20')), findsOneWidget);
    // 왜 적게 들어왔는지 이유를 밝힌다.
    expect(find.textContaining('지급되지 않았어요'), findsOneWidget);

    // 표시와 잔액이 일치한다.
    final user = await repo.users!.fetchUser('test-uid');
    expect(user.coin, 70);
  });

  testWidgets('절삭이 없으면 상한 안내 문구가 뜨지 않는다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: [
        Quest(id: 'q1', title: '어려운 퀘스트', difficulty: Difficulty.hard),
      ],
      clock: clock,
    );
    await tester.pumpAndSettle();

    await completeSkippingMemo(tester);

    expect(find.text('+10'), findsWidgets);
    expect(find.textContaining('지급되지 않았어요'), findsNothing);
  });

  testWidgets('상한에 도달하면 목록 상단에 안내 줄이 뜬다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: [
        Quest(id: 'q1', title: '퀘스트', difficulty: Difficulty.easy),
      ],
      user: AppUser(
        uid: 'test-uid',
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: kDailyCoinCap,
      ),
      clock: clock,
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('오늘 코인은 $kDailyCoinCap개까지 받았어요'), findsOneWidget);
    // XP는 계속 오른다는 사실을 함께 알린다("오늘은 더 해도 소용없다" 방지).
    expect(find.textContaining('XP는 계속 올라갑니다'), findsOneWidget);
  });

  testWidgets('상한에 도달하지 않았으면 안내 줄이 없다', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: [
        Quest(id: 'q1', title: '퀘스트', difficulty: Difficulty.easy),
      ],
      user: AppUser(
        uid: 'test-uid',
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: 69,
      ),
      clock: clock,
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('오늘 코인은'), findsNothing);
  });

  testWidgets('어제 상한을 채웠어도 오늘은 안내가 뜨지 않는다 (날짜 만료)', (tester) async {
    await pumpScreen(
      tester,
      const QuestListScreen(),
      quests: [
        Quest(id: 'q1', title: '퀘스트', difficulty: Difficulty.easy),
      ],
      user: AppUser(
        uid: 'test-uid',
        dailyCoinDate: '2026-07-20',
        dailyCoinEarned: kDailyCoinCap,
      ),
      clock: clock,
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('오늘 코인은'), findsNothing);
  });

  group('QuestCompleteDialog 단독', () {
    Future<void> pumpDialog(
      WidgetTester tester, {
      required Reward reward,
      int cutCoin = 0,
    }) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: QuestCompleteDialog(
            questTitle: '퀘스트',
            reward: reward,
            cutCoin: cutCoin,
          ),
        ),
      );
      // 코인·XP 카운트업이 끝나야 최종 지급액(+2 등)이 표시된다(4주차 연출).
      await tester.pumpAndSettle();
    }

    testWidgets('cutCoin이 0이면 안내가 없다', (tester) async {
      await pumpDialog(tester, reward: const Reward(coin: 10, xp: 20));
      expect(find.textContaining('지급되지 않았어요'), findsNothing);
    });

    testWidgets('cutCoin이 있으면 깎인 양과 XP 유지 사실을 밝힌다', (tester) async {
      await pumpDialog(
        tester,
        reward: const Reward(coin: 2, xp: 20),
        cutCoin: 8,
      );

      expect(find.text('+2'), findsOneWidget);
      expect(find.textContaining('8코인은 지급되지 않았어요'), findsOneWidget);
      expect(find.textContaining('XP는 그대로예요'), findsOneWidget);
    });
  });
}
