import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/features/home/widgets/character_card.dart';
import 'package:one_step/models/app_user.dart';

/// 장착 아이템이 캐릭터 카드에 반영되는지 + 고아 방어.
///
/// 캐릭터가 이모지 목업이라 오라는 이모지로, 배경은 틴트로 표현된다. 여기서는
/// 관찰 가능한 오라 이모지 렌더를 중심으로 검증하고, **장착이 없거나 깨졌을 때**
/// 오라가 절대 나타나지 않음을 함께 고정한다(기존 홈 렌더 회귀 방지).
void main() {
  Future<void> pumpCard(WidgetTester tester, AppUser user) {
    return tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: CharacterCard(user: user)),
      ),
    );
  }

  testWidgets('오라를 장착하면 캐릭터 주변에 오라 이모지가 나타난다', (tester) async {
    await pumpCard(
      tester,
      const AppUser(uid: 'u', equipped: {'aura': 'aura_sparkle'}),
    );

    // aura_sparkle 은 ✨. 캐릭터 주변에 여러 개 흩뿌린다.
    expect(find.text('✨'), findsWidgets);
  });

  testWidgets('장착이 없으면 오라 이모지가 없다 (기존 렌더 유지)', (tester) async {
    await pumpCard(tester, const AppUser(uid: 'u'));

    expect(find.text('✨'), findsNothing);
    expect(find.text('🍃'), findsNothing);
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
    expect(find.text('✨'), findsNothing);
    expect(find.textContaining('Level 1'), findsOneWidget);
  });

  testWidgets('슬롯이 어긋난 장착(배경 슬롯에 오라 id)은 무시된다', (tester) async {
    // background 슬롯에 오라 아이템 id를 넣으면 slot 불일치라 배경 틴트로 쓰지 않는다.
    await pumpCard(
      tester,
      const AppUser(uid: 'u', equipped: {'background': 'aura_sparkle'}),
    );

    expect(tester.takeException(), isNull);
    // 배경 슬롯에 오라를 넣었으니 오라로도 렌더되지 않는다(aura 슬롯 비어 있음).
    expect(find.text('✨'), findsNothing);
  });
}
