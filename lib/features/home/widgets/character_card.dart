import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/shop_items.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/reward_colors.dart';
import '../../../core/widgets/coin_pill.dart';
import '../../../models/app_user.dart';

/// 홈 캐릭터 카드 — 캐릭터 · 레벨/진화명 · XP 바 · 코인 배너.
///
/// **캐릭터는 이모지 목업이다.** 도트아트 자산이 나오기 전까지 임의 이미지를 쓰지 않고
/// 진화 단계별 이모지로 대체한다(one-step-design `screens.md`).
/// checklist 4주차도 "도트아트 자산 완성 전에는 이모지 목업 렌더도 PASS 조건"으로 인정한다.
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
    final backgroundItem = itemById(user.equipped['background']);
    final backgroundTint =
        backgroundItem != null && backgroundItem.slot == ItemSlot.background
        ? backgroundItem.tint
        : null;
    final auraItem = itemById(user.equipped['aura']);
    final auraEmoji = auraItem != null && auraItem.slot == ItemSlot.aura
        ? auraItem.emoji
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
          _CharacterStage(
            emoji: stage.emoji,
            backgroundTint: backgroundTint,
            auraEmoji: auraEmoji,
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Text(
                        'Level ${user.level} · ${stage.name}',
                        style: theme.textTheme.headlineMedium,
                      ),
                    ),
                    Text(
                      user.canRebirth
                          ? 'MAX'
                          : 'XP ${user.xp} / ${user.xpForNextLevel}',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
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

/// 캐릭터 이모지 + 하단 반원형 백드롭 + (장착 시) 오라 이모지.
///
/// 캐릭터가 이모지 목업이라 치장을 두 방식으로만 표현한다: 배경 [backgroundTint]와
/// 주변 [auraEmoji]. 둘 다 null이면(장착 없음) 기존 그린 백드롭 렌더가 그대로다.
class _CharacterStage extends StatelessWidget {
  const _CharacterStage({
    required this.emoji,
    this.backgroundTint,
    this.auraEmoji,
  });

  final String emoji;

  /// 장착된 배경 아이템의 틴트. null이면 기본 그린 백드롭.
  final Color? backgroundTint;

  /// 장착된 오라 아이템의 이모지. null이면 오라 없음.
  final String? auraEmoji;

  @override
  Widget build(BuildContext context) {
    // 배경 아이템을 장착했으면 그 색으로, 아니면 기존 그린 백드롭 유지.
    final backdropColor = (backgroundTint ?? AppColors.primaryContainer)
        .withValues(alpha: 0.18);

    return SizedBox(
      height: 180,
      width: double.infinity,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            bottom: -60,
            child: Container(
              width: 220,
              height: 120,
              decoration: BoxDecoration(
                color: backdropColor,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(110),
                ),
              ),
            ),
          ),
          // 오라 이모지 — 캐릭터 주변에 흩뿌린다(장착했을 때만).
          if (auraEmoji != null) ..._auras(auraEmoji!),
          // 도트아트 자산 완성 전까지의 플레이스홀더.
          Text(emoji, style: const TextStyle(fontSize: 88)),
        ],
      ),
    );
  }

  /// 캐릭터 주변 장식 이모지 배치. 캐릭터 본체(88pt)보다 작게 흩뿌린다.
  List<Widget> _auras(String glyph) => [
    Positioned(top: 18, left: 44, child: Text(glyph, style: const TextStyle(fontSize: 26))),
    Positioned(top: 40, right: 48, child: Text(glyph, style: const TextStyle(fontSize: 20))),
    Positioned(bottom: 30, right: 60, child: Text(glyph, style: const TextStyle(fontSize: 24))),
  ];
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
