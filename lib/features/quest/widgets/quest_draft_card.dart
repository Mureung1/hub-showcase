import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/difficulty_pill.dart';
import '../../../core/widgets/reward_chip.dart';
import '../../../models/difficulty.dart';
import '../../../models/quest_draft.dart';

/// 분해 초안 카드 — **저장 전 [QuestDraft]** 전용 표시 위젯.
///
/// [QuestCard]와 같은 시각 스타일(흰 카드 + 좌측 난이도 accent 세로 보더 + 난이도 pill
/// + 제목 + 보상 칩)을 공유하되, `QuestCard`는 저장된 [Quest] 전용이고 완료 체크 버튼이
/// 붙는 반면 초안은 완료 버튼이 없다.
///
/// **편집 컨트롤은 선택적이다.** [onEditTitle]·[onChangeDifficulty]·[onDelete]가
/// 모두 null이면 예전처럼 순수 표시 전용으로 동작한다(하위호환). 콜백을 주면 해당
/// 컨트롤이 켜진다. 카드는 "편집 요청"만 발신하고, 실제 편집 다이얼로그나 상태 변경은
/// 화면(부모)이 처리한다.
///
/// 색 규칙(one-step-design):
/// - 좌측 accent·난이도 pill = 난이도 색(`difficultyAccent` / [DifficultyPill]).
/// - 노랑(코인·보상)은 [RewardChip]이 전담한다. 직접 노랑을 쓰지 않는다.
/// - 편집·삭제 컨트롤은 중립(`onSurfaceVariant`)이다. 삭제를 error 빨강으로 칠하지
///   않는다 — Hard 난이도가 error색이라 혼동을 부른다.
class QuestDraftCard extends StatelessWidget {
  const QuestDraftCard({
    super.key,
    required this.draft,
    this.onEditTitle,
    this.onChangeDifficulty,
    this.onDelete,
    this.onReDecompose,
    this.isReDecomposing = false,
  });

  final QuestDraft draft;

  /// 제목 수정 요청. 화면이 편집 다이얼로그를 띄운다.
  final VoidCallback? onEditTitle;

  /// 난이도 변경 요청. 선택된 [Difficulty]를 전달한다.
  final ValueChanged<Difficulty>? onChangeDifficulty;

  /// 삭제 요청.
  final VoidCallback? onDelete;

  /// 개별 재분해 요청 — 이 항목을 더 작은 하위 퀘스트들로 다시 나눈다.
  /// AI 재요청이라 버튼은 **블루**(secondary)다(one-step-design "AI=블루").
  final VoidCallback? onReDecompose;

  /// 이 항목이 재분해 중인지. true면 🔄 자리에 블루 스피너 + 비활성(중복 탭 방지 시각화).
  final bool isReDecomposing;

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
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 난이도: 콜백이 있으면 팝업으로 선택 가능, 없으면 읽기 전용 pill.
              Expanded(child: _DifficultyControl(this)),
              // 재분해: 콜백이 있으면 블루 🔄 버튼(AI 재요청). 진행 중이면 블루 스피너 + 비활성.
              if (onReDecompose != null)
                if (isReDecomposing)
                  Padding(
                    // IconButton 기본 터치영역과 시각적으로 정렬되도록 여백을 맞춘다.
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: theme.colorScheme.secondary,
                      ),
                    ),
                  )
                else
                  IconButton(
                    onPressed: onReDecompose,
                    tooltip: '더 작게 나누기',
                    visualDensity: VisualDensity.compact,
                    iconSize: 20,
                    // AI 재요청이라 블루(secondary). 편집·삭제(중립)와 색으로 구분된다.
                    color: theme.colorScheme.secondary,
                    icon: const Icon(Symbols.replay),
                  ),
              // 삭제: 콜백이 있으면 우상단 아이콘 버튼.
              if (onDelete != null)
                IconButton(
                  onPressed: onDelete,
                  tooltip: '삭제',
                  visualDensity: VisualDensity.compact,
                  iconSize: 20,
                  color: theme.colorScheme.onSurfaceVariant,
                  icon: const Icon(Symbols.close),
                ),
            ],
          ),
          AppSpacing.gapSm,
          // 제목: 콜백이 있으면 탭 가능(옆에 편집 아이콘), 없으면 순수 텍스트.
          if (onEditTitle != null)
            _EditableTitle(title: draft.title, onEditTitle: onEditTitle!)
          else
            Text(draft.title, style: theme.textTheme.bodyLarge),
          AppSpacing.gapSm,
          RewardChip(reward: draft.reward),
        ],
      ),
    );
  }
}

/// 난이도 표시. 콜백이 있으면 [DifficultyPill]을 팝업 트리거로 감싸고, 없으면 pill만.
///
/// [DifficultyPill] 자체는 수정하지 않는다(다른 화면이 읽기 전용으로 씀). 감싸서
/// 상호작용만 더한다.
class _DifficultyControl extends StatelessWidget {
  const _DifficultyControl(this.card);

  final QuestDraftCard card;

  @override
  Widget build(BuildContext context) {
    final onChangeDifficulty = card.onChangeDifficulty;
    if (onChangeDifficulty == null) {
      return Align(
        alignment: Alignment.centerLeft,
        child: DifficultyPill(difficulty: card.draft.difficulty),
      );
    }

    final theme = Theme.of(context);
    return Align(
      alignment: Alignment.centerLeft,
      child: PopupMenuButton<Difficulty>(
        tooltip: '난이도 변경',
        initialValue: card.draft.difficulty,
        onSelected: onChangeDifficulty,
        itemBuilder: (context) => [
          for (final d in Difficulty.values)
            PopupMenuItem(value: d, child: Text(d.label)),
        ],
        child: Padding(
          // pill이 작아 터치 영역을 넓힌다.
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              DifficultyPill(difficulty: card.draft.difficulty),
              Icon(
                Symbols.arrow_drop_down,
                size: 18,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 탭하면 제목 편집을 요청하는 제목 행. 옆에 작은 편집 아이콘.
class _EditableTitle extends StatelessWidget {
  const _EditableTitle({required this.title, required this.onEditTitle});

  final String title;
  final VoidCallback onEditTitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onEditTitle,
      borderRadius: AppRadius.smAll,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Text(title, style: theme.textTheme.bodyLarge)),
            AppSpacing.gapWXs,
            Icon(
              Symbols.edit,
              size: 18,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}
