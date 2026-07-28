import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/constants/empty_art.dart';
import '../../core/constants/shop_items.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/coin_pill.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/pixel_art.dart';
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
              // 정본 Content의 위 패딩 8 — 헤더와 리드 텍스트 사이 간격이다.
              AppSpacing.gapSm,
              Text(
                '모은 코인으로 배경과 오라를 꾸며 보세요.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        // 정본 Content의 요소 간 세로 간격 20(리드 텍스트 ↔ 아이템 격자).
        AppSpacing.gapBlock,
        Expanded(
          child: kShopItems.isEmpty
              // 방어적 빈 상태 — 카탈로그가 비는 일은 없지만 구조로 보장한다.
              ? const EmptyView(
                  title: '아직 판매 중인 아이템이 없어요',
                  message: '곧 새로운 아이템을 준비할게요.',
                  emoji: '🛍️',
                  asset: EmptyArt.shop,
                )
              // 2열 고정 격자. **홀수 개면 마지막 칸은 빈 칸으로 둔다** — 남은 카드를
              // 폭 두 칸으로 늘리지 않는다(정본이 그 자리에 Spacer를 둔다).
              : GridView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenH,
                    0,
                    AppSpacing.screenH,
                    AppSpacing.xl,
                  ),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    // 정본 실측 — 가로·세로 모두 12.
                    mainAxisSpacing: AppSpacing.smd,
                    crossAxisSpacing: AppSpacing.smd,
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
///
/// 정본 실측의 합이다: 카드 패딩 12×2 + 프리뷰 86 + 12 + 상품명 24 + 2 + 종류 16
/// + 12 + 가격 20 + 12 + 버튼(글자 16 + 상하 패딩 10×2).
const double _kCardExtent = 244;

/// 그 높이 중 **글꼴 배율을 타는 부분**(상품명 24 · 종류 16 · 가격/상태 20 ·
/// 버튼 글자 16). 미리보기 이미지(86)와 패딩·간격은 배율과 무관하게 고정이다.
const double _kCardTextExtent = 76;

/// 상품명 ↔ 종류 사이의 간격(정본 실측 2). 8px 리듬 밖의 값이라 토큰이 없다.
const double _kNameToSlotGap = 2;

/// 카드 액션 버튼의 상하 패딩(정본 실측 10). 8·12 어느 토큰과도 다르다.
const double _kActionPaddingV = 10;

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
      // 정본 실측 — 카드 패딩 12 · 라운드 12 · 내부 세로 간격 12.
      padding: const EdgeInsets.all(AppSpacing.smd),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.mdAll,
        border: Border.all(
          // 정본의 카드 보더는 outlineVariant 하나뿐이지만, 장착 중인 카드만은
          // 그린 테두리를 유지한다 — 격자를 훑을 때 "지금 내가 쓰고 있는 것"을
          // 버튼 문구까지 읽지 않고도 찾게 해 주는 앱 고유 표시다.
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
          AppSpacing.gapSmd,
          Text(
            item.name,
            style: theme.textTheme.titleMedium,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: _kNameToSlotGap),
          Text(
            _slotLabel(item.slot),
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.gapSmd,
          _statusLine(theme),
          const Spacer(),
          SizedBox(width: double.infinity, child: _button()),
        ],
      ),
    );
  }

  /// 가격 또는 보유 상태 한 줄.
  Widget _statusLine(ThemeData theme) {
    if (!owned) {
      // 가격 — 코인 아이콘만 노랑이고 숫자는 어두운 갈색이다(대비 확보).
      // 노랑에 닿는 유일한 통로가 [CoinPrice]라 이 파일은 노랑을 모른다.
      return Align(
        alignment: Alignment.centerLeft,
        child: CoinPrice(amount: item.price),
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
  /// 1. 처리 중 → 스피너 (모양은 그 상태의 버튼 그대로)
  /// 2. 미보유 + 충분 → 구매(🟢 그린 그라디언트)
  /// 3. 미보유 + 부족 → 비활성 "코인이 부족해요"
  /// 4. 보유 + 미장착 → 장착(🔵 블루 그라디언트 — 보조 행동)
  /// 5. 보유 + 장착 중 → 해제(아웃라인)
  ///
  /// 정본이 정의한 세 모양(구매 그린 / 장착 블루 / 장착 중 아웃라인)에 앱의 두
  /// 상태(처리 중 · 코인 부족)를 얹었다. **문구는 앱 현재 것을 그대로 둔다.**
  Widget _button() {
    if (!owned) {
      return _ActionButton(
        label: affordable ? '구매' : '코인이 부족해요',
        style: GradientButtonStyle.growth,
        // 코인이 부족하면 눌리지 않는다(문구로 이유를 말한다).
        onPressed: (affordable && !locked) ? onBuy : null,
        busy: busy,
      );
    }
    if (equipped) {
      return _ActionButton(
        label: '해제',
        onPressed: locked ? null : onUnequip,
        busy: busy,
      );
    }
    return _ActionButton(
      label: '장착',
      style: GradientButtonStyle.ai,
      onPressed: locked ? null : onEquip,
      busy: busy,
    );
  }
}

/// 아이템 슬롯의 한글 이름 — 카드 두 번째 줄("배경" / "오라").
String _slotLabel(ItemSlot slot) => switch (slot) {
  ItemSlot.background => '배경',
  ItemSlot.aura => '오라',
};

/// 상품 카드 안의 액션 버튼.
///
/// [GradientButton]을 쓰지 않는 이유: 저쪽은 화면 하단을 채우는 **주 버튼**이라
/// 높이 56 · 라운드 12 · 14/700이다. 2열 격자에 들어가는 이 버튼은 정본 실측이
/// 라운드 8 · 패딩 12/10 · 12/500으로 한 단 작다. 대신 **색은
/// [GradientButtonStyle]에서 가져와** 그린·블루 쌍의 정의를 한곳에 둔다.
///
/// [style]이 null이면 아웃라인 모양(장착 중 → 「해제」)이다. 정본의 "장착 중"
/// 상태와 같은 값(보더 1.5 · secondary)이라 `outlinedButtonTheme`과도 어긋나지 않는다.
class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.onPressed,
    this.style,
    this.busy = false,
  });

  final String label;

  /// null이면 비활성 — 눌리지 않고 흐려진다.
  final VoidCallback? onPressed;

  /// null이면 아웃라인(보조) 모양.
  final GradientButtonStyle? style;

  /// 이 카드가 시작한 요청이 아직 날아가 있는가. true면 라벨 자리에 스피너가 돈다.
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final enabled = onPressed != null && !busy;
    final foreground = style?.foreground ?? scheme.secondary;

    return Opacity(
      // 비활성 표현은 [GradientButton]과 같은 규칙이다 — 변형마다 비활성 팔레트를
      // 따로 만들지 않고 같은 색을 흐리게 둔다.
      opacity: enabled ? 1 : 0.4,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: style == null
              ? null
              : LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [style!.from, style!.to],
                ),
          border: style == null
              ? Border.all(color: scheme.secondary, width: 1.5)
              : null,
          borderRadius: AppRadius.smAll,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: enabled ? onPressed : null,
            borderRadius: AppRadius.smAll,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.smd,
                vertical: _kActionPaddingV,
              ),
              child: Center(
                child: busy
                    ? SizedBox(
                        width: _kSpinnerSize,
                        height: _kSpinnerSize,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: foreground,
                        ),
                      )
                    : Text(
                        label,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: foreground,
                        ),
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 진행 스피너 지름 — 라벨 한 줄(12/16)과 같은 높이.
const double _kSpinnerSize = 16;

