import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../models/quest.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import 'difficulty_pill.dart';
import 'reward_chip.dart';

/// 퀘스트 카드. 흰 카드 + 좌측 난이도 색 accent 보더.
class QuestCard extends StatelessWidget {
  const QuestCard({
    super.key,
    required this.quest,
    this.onTap,
    this.onToggleDone,
  });

  final Quest quest;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onToggleDone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = difficultyAccent(context, quest.difficulty);

    return Material(
      color: theme.colorScheme.surfaceContainerLowest,
      borderRadius: AppRadius.mdAll,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.mdAll,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: AppRadius.mdAll,
            border: Border.all(color: theme.colorScheme.outlineVariant),
            // 좌측 accent 세로 보더 (components.md).
            gradient: LinearGradient(
              colors: [accent, accent, Colors.transparent],
              stops: const [0, 0.012, 0.012],
            ),
          ),
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.md,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DifficultyPill(difficulty: quest.difficulty),
                    AppSpacing.gapSm,
                    Text(
                      quest.title,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        decoration: quest.done
                            ? TextDecoration.lineThrough
                            : null,
                        color: quest.done
                            ? theme.colorScheme.onSurfaceVariant
                            : theme.colorScheme.onSurface,
                      ),
                    ),
                    AppSpacing.gapSm,
                    RewardChip(reward: quest.reward),
                  ],
                ),
              ),
              if (onToggleDone != null)
                _DoneButton(
                  done: quest.done,
                  onPressed: () => onToggleDone!(!quest.done),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DoneButton extends StatelessWidget {
  const _DoneButton({required this.done, required this.onPressed});

  final bool done;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: done ? '완료 취소' : '완료',
      icon: Icon(
        done ? Symbols.check_circle : Symbols.circle,
        fill: done ? 1 : 0,
        color: done
            ? AppColors.primary
            : Theme.of(context).colorScheme.outlineVariant,
        size: 28,
      ),
    );
  }
}
