import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/shop_items.dart';

/// 상점 카탈로그(순수 상수 + 조회)의 계약.
///
/// 장착 해석의 단일 정의처가 [itemById]다 — 고아 방어(없는 id → null)가 여기서
/// 깨지면 캐릭터 카드가 깨진 장착으로 죽을 수 있다.
void main() {
  group('itemById', () {
    test('존재하는 id는 그 아이템을 준다', () {
      final item = itemById('bg_forest');
      expect(item, isNotNull);
      expect(item!.id, 'bg_forest');
      expect(item.slot, ItemSlot.background);
    });

    test('없는 id는 null (고아 방어)', () {
      expect(itemById('does_not_exist'), isNull);
    });

    test('null 입력(장착 안 함)도 null로 통과', () {
      expect(itemById(null), isNull);
    });

    test('카탈로그의 모든 아이템을 id로 되찾을 수 있다', () {
      for (final item in kShopItems) {
        expect(itemById(item.id), same(item));
      }
    });
  });

  group('카탈로그 구성', () {
    test('배경 3 + 오라 2 = 5종', () {
      expect(kShopItems, hasLength(5));
      expect(itemsForSlot(ItemSlot.background), hasLength(3));
      expect(itemsForSlot(ItemSlot.aura), hasLength(2));
    });

    test('id는 서로 겹치지 않는다', () {
      final ids = kShopItems.map((e) => e.id).toSet();
      expect(ids, hasLength(kShopItems.length));
    });

    test('배경 아이템은 tint를 갖고 emoji가 없다', () {
      for (final item in itemsForSlot(ItemSlot.background)) {
        expect(item.tint, isNotNull, reason: '${item.id} 는 배경 틴트가 있어야 한다');
        expect(item.emoji, isNull);
      }
    });

    test('오라 아이템은 emoji를 갖고 tint가 없다', () {
      for (final item in itemsForSlot(ItemSlot.aura)) {
        expect(item.emoji, isNotNull, reason: '${item.id} 는 오라 이모지가 있어야 한다');
        expect(item.tint, isNull);
      }
    });

    test('가격은 모두 양수다', () {
      for (final item in kShopItems) {
        expect(item.price, greaterThan(0));
      }
    });
  });
}
