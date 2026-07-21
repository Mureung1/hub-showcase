import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../models/quest.dart';
import '../../../models/quest_group.dart';

/// 큰 목표(폴더) 하나를 접기/펼치기 섹션으로 그린다.
///
/// AI 분해의 핵심 가치는 "큰 목표 → 작은 퀘스트"인데, 평면 목록에서는 여러 목표의
/// 퀘스트가 뒤섞여 그 구조가 보이지 않는다. 헤더에 목표 이름과 진행률(2/5)을 붙여
/// "이 목표를 얼마나 걸어왔는지"를 목록에서 바로 읽게 한다.
///
/// 자식 카드는 기존 [Quest] 카드를 그대로 쓴다 — 이 위젯은 **묶는 일만** 한다.
/// 색은 그린(`primary`)만 쓴다. 노랑은 코인·보상 전용이라 진행바에 쓰지 않는다.
class GoalGroupSection extends StatelessWidget {
  const GoalGroupSection({
    super.key,
    required this.group,
    required this.expanded,
    required this.onToggleExpanded,
    required this.questBuilder,
  });

  final QuestGroup group;

  /// 지금 펼쳐져 있는가. 상태는 화면이 들고 있고 이 위젯은 그리기만 한다
  /// (스트림이 갱신될 때마다 접힘 상태가 초기화되면 안 된다).
  final bool expanded;

  final VoidCallback onToggleExpanded;

  /// 퀘스트 하나를 카드로 그리는 콜백. 완료 토글·진행 표시는 화면이 안다.
  final Widget Function(BuildContext context, Quest quest) questBuilder;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: theme.colorScheme.surfaceContainer,
          borderRadius: AppRadius.mdAll,
          child: Semantics(
            button: true,
            label: expanded ? '${group.label} 접기' : '${group.label} 펼치기',
            child: InkWell(
              onTap: onToggleExpanded,
              borderRadius: AppRadius.mdAll,
              child: Padding(
                padding: AppSpacing.cardPadding,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          expanded ? Symbols.expand_more : Symbols.chevron_right,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        AppSpacing.gapWSm,
                        Expanded(
                          child: Text(
                            group.label,
                            style: theme.textTheme.titleMedium,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        AppSpacing.gapWSm,
                        Text(
                          '${group.doneCount}/${group.total}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    AppSpacing.gapSm,
                    ClipRRect(
                      borderRadius: AppRadius.fullAll,
                      child: LinearProgressIndicator(
                        value: group.progress,
                        minHeight: 6,
                        backgroundColor: theme.colorScheme.surfaceContainerLowest,
                        valueColor: AlwaysStoppedAnimation(
                          theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (expanded)
          for (final quest in group.quests) ...[
            AppSpacing.gapSm,
            questBuilder(context, quest),
          ],
      ],
    );
  }
}
