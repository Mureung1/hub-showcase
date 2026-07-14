import 'package:flutter/material.dart';

import '../../models/difficulty.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/reward_colors.dart';

/// 난이도 뱃지.
///
/// 🟡 **노랑 사용 허용 위젯.** 보통(Normal) 난이도의 틴트가 노랑이다.
/// "노랑 = 코인·보상 전용" 규칙의 의도적 예외이며 근거는 **난이도가 곧 보상 등급**이라는 점이다
/// (tokens.md 난이도 매핑: 쉬움 🪙3, 보통 🪙5, 어려움 🪙10).
/// 이 예외는 `test/theme/color_role_test.dart`의 allowlist에 명시돼 있다.
class DifficultyPill extends StatelessWidget {
  const DifficultyPill({super.key, required this.difficulty});

  final Difficulty difficulty;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = _colorsFor(context, difficulty);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: AppRadius.fullAll,
      ),
      child: Text(
        '• ${difficulty.label}',
        style: theme.textTheme.labelSmall?.copyWith(color: colors.foreground),
      ),
    );
  }
}

/// 난이도 → 좌측 accent 보더 색. 퀘스트 카드가 쓴다.
Color difficultyAccent(BuildContext context, Difficulty difficulty) =>
    _colorsFor(context, difficulty).accent;

class _PillColors {
  const _PillColors({
    required this.background,
    required this.foreground,
    required this.accent,
  });

  final Color background;
  final Color foreground;
  final Color accent;
}

_PillColors _colorsFor(BuildContext context, Difficulty difficulty) {
  final reward = Theme.of(context).reward;

  return switch (difficulty) {
    Difficulty.easy => _PillColors(
      background: AppColors.primaryContainer.withValues(alpha: 0.10),
      foreground: AppColors.primary,
      accent: AppColors.primaryContainer,
    ),
    Difficulty.normal => _PillColors(
      background: reward.coinGlow.withValues(alpha: 0.20),
      foreground: reward.onCoinTint,
      accent: reward.coinGlow,
    ),
    Difficulty.hard => _PillColors(
      background: AppColors.errorContainer,
      foreground: AppColors.onErrorContainer,
      accent: AppColors.error,
    ),
  };
}
