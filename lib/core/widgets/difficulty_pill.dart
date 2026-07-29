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
///
/// 라이트·다크 색 한 벌은 [_colorsFor]가 정한다. 다크에서는 pill이 채운 면이 되어
/// 세그먼트 선택 칸([difficultyFill])과 같은 모습이 된다 — 둘 다 "난이도 색으로
/// 칠한 면"이라 어긋날 이유가 없다.
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

/// 난이도 색으로 **꽉 채운 면**의 배경·전경 쌍.
class DifficultyFill {
  const DifficultyFill({required this.background, required this.foreground});

  /// 면을 채우는 난이도 색. [difficultyAccent]와 같은 값이다.
  final Color background;

  /// 그 위에 얹는 글자 색. **대비를 계산해 칸마다 따로 골랐다**(아래 참고).
  final Color foreground;
}

/// 난이도 → 좌측 accent 보더 색. 퀘스트 카드가 쓴다.
Color difficultyAccent(BuildContext context, Difficulty difficulty) =>
    _colorsFor(context, difficulty).accent;

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
///
/// 다크에서는 [_colorsFor]가 세 난이도를 통째로 뒤집으므로 여기서 따로 분기하지
/// 않는다 — 전경은 [_PillColors.onAccent]가 들고 온다.
DifficultyFill difficultyFill(BuildContext context, Difficulty difficulty) {
  final colors = _colorsFor(context, difficulty);

  return DifficultyFill(
    background: colors.accent,
    foreground: colors.onAccent,
  );
}

class _PillColors {
  const _PillColors({
    required this.background,
    required this.foreground,
    required this.accent,
    required this.onAccent,
  });

  /// pill 채움.
  final Color background;

  /// pill 글자.
  final Color foreground;

  /// 카드 좌측 세로 보더 · 세그먼트 선택 칸의 채움.
  final Color accent;

  /// [accent]로 꽉 채운 면 **위**에 얹는 글자.
  final Color onAccent;
}

/// 난이도 한 벌(pill 채움·글자 · accent · accent 위 글자)을 한 곳에서 고른다.
///
/// **셋이 같은 함수에서 나오는 것이 요점이다.** 예전에는 pill만 라이트 상수로
/// 박혀 있었는데, 여기서 accent와 세그먼트 채움까지 파생되므로 한 곳만 고치면
/// 나머지 둘이 조용히 어긋난다.
///
/// ## 라이트 (정본 · 변경 없음)
/// 옅은 난이도 틴트 + 진한 난이도 글자.
///
/// ## 다크 (정본에 사양 없음)
/// [QuestSourceChip]이 쓰는 처방과 같은 뜻이다 — 라이트 전용 옅은 틴트를
/// **채운 면 + 반대 밝기 전경**으로 뒤집는다. 다만 채움을 `xxxContainer` 단이
/// 아니라 다크 스킴의 **밝은 단**(`primary` · `coin` · `error`)으로 잡았다:
///
/// - 🟡 노랑에는 다크용 어두운 컨테이너 톤이 **없다**([RewardTheme.dark]는
///   `coin`/`coinGlow`가 둘 다 `#ffb95f`다). 컨테이너 단으로 맞추면 쉬움·어려움만
///   어두운 알약이고 보통만 홀로 밝아 세 난이도의 무게가 갈린다. 새 노랑 HEX를
///   짓지 않는 한 밝은 단이 유일하게 **셋이 균질한** 조합이다(L\* 80.0 · 80.1 · 80.1).
/// - 난이도 = 보상 등급이므로 **그린 → 노랑 → 빨강 순서**가 유지된다.
/// - 좌측 accent에도 같은 값을 쓴다. 라이트 상수를 그대로 두면 어려움 accent
///   (`#ba1a1a`)가 다크 카드 위 **2.37:1**이라 세로선이 보이지 않는다(→ 9.01:1).
///
/// 대비(다크 카드 `#13263D` 기준): 쉬움 7.70:1 · 보통 6.12:1 · 어려움 7.72:1.
_PillColors _colorsFor(BuildContext context, Difficulty difficulty) {
  final theme = Theme.of(context);
  final scheme = theme.colorScheme;
  final reward = theme.reward;

  if (theme.brightness == Brightness.dark) {
    return switch (difficulty) {
      Difficulty.easy => _PillColors(
        background: scheme.primary,
        foreground: scheme.onPrimary,
        accent: scheme.primary,
        onAccent: scheme.onPrimary,
      ),
      // 🟡 노랑은 [RewardTheme] 경유로만 닿는다(파일 수를 늘리지 않는다).
      Difficulty.normal => _PillColors(
        background: reward.coin,
        foreground: reward.onCoin,
        accent: reward.coin,
        onAccent: reward.onCoin,
      ),
      Difficulty.hard => _PillColors(
        background: scheme.error,
        foreground: scheme.onError,
        accent: scheme.error,
        onAccent: scheme.onError,
      ),
    };
  }

  return switch (difficulty) {
    Difficulty.easy => _PillColors(
      background: AppColors.primaryContainer.withValues(alpha: 0.10),
      foreground: AppColors.primary,
      accent: AppColors.primaryContainer,
      onAccent: AppColors.onPrimaryContainer,
    ),
    Difficulty.normal => _PillColors(
      background: reward.coinGlow.withValues(alpha: 0.20),
      foreground: reward.onCoinTint,
      accent: reward.coinGlow,
      onAccent: reward.onCoin,
    ),
    Difficulty.hard => _PillColors(
      background: AppColors.errorContainer,
      foreground: AppColors.onErrorContainer,
      accent: AppColors.error,
      onAccent: AppColors.onError,
    ),
  };
}
