import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_spacing.dart';

/// 퀘스트 카드 우측 `⋮` 더보기 메뉴의 항목 하나.
///
/// **카드는 저장소를 모른다.** 무엇을 보여줄지와 눌렀을 때 무엇을 할지는 전부
/// 화면이 정해 이 값으로 주입한다([QuestCard.onToggleDone]과 같은 방식).
/// 그래서 항목을 늘려도(제목 수정·삭제 등) 카드 코드는 그대로다.
class QuestMenuAction {
  const QuestMenuAction({
    required this.label,
    required this.icon,
    required this.onSelected,
  });

  final String label;
  final IconData icon;
  final VoidCallback onSelected;
}

/// 퀘스트 카드의 `⋮` 더보기 (components.md 「퀘스트 카드」).
///
/// [actions]가 비면 **아무것도 그리지 않는다** — 누를 게 없는 메뉴를 띄우면
/// "고장난 버튼"이 된다(예: 이미 완료한 퀘스트에는 멈춤 항목이 없다).
class QuestActionsMenu extends StatelessWidget {
  const QuestActionsMenu({super.key, required this.actions, this.tooltip});

  final List<QuestMenuAction> actions;

  /// 접근성 라벨. 여러 카드가 함께 있을 때 어느 퀘스트의 메뉴인지 구분하려고
  /// 화면이 퀘스트 제목을 섞어 넣는다(테스트에서도 이 라벨로 찾는다).
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    if (actions.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);

    return PopupMenuButton<int>(
      tooltip: tooltip ?? '더보기',
      icon: Icon(
        Symbols.more_vert,
        size: _iconSize,
        color: theme.colorScheme.onSurfaceVariant,
      ),
      onSelected: (index) => actions[index].onSelected(),
      itemBuilder: (context) => [
        for (var i = 0; i < actions.length; i++)
          PopupMenuItem<int>(
            value: i,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  actions[i].icon,
                  size: _menuIconSize,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                AppSpacing.gapWSm,
                Text(actions[i].label),
              ],
            ),
          ),
      ],
    );
  }
}

/// 완료 버튼(28)보다 한 단계 작게 — 주요 행동이 아니라 보조 진입점이다.
const double _iconSize = 22;
const double _menuIconSize = 20;
