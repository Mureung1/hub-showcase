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
  ///
  /// [QuestNode]를 넘기는 이유: 재분해 깊이는 화면도 필요하다(깊이 초과면 `⋮`에서
  /// 재분해 항목을 숨긴다). 들여쓰기는 이 위젯이, 깊이에 따른 동작은 화면이 맡는다.
  final Widget Function(BuildContext context, QuestNode node) questBuilder;

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
        // 재분해 자식은 부모 바로 뒤에 들여쓰기해서 그린다. 순서·깊이 규칙은
        // 위젯이 아니라 [arrangeQuestTree](순수 함수)가 정한다.
        if (expanded)
          for (final node in group.nodes) ...[
            AppSpacing.gapSm,
            Padding(
              padding: EdgeInsets.only(left: node.depth * _indentPerDepth),
              child: questBuilder(context, node),
            ),
          ],
      ],
    );
  }
}

/// 재분해 깊이 한 단계당 들여쓰기. 깊이는 최대 2라 좁은 화면에서도 카드가
/// 뭉개지지 않는다(2단계여야 32px).
const double _indentPerDepth = AppSpacing.md;
