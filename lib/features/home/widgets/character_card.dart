import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/growth_rules.dart';
import '../../../core/constants/shop_items.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/reward_colors.dart';
import '../../../core/widgets/coin_pill.dart';
import '../../../core/widgets/pixel_art.dart';
import '../../../models/app_user.dart';

/// 홈 캐릭터 카드 — 캐릭터 · 레벨/진화명 · XP 바 · 코인 배너.
///
/// 캐릭터는 진화 단계별 **도트아트 자산**으로 그리고, 자산을 못 읽으면 단계 이모지로
/// 떨어진다(checklist: "자산 로드 실패 시 대체 표시(이모지)가 나온다").
///
/// 🟡 노랑 사용 허용 위젯(코인 배너).
class CharacterCard extends StatelessWidget {
  const CharacterCard({super.key, required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stage = user.stage;

    // 장착 아이템을 해석한다. 고아 방어: itemById가 null이거나 슬롯이 어긋나면
    // (과거 데이터·삭제된 아이템·손상된 문서) 그 슬롯은 장착 없음으로 떨어져
    // 기존 렌더가 그대로 유지된다 — 깨진 장착이 카드를 죽이지 않는다.
    final rawBackground = itemById(user.equipped['background']);
    final background =
        rawBackground != null && rawBackground.slot == ItemSlot.background
        ? rawBackground
        : null;
    final rawAura = itemById(user.equipped['aura']);
    final aura = rawAura != null && rawAura.slot == ItemSlot.aura
        ? rawAura
        : null;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: AppColors.softShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          _CharacterStage(stage: stage, background: background, aura: aura),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 환생 표식 — "손해가 아닌 훈장". 환생한 적이 있을 때만 뜬다.
                // 🟡 노랑은 코인·보상·스트릭 전용이라 여기 쓰지 않는다(그린 틴트).
                if (user.rebirth > 0) ...[
                  _RebirthBadge(rebirth: user.rebirth),
                  AppSpacing.gapSm,
                ],
                // 레벨(왼쪽)과 XP 수치(오른쪽). **둘 다 Flexible이다.**
                //
                // 예전엔 XP 쪽이 유연 위젯이 아니어서 고유 폭을 통째로 요구했고,
                // 큰 값(Lv.12 · 네 자리 XP)에 큰 글꼴 배율이 겹치면 왼쪽에 줄
                // 자리가 남지 않아 넘쳤다(E-4 D-6: 배율 2.0 · 폭 320dp).
                // loose fit이라 폭이 넉넉하면 둘 다 고유 폭을 쓰고 spaceBetween이
                // 평소 모습을 유지한다.
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        'Level ${user.level} · ${stage.name}',
                        style: theme.textTheme.headlineMedium,
                      ),
                    ),
                    Flexible(
                      child: Text(
                        user.canRebirth
                            ? 'MAX'
                            : 'XP ${user.xp} / ${user.xpForNextLevel}',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        // 접혔을 때도 오른쪽 정렬을 유지한다.
                        textAlign: TextAlign.end,
                      ),
                    ),
                  ],
                ),
                AppSpacing.gapSm,
                _XpBar(progress: user.levelProgress),
                AppSpacing.gapMd,
                _CoinBanner(coin: user.coin, streak: user.streak),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 환생 표식 — ★ N · {등급}. 환생 횟수와 등급 타이틀을 함께 보여 준다.
///
/// 🟡 노랑 금지 위젯이다. 표식은 코인·보상이 아니라 **성장의 훈장**이라 그린 계열
/// (`primaryContainer`) 틴트를 쓴다.
class _RebirthBadge extends StatelessWidget {
  const _RebirthBadge({required this.rebirth});