/// 아이템 미리보기 — 배경은 풍경 도트아트, 오라는 스프라이트.
///
/// 카드 그리드의 높이 계산(`_cardExtent`)이 이 86px(정본 실측)에 걸려 있어 **고정
/// 높이를 유지한다.** 자산을 못 읽으면 배경은 원래의 색 스와치로, 오라는 이모지로
/// 떨어진다.
class _Preview extends StatelessWidget {
  const _Preview({required this.item, required this.equipped});

  final ShopItem item;
  final bool equipped;

  /// 정본 실측 프리뷰 높이.
  static const double _height = 86;

  /// 자산을 못 읽었을 때 뜨는 폴백 이모지 크기(정본 실측 44).
  static const double _emojiSize = 44;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isBackground = item.slot == ItemSlot.background;

    return Stack(
      children: [
        Container(
          height: _height,
          width: double.infinity,
          decoration: BoxDecoration(
            // 정본 프리뷰 폴백 배경은 surfaceContainerLow(`#eff4ff`)다. 배경 상품만
            // 예외로 스와치 틴트를 깔아 둔다 — 자산이 그 위를 완전히 덮으므로
            // 평소 모습은 같고, **로드 실패 시에만** 예전 색 미리보기로 떨어진다.
            color: isBackground
                ? (item.tint ?? theme.colorScheme.surfaceContainerLow)
                      .withValues(alpha: 0.85)
                : theme.colorScheme.surfaceContainerLow,
            // 정본 실측 — 프리뷰 라운드 8(카드 12보다 한 단 작다).
            borderRadius: AppRadius.smAll,
          ),
          clipBehavior: Clip.antiAlias,
          alignment: Alignment.center,
          child: isBackground
              // 배경은 스와치 색 위에 풍경을 덮는다. 로드 실패 시 그 색이 그대로
              // 남아 예전 미리보기가 된다(별도 폴백 위젯이 필요 없다).
              //
              // filterQuality가 기본(none)이 아닌 이유: 1024×512 원본을 2열 그리드
              // 카드 폭(약 140dp)에 담으므로 **약 0.14배 축소**다. 빈 화면 일러스트
              // (0.19배)보다 더 줄어드는데 최근접 보간을 쓰면 픽셀 행·열이 통째로
              // 버려져 풍경이 지저분해진다 — `pixel_art.dart`의 "크게 축소하는
              // 자산만 예외로 올린다" 규칙을 그대로 따른다.
              ? PixelArt(
                  asset: shopItemAsset(item),
                  fallback: const SizedBox.shrink(),
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: _height,
                  filterQuality: FilterQuality.medium,
                  semanticLabel: item.name,
                )
              : PixelArt.emoji(
                  asset: shopItemAsset(item),
                  emoji: item.emoji ?? '',
                  size: _emojiSize,
                  semanticLabel: item.name,
                ),
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
    // 자리표시자도 실제 격자와 같은 치수를 쓴다 — 로딩에서 데이터로 넘어갈 때
    // 카드가 크기를 바꾸며 튀지 않게.
    return ListView(
      padding: AppSpacing.screenPadding,
      children: const [
        SkeletonBox(width: 120, height: 40),
        AppSpacing.gapLg,
        Row(
          children: [
            Expanded(
              child: SkeletonBox(height: _kCardExtent, radius: AppRadius.md),
            ),
            AppSpacing.gapWSmd,
            Expanded(
              child: SkeletonBox(height: _kCardExtent, radius: AppRadius.md),
            ),
          ],
        ),
      ],
    );
  }
}
