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

/// 난이도 색으로 **꽉 채운 면**의 배경·전경 쌍.
class DifficultyFill {
  const DifficultyFill({required this.background, required this.foreground});

  /// 면을 채우는 난이도 색. [difficultyAccent]와 같은 값이다.
  final Color background;

  /// 그 위에 얹는 글자 색. **대비를 계산해 칸마다 따로 골랐다**(아래 참고).
  final Color foreground;
}

/// 난이도 세그먼트의 **선택된 칸**이 쓰는 색 쌍 (사용자 결정 2026-07-29 —
/// "선택 칸을 해당 난이도 색으로 꽉 채운다").
///
/// 배경은 [difficultyAccent]와 **같은 색**이고, 전경만 따로 고른다. 요청은 "글자는
/// 흰색"이었지만 실제 accent 값에 흰 글자를 얹으면 두 칸이 WCAG AA(4.5:1)에
/// 못 미친다(라이트 기준 실측):
///
/// | 난이도 | 배경 | 흰 글자 대비 | 채택한 전경 | 대비 |
/// |--------|------|--------------|-------------|------|
/// | 쉬움 | `#22C55E` | **2.28:1** ✗ | `onPrimaryContainer` `#00391A` | 5.8:1 ✓ |
/// | 보통 | `#FFB95F` | **1.70:1** ✗ | `onCoin` `#5C3800` | 6.1:1 ✓ |
/// | 어려움 | `#BA1A1A` | 6.54:1 ✓ | `onError` 흰색 | 6.5:1 ✓ |
///
/// 그래서 **쉬움·보통 두 칸만 어두운 글자**로 두고 어려움은 요청대로 흰 글자다.
/// 선택 여부는 "칠해졌는가"로 이미 읽히므로 글자색이 갈려도 신호는 흐려지지 않는다.
/// (전경을 밝히려고 배경을 더 어둡게 바꾸지는 않았다 — 그러면 세그먼트의 노랑·그린이
/// [DifficultyPill]·퀘스트 카드 accent와 달라져 "난이도 색"이 두 벌이 된다.)
DifficultyFill difficultyFill(BuildContext context, Difficulty difficulty) {
  final colors = _colorsFor(context, difficulty);

  return DifficultyFill(
    background: colors.accent,
    foreground: switch (difficulty) {
      Difficulty.easy => AppColors.onPrimaryContainer,
      Difficulty.normal => Theme.of(context).reward.onCoin,
      Difficulty.hard => AppColors.onError,
    },
  );
}

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
