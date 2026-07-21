import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../models/quest.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import 'difficulty_pill.dart';
import 'quest_source_chip.dart';
import 'reward_chip.dart';

/// 퀘스트 카드. 흰 카드 + 좌측 난이도 색 accent 보더.
class QuestCard extends StatelessWidget {
  const QuestCard({
    super.key,
    required this.quest,
    this.onTap,
    this.onToggleDone,
    this.isCompleting = false,
  });

  final Quest quest;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onToggleDone;

  /// 완료 처리(트랜잭션 지급)가 진행 중인지. true면 토글을 비활성화하고 스피너를
  /// 띄운다 — 지급 트랜잭션이 커밋되기 전에 다시 눌러 중복 요청이 나가는 걸 막고,
  /// "지금 처리 중"임을 눈으로 알린다.
  final bool isCompleting;

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
                    // 난이도 + 출처. 긴 제목·좁은 폭에서도 넘치지 않도록 Wrap을
                    // 쓴다(Row였다면 폭이 모자랄 때 오버플로 줄무늬가 뜬다).
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.xs,
                      children: [
                        DifficultyPill(difficulty: quest.difficulty),
                        QuestSourceChip(goalId: quest.goalId),
                      ],
                    ),
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
                  isCompleting: isCompleting,
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
  const _DoneButton({
    required this.done,
    required this.onPressed,
    this.isCompleting = false,
  });

  final bool done;
  final bool isCompleting;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    if (isCompleting) {
      // IconButton(size 28 + 기본 패딩 8)과 같은 자리를 차지하도록 크기를 맞춘다.
      // 자리가 흔들리면 처리 중에 카드 레이아웃이 튄다.
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.sm),
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

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
