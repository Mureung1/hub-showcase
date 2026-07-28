import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/empty_art.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/pixel_art.dart';
import 'package:one_step/core/widgets/state_views.dart';

/// 자산 로드 실패 폴백 — `docs/checklist.md`의 캐릭터 렌더 PASS 조건
/// ("자산 로드 실패 시 대체 표시(이모지)가 나온다")의 직접 증거.
///
/// **실패를 "없는 경로"로 만든다.** 실재하는 경로로 실패를 흉내 낼 수는 없다:
/// 위젯 테스트에서 유효 자산은 번들 조회를 통과한 뒤 실제 디코딩이 fake-async
/// 밖에서 이뤄져 영영 완료되지 않으므로, errorBuilder가 불리지 않고 테스트가
/// 기다리기만 한다. 없는 경로는 번들 조회 단계에서 곧바로 실패하고 그 실패는
/// 테스트 시간 안에서 관측된다.
void main() {
  Widget host(Widget child) =>
      MaterialApp(theme: AppTheme.light, home: Scaffold(body: Center(child: child)));

  const missing = 'assets/characters/__no_such_file__.png';

  testWidgets('자산을 못 읽으면 폴백 이모지가 대신 나온다', (tester) async {
    await tester.pumpWidget(
      host(PixelArt.emoji(asset: missing, emoji: '🥚', size: 88)),
    );
    await tester.pumpAndSettle();

    expect(find.text('🥚'), findsOneWidget);
  });

  testWidgets('자산을 못 읽어도 예외가 새어 나가지 않는다 (화면이 죽지 않는다)', (tester) async {
    await tester.pumpWidget(
      host(
        Column(
          children: [
            PixelArt.emoji(asset: missing, emoji: '🥚', size: 40),
            const Text('레벨 표시는 그대로'),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('레벨 표시는 그대로'), findsOneWidget);
  });

  testWidgets('폴백은 이모지만이 아니다 — 임의 위젯으로 떨어질 수 있다 (배경 틴트용)', (tester) async {
    // 배경은 이모지가 아니라 원래의 틴트 채움으로 떨어져야 한다.
    await tester.pumpWidget(
      host(
        const SizedBox(
          width: 100,
          height: 50,
          child: PixelArt(
            asset: 'assets/backgrounds/__no_such_file__.png',
            fallback: ColoredBox(color: Color(0xFF006E2F), child: Text('틴트')),
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('틴트'), findsOneWidget);
  });

  group('EmptyView', () {
    testWidgets('asset을 주면 일러스트를 그린다', (tester) async {
      await tester.pumpWidget(
        host(
          const EmptyView(
            title: '아직 퀘스트가 없어요',
            emoji: '🪺',
            asset: EmptyArt.quest,
          ),
        ),
      );

      expect(
        find.byWidgetPredicate((w) => w is PixelArt && w.asset == EmptyArt.quest),
        findsOneWidget,
      );
      expect(find.text('아직 퀘스트가 없어요'), findsOneWidget);
    });

    testWidgets('asset이 없으면 예전처럼 이모지만 그린다 (자산 없는 호출부 보호)', (tester) async {
      await tester.pumpWidget(
        host(const EmptyView(title: '준비 중이에요', emoji: '🪺')),
      );

      expect(find.byType(PixelArt), findsNothing);
      expect(find.text('🪺'), findsOneWidget);
    });

    testWidgets('일러스트를 못 읽으면 이모지로 떨어진다', (tester) async {
      await tester.pumpWidget(
        host(
          const EmptyView(
            title: '아직 퀘스트가 없어요',
            emoji: '🪺',
            asset: 'assets/empty/__no_such_file__.png',
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('🪺'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
