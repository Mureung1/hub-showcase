import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../constants/reward_rules.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/reward_colors.dart';

/// 예상 보상 표시 — `🪙 +5 · XP +10`.
///
/// 🟡 노랑 사용 허용 위젯(코인 = 보상). XP는 성장이므로 그린을 쓴다.
class RewardChip extends StatelessWidget {
  const RewardChip({super.key, required this.reward});

  final Reward reward;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final coinColor = theme.reward.coin;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Symbols.monetization_on, size: 14, fill: 1, color: coinColor),
        const SizedBox(width: 2),
        Text(
          '+${reward.coin}',
          style: theme.textTheme.labelSmall?.copyWith(color: coinColor),
        ),
        AppSpacing.gapWSm,
        Icon(Symbols.star, size: 14, fill: 1, color: AppColors.primary),
        const SizedBox(width: 2),
        Text(
          'XP +${reward.xp}',
          style: theme.textTheme.labelSmall?.copyWith(color: AppColors.primary),
        ),
      ],
    );
  }
}
