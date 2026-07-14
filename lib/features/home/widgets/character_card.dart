import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
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
          _CharacterStage(emoji: stage.emoji),
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
                _CoinBanner(coin: user.coin),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 캐릭터 이모지 + 하단 반원형 그린 백드롭.
class _CharacterStage extends StatelessWidget {
  const _CharacterStage({required this.emoji});

  final String emoji;

  @override
  Widget build(BuildContext context) {
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
                color: AppColors.primaryContainer.withValues(alpha: 0.18),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(110),
                ),
              ),
            ),
          ),
          // 도트아트 자산 완성 전까지의 플레이스홀더.
          Text(emoji, style: const TextStyle(fontSize: 88)),
        ],
      ),
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

class _CoinBanner extends StatelessWidget {
  const _CoinBanner({required this.coin});

  final int coin;

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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [CoinPill(amount: coin)],
      ),
    );
  }
}
