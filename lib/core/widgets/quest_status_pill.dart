import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../models/quest_status.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';

/// 멈춤(`stuck`) 표시 pill — `🚧 멈춤`.
///
/// **왜 중립 회색인가.** 카드에서 색은 이미 전부 임자가 있다:
/// 좌측 accent와 [DifficultyPill]은 **난이도**(그린/노랑/빨강)를, [QuestSourceChip]은
/// **출처**(블루/회색)를 쓴다. 여기에 멈춤을 빨강으로 칠하면 "어려움 난이도"와,
/// 블루로 칠하면 "AI 출처"와 의미가 겹쳐 카드가 무슨 색을 왜 쓰는지 읽히지 않는다.
/// 노랑은 코인·보상·스트릭 전용이라 애초에 불가다
/// (`test/theme/color_role_test.dart`가 강제한다).
///
/// 멈춤은 "진행이 꺼져 있는 상태"이므로 **채도를 빼는 쪽**이 의미와도 맞는다.
/// 눈에 띄게 하는 일은 색이 아니라 아이콘(공사중)과 텍스트가 맡는다.
///
/// [DifficultyPill]·[QuestSourceChip]과 같은 형태(full 라운드 · labelSmall · 같은
/// 패딩)라 한 줄에 나란히 놓여도 높이가 어긋나지 않는다.
class QuestStatusPill extends StatelessWidget {
  const QuestStatusPill({super.key, required this.status});

  final QuestStatus status;

  @override
  Widget build(BuildContext context) {
    // 멈춤일 때만 존재한다. todo·done은 체크 버튼과 밑줄이 이미 말해 준다.
    if (status != QuestStatus.stuck) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: scheme.onSurfaceVariant.withValues(alpha: 0.12),
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Symbols.pause_circle,
            fill: 1,
            size: _iconSize,
            color: scheme.onSurfaceVariant,
          ),
          AppSpacing.gapWXs,
          Text(
            '멈춤',
            style: theme.textTheme.labelSmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

/// labelSmall(12px)과 눈높이를 맞춘 아이콘 크기([QuestSourceChip]과 동일).
const double _iconSize = 12;
