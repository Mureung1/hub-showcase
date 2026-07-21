import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';

/// 퀘스트 출처 칩 — `✨ AI` / `✎ 직접`.
///
/// 출처의 근거는 **`Quest.goalId` 하나다.** AI 분해로 생긴 퀘스트만 원본 목표를
/// 가리키는 goalId를 갖고, 직접 등록한 퀘스트는 null이다(`quest.dart` 참고).
/// 모델에 `source` 같은 필드를 새로 두지 않는 이유가 이것이다 — 이미 있는 사실을
/// 두 곳에 적어 두면 둘이 어긋난다.
///
/// **색은 블루(AI)와 중립 회색(직접)만 쓴다.** 노랑은 코인·보상 전용이라
/// 출처 표시에 쓸 수 없고(`test/theme/color_role_test.dart`), 그린·에러는 각각
/// 완료·난이도가 이미 가져갔다. 카드 좌측 세로 accent는 **난이도 색**이므로
/// 출처를 거기 얹지 않고 칩으로 분리했다.
///
/// [DifficultyPill]과 같은 형태(full 라운드 · labelSmall · 같은 패딩)를 유지해
/// 두 칩이 나란히 놓였을 때 높이가 어긋나지 않게 한다.
class QuestSourceChip extends StatelessWidget {
  const QuestSourceChip({super.key, required this.goalId});

  /// 원본 목표 ID. null이면 직접 등록.
  final String? goalId;

  bool get _isAi => goalId != null;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = _colorsFor(theme, isAi: _isAi);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _isAi ? Symbols.auto_awesome : Symbols.edit,
            size: _iconSize,
            color: colors.foreground,
          ),
          AppSpacing.gapWXs,
          Text(
            _isAi ? 'AI' : '직접',
            style: theme.textTheme.labelSmall?.copyWith(
              color: colors.foreground,
            ),
          ),
        ],
      ),
    );
  }
}

/// labelSmall(12px)과 눈높이를 맞춘 아이콘 크기.
const double _iconSize = 12;

class _ChipColors {
  const _ChipColors({required this.background, required this.foreground});

  final Color background;
  final Color foreground;
}

/// 라이트·다크에서 각각 대비가 남도록 나눠 계산한다.
///
/// 다크에서 라이트와 같은 "블루 10% 틴트 + 블루 글자"를 쓰면, 어두운 카드 위의
/// 파란 글자가 배경과 붙어 읽히지 않는다. 다크에서는 채운 블루 배경 + 밝은 전경으로
/// 뒤집는다(색 역할은 그대로 블루다).
_ChipColors _colorsFor(ThemeData theme, {required bool isAi}) {
  final scheme = theme.colorScheme;
  final isDark = theme.brightness == Brightness.dark;

  if (!isAi) {
    // 직접 등록 = 중립 회색. AI를 돋보이게 하되 "열등한 퀘스트"로 보이게 하지 않는다.
    return _ChipColors(
      background: scheme.surfaceContainerHighest,
      foreground: scheme.onSurfaceVariant,
    );
  }

  return isDark
      ? _ChipColors(
          background: scheme.secondaryContainer,
          foreground: scheme.onSecondaryContainer,
        )
      : _ChipColors(
          background: scheme.secondary.withValues(alpha: 0.10),
          foreground: scheme.secondary,
        );
}
