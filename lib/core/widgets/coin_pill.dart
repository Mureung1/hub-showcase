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
      // **`Row`가 아니라 `Wrap`이다.** 고정폭 `Row`였을 때는 큰 잔액(1,234)과 큰
      // 글꼴 배율이 겹치면 pill이 부모 폭을 넘었다(E-4 D-6: 배율 2.0 · 폭 320dp의
      // 홈 코인 배너에서 20px). 폭이 모자라면 "코인" 단위를 다음 줄로 내려보낸다.
      // [RewardChip]이 코인·XP 묶음을 접는 것과 같은 처방이다.
      child: Wrap(
        // 예전 Row의 gapWXs와 같은 값 — 배율 1.0에서 생김새가 바뀌지 않는다.
        spacing: AppSpacing.xs,
        runSpacing: AppSpacing.xs,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          // 아이콘과 숫자는 **한 묶음**이다. 둘이 다른 줄로 갈라지면 "🪙"와
          // "1,234"가 남남처럼 읽힌다. 줄바꿈은 바깥 Wrap에만 맡긴다.
          Row(
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
                style:
                    (compact
                            ? theme.textTheme.labelSmall
                            : theme.textTheme.labelMedium)
                        ?.copyWith(color: reward.onCoin),
              ),
            ],
          ),
          if (!compact)
            Text(
              '코인',
              style: theme.textTheme.labelSmall?.copyWith(
                color: reward.onCoin.withValues(alpha: 0.75),
              ),
            ),
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
