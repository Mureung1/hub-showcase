import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/shop_items.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/widgets/state_views.dart';
import 'package:one_step/features/shop/shop_screen.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

import '../helpers/pump_app.dart';

/// 목록 조회는 정상이고 **구매만** 실패하는 사용자 저장소.
///
/// `failWith`는 모든 호출을 실패시켜 "상점은 떠 있는데 구매만 실패"를 만들 수 없다.
/// 그 한 메서드만 갈아끼운다(quest_list_screen_test의 같은 이름 헬퍼와 취지 동일).
class _PurchaseFailingUserRepository extends InMemoryUserRepository {
  _PurchaseFailingUserRepository({super.seed});

  @override
  Future<void> purchaseItem(String uid, String itemId, int price) async {
    throw const NetworkFailure();
  }
}

/// 상점 화면 — 5상태 버튼 분기 · 구매 흐름 · 로딩/빈/오류.
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

  testWidgets('구매 실패(네트워크)면 스낵바로 알리고 화면은 살아 있다', (tester) async {
    // 로드는 정상이고 purchaseItem만 실패한다 — 구매 실패는 화면 전체 오류가
    // 아니라 스낵바로 알려야 한다(상점을 계속 둘러볼 수 있어야 한다).
    final repo = _PurchaseFailingUserRepository(
      seed: const AppUser(uid: uid, coin: 100),
    );
    addTearDown(repo.dispose);

    await pumpScreen(
      tester,
      const ShopScreen(),
      extraOverrides: [userRepositoryProvider.overrideWithValue(repo)],
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('구매').first);
    await tester.pumpAndSettle();

    expect(find.text('인터넷 연결을 확인해 주세요.'), findsOneWidget);
    // 화면은 그대로다 — 실패 하나로 상점이 오류 화면이 되지 않는다.
    expect(find.byType(ErrorView), findsNothing);
    // 코인도 그대로라 다시 시도할 수 있다(중복 실행 잠금이 풀렸다).
    expect((await repo.fetchUser(uid)).coin, 100);
    expect(find.text('구매'), findsWidgets);
  });

  testWidgets('코인 잔액 pill이 화면 상단에 보인다', (tester) async {
    await pumpShop(tester, coin: 1240);
    expect(find.text('1,240'), findsWidgets);
  });

  /// checklist E-3 — "주요 화면(홈·퀘스트·상점)의 오류/빈 상태가 각각 사용자
  /// 친화적으로 표시된다".
  ///
  /// 퀘스트 목록은 `quest_list_screen_test.dart`가 같은 3항목(오류 · 오류≠빈 상태 ·
  /// 로딩 스켈레톤)을 이미 잠갔다. 상점은 화면 코드에 세 상태가 구현돼 있을 뿐
  /// **테스트가 없었다** — 같은 패턴을 그대로 가져와 채운다.
  group('오류 · 빈 상태 · 로딩이 서로 구분된다 (E-3)', () {
    testWidgets('저장소가 실패하면 ErrorView + 재시도 버튼이 뜬다', (tester) async {
      await pumpScreen(
        tester,
        const ShopScreen(),
        user: const AppUser(uid: uid, coin: 100),
        failWith: const NetworkFailure(),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      // 사용자 친화적 문구 — 예외 문자열이 아니라 AppFailure의 안내 메시지다.
      expect(find.text('인터넷 연결을 확인해 주세요.'), findsOneWidget);
      expect(find.text('다시 시도'), findsOneWidget);

      // 오류 화면에서는 상품 격자를 그리지 않는다(반쯤 그려진 화면 금지).
      expect(find.text('구매'), findsNothing);
    });

    testWidgets('오류 상태는 빈 상태와 섞이지 않는다', (tester) async {
      await pumpScreen(
        tester,
        const ShopScreen(),
        user: const AppUser(uid: uid, coin: 100),
        failWith: const NetworkFailure(),
      );
      await tester.pumpAndSettle();

      // 오류일 때 빈 상태는 없다.
      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.byType(EmptyView), findsNothing);
      // 로딩도 아니다 — 세 상태가 동시에 뜨지 않는다.
      expect(find.byType(SkeletonBox), findsNothing);
    });

    testWidgets('정상 데이터일 때는 오류도 빈 상태도 뜨지 않는다 (반대 방향)', (tester) async {
      // 상점의 빈 상태(EmptyView)는 `kShopItems.isEmpty` 방어 분기다. 카탈로그는
      // 코드 상수라 실행 중 비는 일이 없다 — 그래서 반대 방향은 "정상 데이터에
      // 오류·빈 상태가 섞이지 않는다"로 못 박는다(빈 상태가 오류를 대신 그리는
      // 회귀는 위 테스트가, 오류가 빈 상태를 대신 그리는 회귀는 이 테스트가 잡는다).
      expect(kShopItems, isNotEmpty);

      await pumpShop(tester, coin: 100);

      expect(find.byType(ErrorView), findsNothing);
      expect(find.byType(EmptyView), findsNothing);
      expect(find.byType(SkeletonBox), findsNothing);
      expect(find.text('상점'), findsOneWidget);
      expect(find.text('구매'), findsWidgets);
    });

    testWidgets('로딩 중엔 스켈레톤이고 오류·빈 상태가 아니다 (사용자 스트림)', (tester) async {
      // InMemory 저장소는 즉시 응답하므로 로딩 프레임을 볼 수 없다.
      // 영원히 로딩인 스트림을 주입해 로딩 UI만 따로 검증한다.
      await pumpScreen(
        tester,
        const ShopScreen(),
        extraOverrides: loadingForever(),
      );
      await tester.pump();

      expect(find.byType(SkeletonBox), findsWidgets);
      expect(find.byType(ErrorView), findsNothing);
      expect(find.byType(EmptyView), findsNothing);
    });

    testWidgets('로딩 중엔 스켈레톤이다 (보유 목록 스트림 — 두 번째 로딩 분기)', (tester) async {
      // 상점은 사용자·보유 **두** 스트림이 모두 준비돼야 버튼 상태를 정할 수 있다.
      // 사용자만 도착한 중간 상태에서도 격자를 그리면 안 된다.
      await pumpScreen(
        tester,
        const ShopScreen(),
        user: const AppUser(uid: uid, coin: 100),
        extraOverrides: [
          inventoryProvider.overrideWith(
            (ref) => Completer<Set<String>>().future.asStream(),
          ),
        ],
      );
      await tester.pump();

      expect(find.byType(SkeletonBox), findsWidgets);
      expect(find.byType(ErrorView), findsNothing);
      expect(find.byType(EmptyView), findsNothing);
      expect(find.text('구매'), findsNothing);
    });
  });
}
