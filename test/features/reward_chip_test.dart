import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/reward_chip.dart';
import 'package:one_step/models/difficulty.dart';

/// checklist E-3 · 접근성 글꼴 배율 회귀 가드.
///
/// E-3 이전까지 checklist에 **"알려진 결함(미수정)"**으로 적혀 있던 결함을 잠근다:
/// [RewardChip]이 고정폭 `Row(mainAxisSize.min)`이라, 접근성 글꼴 배율을 키우면
/// 텍스트만 커지고 줄바꿈할 곳이 없어 오버플로 줄무늬가 떴다.
///
/// **여기 쓰는 폭·배율은 수정 전 코드에서 실제로 FAIL하는 조합이다**(가장 넓은 보상인
/// 어려움 = 코인10 · XP20 기준, 계측값):
/// - `large: false` — 배율 2.0에서 칩의 고유 폭이 **260.5px**였다. 폭 **208**에서
///   52.5px 오버플로. (208 = 소형 단말 폭 320 − 화면 좌우 여백 40 − 카드 패딩 24 −
///   우측 액션 열 48. 즉 퀘스트 카드 본문이 실제로 칩에 주는 폭이다.)
/// - `large: true` — 배율 2.0에서 고유 폭 **436px**. 폭 **320**(checklist가 지목한
///   "일반적인 소형 단말")에서 116px 오버플로.
///
/// 자명 통과를 막기 위해 각 케이스는 "오버플로 없음"만 보지 않고 **칩이 실제로 두 줄로
/// 접혔는지**(= 그 폭이 한 줄로는 정말 모자랐는지)까지 단언한다. 폭을 넉넉히 주는
/// 순간 이 단언이 먼저 깨진다.
void main() {
  /// 가장 넓은 보상(어려움 = 코인 10 · XP 20). 수치는 `kBaseRewards`에서 온다.
  final hard = rewardFor(Difficulty.hard);

  /// [width]와 글꼴 [scale]을 강제해 칩 하나만 띄우고 그 크기를 돌려준다.
  Future<Size> pumpChip(
    WidgetTester tester, {
    required double width,
    required double scale,
    required bool large,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(scale)),
          child: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: width,
                child: RewardChip(reward: hard, large: large),
              ),
            ),
          ),
        ),
      ),
    );
    return tester.getSize(find.byType(RewardChip));
  }

  group('큰 글꼴 배율(2.0)에서 오버플로하지 않는다', () {
    testWidgets('large: false — 퀘스트 카드 본문 폭 208', (tester) async {
      // 기준선: 폭이 넉넉하면 한 줄이다.
      final oneRun = await pumpChip(
        tester,
        width: 1000,
        scale: 2.0,
        large: false,
      );
      expect(tester.takeException(), isNull);

      final tight = await pumpChip(
        tester,
        width: 208,
        scale: 2.0,
        large: false,
      );

      // 핵심: 오버플로 줄무늬(RenderFlex overflowed)가 뜨지 않는다.
      expect(
        tester.takeException(),
        isNull,
        reason: '폭 208 · 배율 2.0에서 수정 전 코드는 52.5px 오버플로했다.',
      );
      // 자명 통과 방지: 이 폭은 한 줄로는 정말 모자랐다(두 줄로 접혔다).
      expect(
        tight.height,
        greaterThan(oneRun.height),
        reason: '한 줄에 다 들어갔다면 이 폭은 결함을 재현하지 못한다 — 더 좁혀야 한다.',
      );

      // 접힌 뒤에도 두 수치가 모두 남아 있다.
      expect(find.text('+${hard.coin}'), findsOneWidget);
      expect(find.text('XP +${hard.xp}'), findsOneWidget);
    });

    testWidgets('large: true — 소형 단말 폭 320', (tester) async {
      final oneRun = await pumpChip(
        tester,
        width: 1000,
        scale: 2.0,
        large: true,
      );
      expect(tester.takeException(), isNull);

      final tight = await pumpChip(
        tester,
        width: 320,
        scale: 2.0,
        large: true,
      );

      expect(
        tester.takeException(),
        isNull,
        reason: '폭 320 · 배율 2.0에서 수정 전 코드는 116px 오버플로했다.',
      );
      expect(
        tight.height,
        greaterThan(oneRun.height),
        reason: '한 줄에 다 들어갔다면 이 폭은 결함을 재현하지 못한다 — 더 좁혀야 한다.',
      );

      expect(find.text('+${hard.coin}'), findsOneWidget);
      expect(find.text('XP +${hard.xp}'), findsOneWidget);
    });
  });

  group('줄바꿈은 묶음 단위로만 일어난다', () {
    // 아이콘과 숫자가 서로 다른 줄로 갈라지면 "🪙"와 "+10"이 남남처럼 읽힌다.
    // 접힌 상태에서 각 아이콘과 짝 텍스트가 같은 줄(같은 세로 중심)에 있어야 한다.

    testWidgets('large: false — 코인·XP 아이콘이 각자의 숫자와 같은 줄에 남는다', (
      tester,
    ) async {
      final size = await pumpChip(
        tester,
        width: 208,
        scale: 2.0,
        large: false,
      );
      expect(tester.takeException(), isNull);

      final coinIconY = tester
          .getCenter(find.byIcon(Icons.monetization_on))
          .dy;
      final coinTextY = tester.getCenter(find.text('+${hard.coin}')).dy;
      final xpIconY = tester.getCenter(find.byIcon(Icons.star)).dy;
      final xpTextY = tester.getCenter(find.text('XP +${hard.xp}')).dy;

      expect(coinIconY, coinTextY, reason: '코인 아이콘과 숫자가 갈라졌다.');
      expect(xpIconY, xpTextY, reason: 'XP 아이콘과 숫자가 갈라졌다.');
      // 두 묶음은 서로 다른 줄에 있다(= 실제로 접힌 상태를 보고 있다).
      expect(coinIconY, lessThan(xpIconY));
      expect(size.height, greaterThan(0));
    });

    testWidgets('large: true — 코인·XP 아이콘이 각자의 숫자와 같은 줄에 남는다', (tester) async {
      await pumpChip(tester, width: 320, scale: 2.0, large: true);
      expect(tester.takeException(), isNull);

      expect(
        tester.getCenter(find.byIcon(Icons.monetization_on)).dy,
        tester.getCenter(find.text('+${hard.coin}')).dy,
      );
      expect(
        tester.getCenter(find.byIcon(Icons.star)).dy,
        tester.getCenter(find.text('XP +${hard.xp}')).dy,
      );
    });
  });

  testWidgets('기본 배율(1.0)에서는 예전처럼 한 줄이다 (레이아웃 변경으로 평소 모습이 바뀌지 않는다)', (
    tester,
  ) async {
    for (final large in [false, true]) {
      await pumpChip(tester, width: 320, scale: 1.0, large: large);
      expect(tester.takeException(), isNull);

      // 코인·XP가 같은 줄(한 줄 레이아웃).
      expect(
        tester.getCenter(find.byIcon(Icons.monetization_on)).dy,
        tester.getCenter(find.byIcon(Icons.star)).dy,
        reason: 'large=$large · 배율 1.0에서는 접히지 않아야 한다.',
      );
    }
  });
}
