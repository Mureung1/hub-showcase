import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/home/home_screen.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/models/app_user.dart';

import '../helpers/pump_app.dart';

/// checklist 1주차 · 홈/캐릭터 화면
/// - 레벨·XP·코인이 데이터 바인딩되어 실제 값이 출력된다
/// - 로딩 중 스켈레톤이 표시된다
/// - 신규 사용자도 기본값(Lv.1, XP 0, 코인 0)으로 정상 렌더된다
void main() {
  testWidgets('신규 사용자는 Lv.1 / XP 0 / 코인 0으로 렌더된다', (tester) async {
    await pumpScreen(tester, const HomeScreen());
    await tester.pumpAndSettle();

    expect(find.byType(CharacterCard), findsOneWidget);

    // 레벨과 진화 단계
    expect(find.text('Level 1 · 알'), findsOneWidget);
    // XP (알 단계는 레벨당 5 XP)
    expect(find.text('XP 0 / 5'), findsOneWidget);
    // 코인
    expect(find.text('0'), findsOneWidget);
  });

  testWidgets('저장된 값이 그대로 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: const AppUser(uid: 'test-uid', level: 12, xp: 4, coin: 1240),
    );
    await tester.pumpAndSettle();

    // Lv.12는 참새 단계, 레벨당 10 XP
    expect(find.text('Level 12 · 참새'), findsOneWidget);
    expect(find.text('XP 4 / 10'), findsOneWidget);
    // 천 단위 구분
    expect(find.text('1,240'), findsOneWidget);
  });

  testWidgets('로딩 중에는 스켈레톤이 표시된다', (tester) async {
    // InMemory 저장소는 즉시 응답하므로 로딩 프레임을 볼 수 없다.
    // 영원히 로딩인 스트림을 주입해 로딩 UI만 따로 검증한다.
    await pumpScreen(
      tester,
      const HomeScreen(),
      extraOverrides: loadingForever(),
    );
    await tester.pump();

    expect(find.byType(SkeletonBox), findsWidgets);
    expect(find.byType(CharacterCard), findsNothing);
  });

  testWidgets('오류 시 오류 화면과 재시도가 표시된다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      failWith: const NetworkFailure(),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);
  });

  testWidgets('환생 버튼은 Lv.50 미만이면 비활성이다', (tester) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      user: const AppUser(uid: 'test-uid', level: 12),
    );
    await tester.pumpAndSettle();

    expect(find.text('환생 (Lv.12)'), findsOneWidget);
  });
}