  final int rebirth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Symbols.star,
            fill: 1,
            size: 16,
            color: scheme.onPrimaryContainer,
          ),
          AppSpacing.gapWXs,
          Text(
            '환생 $rebirth · ${rebirthTitle(rebirth)}',
            style: theme.textTheme.labelMedium?.copyWith(
              color: scheme.onPrimaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}

/// 캐릭터 도트아트 + 라운드 사각형 풍경 백드롭 + (장착 시) 오라 스프라이트.
///
/// 치장은 두 슬롯으로 표현한다: [background](백드롭 채움)와 [aura](주변 장식).
/// 둘 다 슬롯 검증을 마친 값이라 여기서는 null 여부만 본다 — null이면 미장착이다.
///
/// **백드롭은 장착 여부와 무관하게 같은 모양(라운드 사각형)이고 채움만 갈린다.**
/// 장착이면 풍경 도트아트, 미장착이면 지금까지 쓰던 그린 틴트다. 미장착을 공짜
/// 풍경으로 채우면 `bg_forest`(10코인)를 그냥 주는 셈이라 상점이 무의미해진다.
/// 모양을 공유하는 덕에 장착·해제로 레이아웃이 흔들리지 않는다.
class _CharacterStage extends StatelessWidget {
  const _CharacterStage({required this.stage, this.background, this.aura});

  final CharacterStage stage;

  /// 장착된 배경 아이템(슬롯 검증 완료). null이면 미장착 → 틴트 채움.
  final ShopItem? background;

  /// 장착된 오라 아이템(슬롯 검증 완료). null이면 오라 없음.
  final ShopItem? aura;

  /// 스테이지 높이. 카드 상단 히어로 영역의 고정 높이라 자산 도입 전후로 같다
  /// (`text_scale_layout_test`가 이 높이에서 오버플로 없음을 확인한다).
  static const double _height = 180;

  /// 캐릭터 드로잉 **박스**의 한 변. 정사각 박스라 레이아웃 높이는 원본 종횡비와
  /// 무관하게 항상 이 값이고, 그림은 그 안에서 contain으로 맞춰진다.
  ///
  /// 박스 크기와 실제로 칠해지는 크기는 다르다. 자산의 투명 여백을 사방 8px만
  /// 남기고 잘라낸 덕에 지금은 104 박스 안에서 캐릭터가 **82~98dp**를 차지한다.
  /// 자르기 전에는 같은 104 박스에서 26~95dp로 들쭉날쭉했고, 특히 알 단계가
  /// 33dp까지 쪼그라들어 "캐릭터가 너무 작다"는 문제의 원인이었다.
  static const double _characterSize = 104;

  /// 캐릭터 발밑을 스테이지(=백드롭) 바닥에서 얼마나 띄울지.
  ///
  /// 배경 도트아트는 2:1(1024×512)에 **지평선이 70% 지점**이다. 폭 375dp 화면에서
  /// 백드롭은 **309×164**(실측)이라 지평선은 바닥에서 164 × 30% ≈ **49dp**다.
  /// 발밑을 그보다 아래(24dp)에 두면 캐릭터가 하늘에 뜨지 않고 잔디를 밟는다.
  ///
  /// 이 24dp는 눈대중이 아니라 계약이다 — `character_stage_layout_test`가
  /// 실제 렌더 좌표로 못 박는다. 중앙 정렬로 되돌리면 38dp가 되어 그 테스트가 깨진다.
  static const double _groundInset = AppSpacing.lg;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _height,
      width: double.infinity,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // 백드롭. 좌우/상단만 띄우고 **바닥은 카드에 붙여**(아래 fill에 bottom을
          // 넘기지 않으므로 0이다) 캐릭터가 설 땅을 만든다.
          //
          // 폭 375dp 기준 실측 **309×164 = 1.884:1**. 원본 2:1보다 세로가 긴 박스라
          // cover는 **세로를 제한 축으로 잡아** 높이를 맞추고 남는 가로를 자른다 —
          // 세로 크롭 0, 가로 크롭 약 6%. 지평선이 위아래로 전혀 밀리지 않으므로
          // 70% 지점이라는 전제가 그대로 성립한다.
          //
          // (예전 주석의 303×148 ≈ 2.05:1은 오산이었다. 148은 상·하 양쪽에서 16을
          //  뺀 값인데, 실제로는 bottom을 주지 않아 위쪽 16만 빠진다.)
          Positioned.fill(
            left: AppSpacing.md,
            right: AppSpacing.md,
            top: AppSpacing.md,
            child: ClipRRect(
              borderRadius: AppRadius.mdAll,
              child: _Backdrop(item: background),
            ),
          ),
          // 오라 — 캐릭터 주변에 흩뿌린다(장착했을 때만).
          if (aura != null) ..._auras(aura!),
          // 캐릭터는 가운데가 아니라 **바닥 기준**으로 세운다. 원본이 하단 정렬
          // 그림이라 발밑이 그림의 아래 끝이고, 그 끝을 지평선 아래로 내려야
          // 잔디를 밟은 것처럼 보인다.
          Positioned(
            bottom: _groundInset,
            child: PixelArt.emoji(
              asset: stage.asset,
              emoji: stage.emoji,
              size: _characterSize,
              semanticLabel: stage.name,
            ),
          ),
        ],
      ),
    );
  }

  /// 캐릭터 주변 장식 배치. 좌표와 크기(26/20/24)는 이모지 목업 때 그대로다 —
  /// 자산 교체가 배치까지 바꾸면 회귀 원인이 섞인다.
  ///
  /// 장식이라 `semanticLabel`을 주지 않는다(같은 라벨 3연속 낭독 방지).
  List<Widget> _auras(ShopItem item) {
    final asset = shopItemAsset(item);
    final emoji = item.emoji ?? '';
    Widget sprite(double size) =>
        PixelArt.emoji(asset: asset, emoji: emoji, size: size);

    return [
      Positioned(top: 18, left: 44, child: sprite(26)),
      Positioned(top: 40, right: 48, child: sprite(20)),
      Positioned(bottom: 30, right: 60, child: sprite(24)),
    ];
  }
}

