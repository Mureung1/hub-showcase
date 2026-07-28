import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/shop_items.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/widgets/pixel_art.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/models/app_user.dart';

/// 장착 아이템이 캐릭터 카드에 반영되는지 + 고아 방어.
///
/// 오라는 도트아트 스프라이트로, 배경은 백드롭 채움으로 표현된다. 여기서 지키려는
/// 것은 "이모지가 보인다"가 아니라 **"그 아이템이 보인다"**이므로, 렌더된
/// [PixelArt]의 자산 경로로 아이템을 식별한다. 자산 도입 전 `find.text('✨')`가
/// 하던 역할과 같은 불변식이다.
///
/// 경로 비교에 리터럴이 아니라 [shopItemAsset]을 쓰는 이유: 화면과 테스트가 같은
/// 유도 규칙을 보게 해서, 규칙이 바뀌면 둘이 함께 움직이게 한다.
void main() {
  Future<void> pumpCard(WidgetTester tester, AppUser user) {
    return tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: CharacterCard(user: user)),
      ),
    );
  }

  /// 특정 자산을 그리는 [PixelArt]를 찾는다.
  Finder art(String asset) => find.byWidgetPredicate(
    (w) => w is PixelArt && w.asset == asset,
    description: 'PixelArt($asset)',
  );

  final sparkle = shopItemAsset(itemById('aura_sparkle')!);
  final leaf = shopItemAsset(itemById('aura_leaf')!);
  final forest = shopItemAsset(itemById('bg_forest')!);

  testWidgets('오라를 장착하면 캐릭터 주변에 오라 스프라이트가 나타난다', (tester) async {
    await pumpCard(
      tester,
      const AppUser(uid: 'u', equipped: {'aura': 'aura_sparkle'}),
    );

    // 흩뿌리는 개수(3)까지 고정한다 — 하나만 남아도 통과하는 느슨한 단언을 피한다.
    expect(art(sparkle), findsNWidgets(3));
    // 장착하지 않은 오라는 섞여 들어오지 않는다.
    expect(art(leaf), findsNothing);
  });

  testWidgets('배경을 장착하면 백드롭이 그 배경 자산으로 채워진다', (tester) async {
    await pumpCard(
      tester,
      const AppUser(uid: 'u', equipped: {'background': 'bg_forest'}),
    );

    expect(art(forest), findsOneWidget);
  });

  testWidgets('장착이 없으면 오라도 배경 자산도 없다 (기존 렌더 유지)', (tester) async {
    await pumpCard(tester, const AppUser(uid: 'u'));

    expect(art(sparkle), findsNothing);
    expect(art(leaf), findsNothing);
    // 미장착 백드롭은 틴트 채움이라 배경 자산이 뜨면 안 된다
    // (bg_forest를 공짜로 주는 셈이 된다).
    expect(art(forest), findsNothing);
    // 캐릭터 본체(알 단계)와 레벨 텍스트는 그대로.
    expect(find.textContaining('Level 1'), findsOneWidget);
  });

  testWidgets('없는 아이템 id를 장착해도(고아) 카드가 죽지 않고 오라 없음', (tester) async {
    await pumpCard(
      tester,
      const AppUser(uid: 'u', equipped: {'aura': 'deleted_item', 'background': 'ghost'}),
    );

    // 예외 없이 렌더되고, 깨진 장착은 무시된다.
    expect(tester.takeException(), isNull);
    expect(art(sparkle), findsNothing);
    expect(find.textContaining('Level 1'), findsOneWidget);
  });

  testWidgets('슬롯이 어긋난 장착(배경 슬롯에 오라 id)은 무시된다', (tester) async {
    // background 슬롯에 오라 아이템 id를 넣으면 slot 불일치라 배경으로 쓰지 않는다.
    await pumpCard(
      tester,
      const AppUser(uid: 'u', equipped: {'background': 'aura_sparkle'}),
    );

    expect(tester.takeException(), isNull);
    // 배경 슬롯에 오라를 넣었으니 오라로도 렌더되지 않는다(aura 슬롯 비어 있음).
    expect(art(sparkle), findsNothing);
  });
}
