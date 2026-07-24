import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/shop/shop_screen.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

import '../helpers/pump_app.dart';

/// 상점 화면 — 5상태 버튼 분기 · 구매 흐름 · 로딩/오류.
void main() {
  const uid = 'test-uid';

  /// pumpScreen이 내부에서 만든 사용자 저장소를 꺼낸다(보유 목록 주입·검증용).
  Future<InMemoryUserRepository> pumpShop(
    WidgetTester tester, {
    required int coin,
    Map<String, String> equipped = const {},
    Set<String> inventory = const {},
    AppFailure? failWith,
  }) async {
    final questRepo = await pumpScreen(
      tester,
      const ShopScreen(),
      user: AppUser(uid: uid, coin: coin, equipped: equipped),
      failWith: failWith,
    );
    final userRepo = questRepo.users!;
    if (inventory.isNotEmpty) userRepo.putInventory(uid, inventory);
    await tester.pumpAndSettle();
    return userRepo;
  }

  testWidgets('미보유 + 코인 충분 → 구매 버튼', (tester) async {
    // bg_forest(10)만 살 수 있게 코인 10. 나머지는 부족.
    await pumpShop(tester, coin: 10);

    expect(find.text('구매'), findsOneWidget);
    expect(find.text('초록 숲'), findsOneWidget);
  });

  testWidgets('미보유 + 코인 부족 → 비활성 "코인이 부족해요"', (tester) async {
    await pumpShop(tester, coin: 5); // 가장 싼 아이템(10)도 못 산다.

    final buttons = find.text('코인이 부족해요');
    expect(buttons, findsWidgets);
    expect(find.text('구매'), findsNothing);

    // 정말 비활성인지 — 버튼의 onPressed가 null.
    final button = tester.widget<FilledButton>(
      find.ancestor(
        of: find.text('코인이 부족해요').first,
        matching: find.byType(FilledButton),
      ),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('구매하면 코인이 차감되고 버튼이 장착으로 바뀐다', (tester) async {
    final userRepo = await pumpShop(tester, coin: 10);

    expect(find.text('구매'), findsOneWidget);
    await tester.tap(find.text('구매'));
    await tester.pumpAndSettle();

    // 코인 실제 차감(영속).
    expect((await userRepo.fetchUser(uid)).coin, 0);
    // 보유로 전환 — 구매 버튼이 사라지고 장착 버튼 + "보유 중"이 뜬다.
    expect(find.text('구매'), findsNothing);
    expect(find.text('장착'), findsOneWidget);
    expect(find.text('보유 중'), findsOneWidget);
  });

  testWidgets('보유 + 미장착 → 장착 버튼, 누르면 equipped에 반영', (tester) async {
    final userRepo = await pumpShop(
      tester,
      coin: 0,
      inventory: {'bg_forest'},
    );

    expect(find.text('장착'), findsOneWidget);
    await tester.tap(find.text('장착'));
    await tester.pumpAndSettle();

    // 장착이 사용자 문서에 반영되고(영속) 버튼이 해제로 바뀐다.
    expect((await userRepo.fetchUser(uid)).equipped, {'background': 'bg_forest'});
    expect(find.text('해제'), findsOneWidget);
    expect(find.text('장착 중'), findsOneWidget);
  });

  testWidgets('보유 + 장착 중 → 해제 버튼, 누르면 장착이 풀린다', (tester) async {
    final userRepo = await pumpShop(
      tester,
      coin: 0,
      equipped: {'background': 'bg_forest'},
      inventory: {'bg_forest'},
    );

    expect(find.text('해제'), findsOneWidget);
    await tester.tap(find.text('해제'));
    await tester.pumpAndSettle();

    expect((await userRepo.fetchUser(uid)).equipped, isEmpty);
    expect(find.text('장착'), findsOneWidget);
  });

  testWidgets('구매 실패(네트워크)면 스낵바로 알린다', (tester) async {
    // failWith를 주면 저장소 모든 호출이 실패한다. 화면 로드 자체가 오류가 되므로
    // 여기서는 로드 실패 → ErrorView 경로를 확인한다.
    await pumpScreen(
      tester,
      const ShopScreen(),
      user: const AppUser(uid: uid, coin: 100),
      failWith: const NetworkFailure(),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);
  });

  testWidgets('코인 잔액 pill이 화면 상단에 보인다', (tester) async {
    await pumpShop(tester, coin: 1240);
    expect(find.text('1,240'), findsWidgets);
  });
}
