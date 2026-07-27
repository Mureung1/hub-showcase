import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/reward_showcase.dart';
import 'package:one_step/models/difficulty.dart';

/// checklist E-4 D-3 후속 · **보상 위계 회귀 가드.**
///
/// [RewardShowcase]는 주석으로 "방금 받은 코인·XP를 **주인공으로** 보여 준다"고
/// 선언한다. 그런데 오버플로를 막으려고 배율이 높을 때 확대 표시를 끄자, 접근성
/// 글꼴을 키운 사용자에게만 그 선언이 뒤집혔다 (실측):
///
/// | 배율 | 수정 전 실효 크기 | 아이콘 |
/// |------|------------------|--------|
/// | 1.0  | 20.0px           | 28     |
/// | 1.3  | 26.0px           | 28     |
/// | 1.4  | **16.8px**       | **14** |
/// | 1.5  | **18.0px**       | **14** |
/// | 1.6  | **19.2px**       | **14** |
///
/// 글꼴을 **키운** 사용자가 아무 설정도 안 한 사용자보다 보상 숫자를 작게 봤고,
/// 1.3→1.4 경계에서 26px → 16.8px로 35% 급락했다.
///
/// 이 결함은 **수치 규칙**이라 오버플로 관통 테스트(`text_scale_layout_test.dart`)로는
/// 잡히지 않는다 — 작아지는 건 넘치지 않으니까. 그래서 크기 자체를 단언한다.
///
/// **자명 통과 방지 장치 세 가지.**
/// 1. 기준값(배율 1.0)을 하드코딩하지 않고 **같은 테스트 안에서 측정**한다. 디자인
///    토큰이 바뀌어도 테스트가 거짓말하지 않는다.
/// 2. 배율이 실제로 글자에 **닿는지**까지 본다(1.3이 1.0보다 크다). 상한을 1.0으로
///    묶어 버리면 단조성은 만족하지만 사용자 설정을 무시하는 것이므로 여기서 걸린다.
/// 3. 가장 좁은 폭(320dp)에서 재므로, 위계를 지키려다 오버플로가 돌아오면 같은
///    테스트가 잡는다.
void main() {
  /// 가장 넓은 보상(어려움 = 코인 10 · XP 20) — 폭 압박이 가장 큰 조건.
  final hard = rewardFor(Difficulty.hard);

  /// 소형 단말 폭. 다이얼로그 안쪽이 아니라 화면 폭 그대로 주어 여유를 최소화한다.
  const width = 320.0;

  /// 실제로 그려진 값. `fontSize`는 위젯이 고른 스타일, `effectivePx`는 거기에
  /// **그 텍스트에 진짜 적용된 배율**을 곱한 화면상 크기다(바깥 배율이 아니다 —
  /// 카드 안쪽에서 배율을 조이든 스타일 티어를 바꾸든 결과를 똑같이 잰다).
  ({double fontSize, double effectivePx, double iconSize}) measure(
    WidgetTester tester,
  ) {
    final paragraph = tester.renderObject<RenderParagraph>(
      find.text('+${hard.coin}'),
    );
    final fontSize = paragraph.text.style?.fontSize;
    expect(fontSize, isNotNull, reason: '코인 숫자에 fontSize가 없으면 크기를 비교할 수 없다.');

    final iconSize = tester
        .widget<Icon>(find.byIcon(Symbols.monetization_on))
        .size;
    expect(iconSize, isNotNull, reason: '코인 아이콘 크기가 지정돼 있지 않다.');

    return (
      fontSize: fontSize!,
      effectivePx: paragraph.textScaler.scale(fontSize),
      iconSize: iconSize!,
    );
  }

  Future<({double fontSize, double effectivePx, double iconSize})> pumpAt(
    WidgetTester tester,
    double scale,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(width, 800);
    addTearDown(tester.view.reset);

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
                child: RewardShowcase(reward: hard),
              ),
            ),
          ),
        ),
      ),
    );

    expect(
      tester.takeException(),
      isNull,
      reason: '배율 $scale · 폭 $width 에서 보상 카드가 넘쳤다.',
    );
    return measure(tester);
  }

  testWidgets('글꼴을 키운 사용자가 기본 사용자보다 보상을 작게 보지 않는다 (단조 비감소)', (tester) async {
    const scales = <double>[1.0, 1.3, 1.4, 1.5, 1.6, 2.0];

    final measured =
        <double, ({double fontSize, double effectivePx, double iconSize})>{};
    for (final scale in scales) {
      measured[scale] = await pumpAt(tester, scale);
    }

    // 기준선은 **측정값**이다(하드코딩 금지 — 토큰이 바뀌면 기준도 같이 움직여야 한다).
    final baseline = measured[1.0]!;

    final table = scales
        .map(
          (s) =>
              '  배율 $s → fontSize ${measured[s]!.fontSize} · '
              '실효 ${measured[s]!.effectivePx}px · 아이콘 ${measured[s]!.iconSize}',
        )
        .join('\n');

    // ① 어떤 배율에서도 기본 사용자(배율 1.0)보다 작아지지 않는다.
    for (final scale in scales) {
      final m = measured[scale]!;
      expect(
        m.effectivePx,
        greaterThanOrEqualTo(baseline.effectivePx),
        reason:
            '배율 $scale 의 보상 숫자가 기본 배율(1.0)보다 작다.\n'
            '글꼴을 키운 사용자에게만 보상이 주인공 자리에서 밀려난다.\n$table',
      );
      expect(
        m.iconSize,
        greaterThanOrEqualTo(baseline.iconSize),
        reason: '배율 $scale 의 코인 아이콘이 기본 배율(1.0)보다 작다.\n$table',
      );
    }

    // ② 배율이 커질 때 실효 크기가 줄어드는 구간이 없다(경계 급락 금지).
    for (var i = 1; i < scales.length; i++) {
      final prev = measured[scales[i - 1]]!;
      final curr = measured[scales[i]]!;
      expect(
        curr.effectivePx,
        greaterThanOrEqualTo(prev.effectivePx),
        reason:
            '배율 ${scales[i - 1]} → ${scales[i]} 에서 보상 숫자가 오히려 작아졌다.\n$table',
      );
      expect(
        curr.iconSize,
        greaterThanOrEqualTo(prev.iconSize),
        reason:
            '배율 ${scales[i - 1]} → ${scales[i]} 에서 코인 아이콘이 오히려 작아졌다.\n$table',
      );
    }

    // ③ 자명 통과 방지: 배율이 실제로 보상 숫자에 닿는다. 상한을 1.0으로 묶으면
    //    ①②는 통과하지만 사용자의 접근성 설정을 통째로 무시하는 것이므로 여기서 걸린다.
    expect(
      measured[1.3]!.effectivePx,
      greaterThan(baseline.effectivePx),
      reason: '배율 1.3에서 보상 숫자가 커지지 않았다 — 접근성 설정이 카드에 전달되지 않는다.\n$table',
    );
  });

  testWidgets('보상 두 수치는 어떤 배율에서도 함께 남는다', (tester) async {
    for (final scale in [1.0, 1.4, 2.0]) {
      await pumpAt(tester, scale);
      expect(find.text('+${hard.coin}'), findsOneWidget, reason: '배율 $scale');
      expect(find.text('XP +${hard.xp}'), findsOneWidget, reason: '배율 $scale');
    }
  });
}
