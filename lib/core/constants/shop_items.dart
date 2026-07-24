import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// 치장 아이템 슬롯. 슬롯당 1개 장착, 서로 독립이다.
///
/// 캐릭터가 이모지 목업이라 치장을 두 방식으로만 표현한다:
/// - [background] : 캐릭터 스테이지 배경 틴트 색
/// - [aura]       : 캐릭터 주변에 흩뿌리는 장식 이모지
enum ItemSlot { background, aura }

/// 상점 아이템 — **코드 상수 카탈로그.**
///
/// `reward_rules`·`growth_rules`와 같은 관례로 Firestore `items` 컬렉션이 아니라
/// 코드에 둔다(2026-07-23 사용자 결정). 운영 중 변경이 필요 없는 MVP라 콘솔 수동
/// 입력·테스트 사각지대를 피한다. 장착 해석은 [itemById]가 전담한다.
///
/// 색 규칙: [tint]는 **[AppColors] 참조로만** 온다(HEX 하드코딩 금지, **노랑 금지** —
/// 노랑은 코인·보상 전용이라 `color_role_test`가 막는다).
class ShopItem {
  const ShopItem({
    required this.id,
    required this.slot,
    required this.name,
    required this.price,
    this.tint,
    this.emoji,
  });

  final String id;
  final ItemSlot slot;
  final String name;

  /// 코인 가격.
  final int price;

  /// [ItemSlot.background] 전용 — 스테이지 배경 틴트 색. 그 외 슬롯은 null.
  final Color? tint;

  /// [ItemSlot.aura] 전용 — 캐릭터 주변 장식 이모지. 그 외 슬롯은 null.
  final String? emoji;
}

/// 상점 카탈로그. 배경 3 + 오라 2 = 5종.
///
/// 가격은 프로토타입 값 근처(배경 10/30/50 · 오라 40/60). 배경 틴트는 노랑을 피해
/// 그린·블루 계열 [AppColors]에서 고른다.
const List<ShopItem> kShopItems = [
  ShopItem(
    id: 'bg_forest',
    slot: ItemSlot.background,
    name: '초록 숲',
    price: 10,
    tint: AppColors.primaryContainer,
  ),
  ShopItem(
    id: 'bg_ocean',
    slot: ItemSlot.background,
    name: '푸른 바다',
    price: 30,
    tint: AppColors.secondaryContainer,
  ),
  ShopItem(
    id: 'bg_night',
    slot: ItemSlot.background,
    name: '깊은 밤',
    price: 50,
    tint: AppColors.secondary,
  ),
  ShopItem(
    id: 'aura_sparkle',
    slot: ItemSlot.aura,
    name: '반짝임',
    price: 40,
    emoji: '✨',
  ),
  ShopItem(
    id: 'aura_leaf',
    slot: ItemSlot.aura,
    name: '산들바람',
    price: 60,
    emoji: '🍃',
  ),
];

/// ID로 아이템을 찾는다. 없으면 null.
///
/// **고아 방어의 단일 정의처다.** 장착된 `itemId`가 카탈로그에 없으면(과거 데이터·
/// 오타·삭제된 아이템) null을 돌려주고, 화면은 그 슬롯을 "장착 없음"으로 렌더한다 —
/// 깨진 장착이 캐릭터 카드를 죽이지 않게 한다. null 입력(장착 안 함)도 null로 통과한다.
ShopItem? itemById(String? id) {
  if (id == null) return null;
  for (final item in kShopItems) {
    if (item.id == id) return item;
  }
  return null;
}

/// 특정 슬롯의 아이템만 (상점 화면 섹션 구성용).
List<ShopItem> itemsForSlot(ItemSlot slot) =>
    kShopItems.where((item) => item.slot == slot).toList();
