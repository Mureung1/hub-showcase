import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/reward_colors.dart';

/// 코인 잔액 pill. 🟡 노랑 사용 허용 위젯(코인 = 보상).
class CoinPill extends StatelessWidget {
  const CoinPill({super.key, required this.amount, this.compact = false});

  final int amount;

  /// 헤더용 축소 버전.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reward = theme.reward;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm : AppSpacing.md,
        vertical: compact ? AppSpacing.xs : AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: reward.coinGlow.withValues(alpha: 0.22),
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Symbols.monetization_on,
            size: compact ? 16 : 20,
            fill: 1,
            color: reward.coin,
          ),
          AppSpacing.gapWXs,
          Text(
            _format(amount),
            style: (compact
                ? theme.textTheme.labelSmall
                : theme.textTheme.labelMedium)?.copyWith(color: reward.onCoin),
          ),
          if (!compact) ...[
            AppSpacing.gapWXs,
            Text(
              '코인',
              style: theme.textTheme.labelSmall?.copyWith(
                color: reward.onCoin.withValues(alpha: 0.75),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// 1,240 처럼 천 단위 구분.
String _format(int value) {
  final digits = value.abs().toString();
  final buffer = StringBuffer(value < 0 ? '-' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}
