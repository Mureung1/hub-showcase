import 'package:flutter/material.dart';

import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/difficulty_pill.dart';
import '../../../core/widgets/reward_chip.dart';
import '../../../models/quest_draft.dart';

/// 분해 초안 카드 — **저장 전 [QuestDraft]** 전용 표시 위젯.
///
/// [QuestCard]와 같은 시각 스타일(흰 카드 + 좌측 난이도 accent 세로 보더 + 난이도 pill
/// + 제목 + 보상 칩)을 공유하되, `QuestCard`는 저장된 [Quest] 전용이고 완료 체크 버튼이
/// 붙는 반면 초안은 **표시 전용**이라 완료 버튼이 없다.
///
/// 편집(제목 수정·삭제·난이도 변경) 컨트롤은 이후 커밋에서 붙는다. 이 커밋은 컴포넌트화까지다.
///
/// 색 규칙(one-step-design):
/// - 좌측 accent·난이도 pill = 난이도 색(`difficultyAccent` / [DifficultyPill]).
/// - 노랑(코인·보상)은 [RewardChip]이 전담한다. 직접 노랑을 쓰지 않는다.
class QuestDraftCard extends StatelessWidget {
  const QuestDraftCard({super.key, required this.draft});

  final QuestDraft draft;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = difficultyAccent(context, draft.difficulty);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        // 좌측 accent 세로 보더 — QuestCard와 동일한 gradient 트릭(components.md).
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DifficultyPill(difficulty: draft.difficulty),
          AppSpacing.gapSm,
          Text(draft.title, style: theme.textTheme.bodyLarge),
          AppSpacing.gapSm,
          RewardChip(reward: draft.reward),
        ],
      ),
    );
  }
}
