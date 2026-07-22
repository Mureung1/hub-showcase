import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/features/home/widgets/streak_bonus_dialog.dart';

/// 연속 출석 축하 다이얼로그 단독 검증.
void main() {
  testWidgets('1주차: 실제 일수와 보너스 금액(코인 15 · XP 25)을 그대로 보여 준다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: StreakBonusDialog(streak: 7, bonus: streakBonusFor(7)),
      ),
    );

    expect(find.text('7일 연속!'), findsOneWidget);
    expect(find.textContaining('일주일 동안'), findsOneWidget);
    // 화면이 난이도·정책에서 다시 계산하지 않고 받은 값을 그대로 표시한다.
    expect(find.text('+15'), findsOneWidget);
    expect(find.text('XP +25'), findsOneWidget);
  });

  testWidgets('2주차: "14일 연속!"이 뜨고 "7일"은 어디에도 없다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: StreakBonusDialog(streak: 14, bonus: streakBonusFor(14)),
      ),
    );

    expect(find.text('14일 연속!'), findsOneWidget);
    // 주기 상수(7)를 하드코딩하면 여기서 걸린다.
    expect(find.textContaining('7일'), findsNothing);
    expect(find.textContaining('2주 동안'), findsOneWidget);
    expect(find.text('+30'), findsOneWidget);
    expect(find.text('XP +50'), findsOneWidget);
  });

  testWidgets('상한을 넘긴 5주차도 실제 일수를 말하고 금액은 받은 값(60/100)을 쓴다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: StreakBonusDialog(streak: 35, bonus: streakBonusFor(35)),
      ),
    );

    expect(find.text('35일 연속!'), findsOneWidget);
    expect(find.textContaining('5주 동안'), findsOneWidget);
    expect(find.text('+60'), findsOneWidget);
    expect(find.text('XP +100'), findsOneWidget);
  });

  testWidgets('확인 버튼을 누르면 닫힌다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showStreakBonusDialog(
                context,
                streak: 7,
                bonus: streakBonusFor(7),
              ),
              child: const Text('열기'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    expect(find.byType(StreakBonusDialog), findsOneWidget);

    await tester.tap(find.text('좋아요'));
    await tester.pumpAndSettle();
    expect(find.byType(StreakBonusDialog), findsNothing);
  });

  testWidgets('다크 테마에서도 렌더된다', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: StreakBonusDialog(streak: 21, bonus: streakBonusFor(21)),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.byType(StreakBonusDialog), findsOneWidget);
  });
}