/// 백드롭 채움 — 장착이면 풍경 도트아트, 아니면 틴트.
///
/// 자산 로드에 실패해도 **이모지가 아니라 틴트로** 떨어진다. 풍경 자리에 이모지가
/// 뜨면 카드가 더 망가져 보이고, 틴트는 미장착 렌더와 같아 자연스럽다.
class _Backdrop extends StatelessWidget {
  const _Backdrop({this.item});

  final ShopItem? item;

  @override
  Widget build(BuildContext context) {
    // 부모가 tight 제약을 주므로 자식은 그 영역을 그대로 채운다.
    final tint = ColoredBox(
      color: (item?.tint ?? AppColors.primaryContainer).withValues(alpha: 0.18),
    );
    final equipped = item;
    if (equipped == null) return tint;

    return PixelArt(
      asset: shopItemAsset(equipped),
      fallback: tint,
      fit: BoxFit.cover,
      semanticLabel: equipped.name,
    );
  }
}

class _XpBar extends StatelessWidget {
  const _XpBar({required this.progress});

  final double progress;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: AppRadius.fullAll,
      child: LinearProgressIndicator(
        value: progress,
        minHeight: 12,
        backgroundColor: AppColors.primaryContainer.withValues(alpha: 0.15),
        valueColor: const AlwaysStoppedAnimation(AppColors.primary),
      ),
    );
  }
}

/// 코인 잔액 + 연속 출석 일수.
///
/// 스트릭을 여기 둔 이유는 두 가지다. ① 디자인 규칙상 **노랑은 코인·보상·스트릭
/// 전용**인데, 이 위젯이 노랑 사용이 허용된 곳이다(`color_role_test`의 allowlist).
/// ② 스트릭은 보상 경제의 일부다 — 7일마다 코인·XP가 나오므로 코인 옆이 제자리다.
///
/// `Row`가 아니라 `Wrap`인 이유: 접근성 글꼴을 키운 사용자의 좁은 화면에서
/// 두 항목이 한 줄에 안 들어가면 줄바꿈된다(오버플로 줄무늬 대신).
class _CoinBanner extends StatelessWidget {
  const _CoinBanner({required this.coin, required this.streak});

  final int coin;

  /// 연속 출석 일수. 0이면 아직 기록이 없으므로 표시하지 않는다.
  final int streak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainer,
        borderRadius: AppRadius.fullAll,
      ),
      child: Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: AppSpacing.md,
        runSpacing: AppSpacing.xs,
        children: [
          CoinPill(amount: coin),
          if (streak > 0) _StreakPill(streak: streak),
        ],
      ),
    );
  }
}

/// 🔥 N일 연속 — 출석 스트릭. 노랑(코인·보상·스트릭 전용) 사용 지점이다.
class _StreakPill extends StatelessWidget {
  const _StreakPill({required this.streak});

  final int streak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reward = theme.reward;

    // 배경 틴트·글자색을 [CoinPill]과 똑같이 맞춘다. 나란히 놓이는 형제 위젯이라
    // 한쪽만 다른 대비 규칙을 쓰면 다크 테마에서 한쪽만 안 읽히게 된다.
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: reward.coinGlow.withValues(alpha: 0.22),
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Symbols.local_fire_department,
            size: 20,
            fill: 1,
            color: reward.coin,
          ),
          AppSpacing.gapWXs,
          Text(
            '$streak일 연속',
            style: theme.textTheme.labelMedium?.copyWith(color: reward.onCoin),
          ),
        ],
      ),
    );
  }
}
