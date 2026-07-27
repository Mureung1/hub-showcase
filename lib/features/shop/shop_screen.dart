import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/constants/shop_items.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/coin_pill.dart';
import '../../core/widgets/state_views.dart';
import '../../models/app_user.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';

/// 상점 — 코인으로 배경·오라 아이템을 사고 장착한다.
///
/// 보상 루프의 마지막 고리다: 완료 → 코인 → **상점에서 소비** → 캐릭터 치장.
/// 아이템 목록은 코드 상수([kShopItems])이고, 구매는 저장소 트랜잭션이 원자적으로
/// 처리한다(코인 차감 + inventory 문서 생성이 한 트랜잭션). one-step-design
/// `screens.md` "상점 (아이템 카드)" 스펙을 따른다.
class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key});

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen>
    with TabScrollRegistration {
  @override
  int get tabIndex => 2;

  /// 지금 처리 중인 아이템 ID. **중복 실행 방지의 핵심.**
  ///
  /// null이 아니면 구매·장착 요청이 진행 중이라, 다른 버튼도 눌러도 무시한다
  /// (구매가 두 번 나가거나 장착이 뒤엉키지 않게). 해당 카드는 스피너를 보여 준다.
  String? _busyItemId;

  void _snack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  /// 구매·장착 요청을 감싸 중복 실행·오류·로딩을 한곳에서 처리한다.
  Future<void> _run(
    String itemId,
    Future<void> Function() action, {
    required String success,
  }) async {
    if (_busyItemId != null) return; // 이미 처리 중 — 무시.
    setState(() => _busyItemId = itemId);
    try {
      await action();
      if (!mounted) return;
      _snack(success);
    } on AppFailure catch (e) {
      if (!mounted) return;
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      _snack('문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => _busyItemId = null);
    }
  }

  void _purchase(AppUser user, ShopItem item) {
    _run(
      item.id,
      () => ref
          .read(userRepositoryProvider)
          .purchaseItem(user.uid, item.id, item.price),
      success: '${item.name} 을(를) 샀어요.',
    );
  }

  void _equip(AppUser user, ShopItem item) {
    final next = {...user.equipped, item.slot.name: item.id};
    _run(
      item.id,
      () => ref.read(userRepositoryProvider).updateEquipped(user.uid, next),
      success: '${item.name} 을(를) 장착했어요.',
    );
  }

  void _unequip(AppUser user, ShopItem item) {
    final next = {...user.equipped}..remove(item.slot.name);
    _run(
      item.id,
      () => ref.read(userRepositoryProvider).updateEquipped(user.uid, next),
      success: '${item.name} 을(를) 벗었어요.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);
    final inventoryAsync = ref.watch(inventoryProvider);

    return Scaffold(
      body: SafeArea(
        child: userAsync.when(
          loading: () => const _ShopSkeleton(),
          error: (error, _) => _error(error),
          // 사용자·보유 두 스트림이 모두 준비돼야 버튼 상태를 정할 수 있다.
          data: (user) => inventoryAsync.when(
            loading: () => const _ShopSkeleton(),
            error: (error, _) => _error(error),
            data: (inventory) => _content(user, inventory),
          ),
        ),
      ),
    );
  }

  Widget _error(Object error) => ErrorView(
    message: error is AppFailure ? error.message : '상점을 불러오지 못했어요.',
    onRetry: () => ref.invalidate(sessionProvider),
  );

  Widget _content(AppUser user, Set<String> inventory) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenH,
            AppSpacing.md,
            AppSpacing.screenH,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text('상점', style: theme.textTheme.headlineLarge),
                  ),
                  // 코인 잔액 — 노랑 허용 위젯(CoinPill).
                  CoinPill(amount: user.coin),
                ],
              ),
              AppSpacing.gapXs,
              Text(
                '모은 코인으로 배경과 오라를 꾸며 보세요.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        AppSpacing.gapMd,
        Expanded(
          child: kShopItems.isEmpty
              // 방어적 빈 상태 — 카탈로그가 비는 일은 없지만 구조로 보장한다.
              ? const EmptyView(
                  title: '아직 판매 중인 아이템이 없어요',
                  message: '곧 새로운 아이템을 준비할게요.',
                  emoji: '🛍️',
                )
              : GridView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenH,
                    AppSpacing.sm,
                    AppSpacing.screenH,
                    AppSpacing.xl,
                  ),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: AppSpacing.md,
                    crossAxisSpacing: AppSpacing.md,
                    mainAxisExtent: _cardExtent(context),
                  ),
                  itemCount: kShopItems.length,
                  itemBuilder: (context, index) {
                    final item = kShopItems[index];
                    return _ShopItemCard(
                      item: item,
                      owned: inventory.contains(item.id),
                      equipped: user.equipped[item.slot.name] == item.id,
                      affordable: user.coin >= item.price,
                      busy: _busyItemId == item.id,
                      // 다른 카드가 처리 중이면 이 카드도 잠근다(중복 실행 방지).
                      locked: _busyItemId != null,
                      onBuy: () => _purchase(user, item),
                      onEquip: () => _equip(user, item),
                      onUnequip: () => _unequip(user, item),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

/// 기본 배율(1.0)에서의 상품 카드 높이. 그리드 셀은 고정 높이라 카드가 이 안에
/// 들어가야 한다.
const double _kCardExtent = 236;

/// 그 높이 중 **글꼴 배율을 타는 부분**(상품명 · 상태 줄 · 버튼 글자).
/// 미리보기 이미지(72)와 패딩·간격은 배율과 무관하게 고정이다.
const double _kCardTextExtent = 60;

/// 상품 카드 한 칸의 높이.
///
/// 예전엔 236 고정이었다. 그래서 글꼴 배율을 키우면 **카드 안 내용만 커지고 칸은
/// 그대로**라 아래쪽이 잘렸다 — 하필 잘리는 자리가 구매 버튼이라 상점을 쓸 수 없게
/// 된다(E-4 D-5: 배율 1.6에서 6px, 2.0에서 22px). `Flexible`로 풀 수 있는 가로
/// 문제가 아니라 **세로 여유가 없는 문제**라, 배율만큼 칸을 늘려 준다.
///
/// 고정분과 글자분을 나눠 글자분에만 배율을 곱하므로 배율 1.0에서는 [_kCardExtent]
/// 그대로다(평소 모습이 바뀌지 않는다). 배율을 1보다 작게 줄인 사용자에게는 칸을
/// 줄이지 않는다 — 줄여서 얻을 것이 없고 잘릴 위험만 생긴다.
double _cardExtent(BuildContext context) {
  final scaled = MediaQuery.textScalerOf(context).scale(_kCardTextExtent);
  return math.max(_kCardExtent, _kCardExtent - _kCardTextExtent + scaled);
}

/// 아이템 카드 하나. 5상태 버튼 분기를 담는다.
class _ShopItemCard extends StatelessWidget {
  const _ShopItemCard({
    required this.item,
    required this.owned,
    required this.equipped,
    required this.affordable,
    required this.busy,
    required this.locked,
    required this.onBuy,
    required this.onEquip,
    required this.onUnequip,
  });

  final ShopItem item;
  final bool owned;
  final bool equipped;
  final bool affordable;
  final bool busy;
  final bool locked;
  final VoidCallback onBuy;
  final VoidCallback onEquip;
  final VoidCallback onUnequip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.lgAll,
        border: Border.all(
          color: equipped
              ? AppColors.primary
              : theme.colorScheme.outlineVariant,
        ),
        boxShadow: AppColors.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Preview(item: item, equipped: equipped),
          AppSpacing.gapSm,
          Text(
            item.name,
            style: theme.textTheme.titleMedium,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          AppSpacing.gapXs,
          _statusLine(theme),
          const Spacer(),
          SizedBox(width: double.infinity, child: _button(theme)),
        ],
      ),
    );
  }

  /// 가격 또는 보유 상태 한 줄.
  Widget _statusLine(ThemeData theme) {
    if (!owned) {
      // 가격 — 노랑 코인(CoinPill).
      return Align(
        alignment: Alignment.centerLeft,
        child: CoinPill(amount: item.price, compact: true),
      );
    }
    final label = equipped ? '장착 중' : '보유 중';
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          equipped ? Symbols.check_circle : Symbols.inventory_2,
          size: 16,
          fill: 1,
          color: equipped
              ? AppColors.primary
              : theme.colorScheme.onSurfaceVariant,
        ),
        AppSpacing.gapWXs,
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: equipped
                ? AppColors.primary
                : theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  /// 5상태 버튼:
  /// 1. 처리 중 → 스피너
  /// 2. 미보유 + 충분 → 구매(그린)
  /// 3. 미보유 + 부족 → 비활성 "코인이 부족해요"
  /// 4. 보유 + 미장착 → 장착
  /// 5. 보유 + 장착 중 → 해제
  Widget _button(ThemeData theme) {
    if (busy) {
      return const FilledButton(
        onPressed: null,
        child: SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    if (!owned) {
      if (!affordable) {
        return const FilledButton(
          onPressed: null,
          child: Text('코인이 부족해요'),
        );
      }
      return FilledButton(
        onPressed: locked ? null : onBuy,
        child: const Text('구매'),
      );
    }
    if (equipped) {
      return OutlinedButton(
        onPressed: locked ? null : onUnequip,
        child: const Text('해제'),
      );
    }
    return FilledButton(
      onPressed: locked ? null : onEquip,
      child: const Text('장착'),
    );
  }
}

/// 아이템 미리보기 — 배경은 색 스와치, 오라는 이모지.
class _Preview extends StatelessWidget {
  const _Preview({required this.item, required this.equipped});

  final ShopItem item;
  final bool equipped;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isBackground = item.slot == ItemSlot.background;

    return Stack(
      children: [
        Container(
          height: 72,
          width: double.infinity,
          decoration: BoxDecoration(
            color: isBackground
                ? (item.tint ?? theme.colorScheme.surfaceContainerHigh)
                      .withValues(alpha: 0.85)
                : theme.colorScheme.surfaceContainerHigh,
            borderRadius: AppRadius.mdAll,
          ),
          alignment: Alignment.center,
          child: isBackground
              ? null
              : Text(item.emoji ?? '', style: const TextStyle(fontSize: 34)),
        ),
        if (equipped)
          Positioned(
            top: AppSpacing.xs,
            right: AppSpacing.xs,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Symbols.check,
                size: 14,
                fill: 1,
                color: AppColors.onPrimary,
              ),
            ),
          ),
      ],
    );
  }
}

class _ShopSkeleton extends StatelessWidget {
  const _ShopSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: AppSpacing.screenPadding,
      children: const [
        SkeletonBox(width: 120, height: 40),
        AppSpacing.gapLg,
        Row(
          children: [
            Expanded(child: SkeletonBox(height: 220, radius: AppRadius.lg)),
            AppSpacing.gapWMd,
            Expanded(child: SkeletonBox(height: 220, radius: AppRadius.lg)),
          ],
        ),
      ],
    );
  }
}
