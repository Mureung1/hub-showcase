import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_spacing.dart';
import 'quest_card.dart' show kQuestCardTrailingBox;

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
      // 박스 크기를 완료 토글과 **똑같이** 못 박는다([kQuestCardTrailingBox]).
      // 정본(24:171)에서 `⋮`(윗줄)와 완료 토글(가운뎃줄)은 오른쪽 끝이 맞물린
      // 같은 세로축에 선다. 박스 폭이 다르면 두 글리프의 중심이 어긋난다.
      //
      // `minimumSize`만으로는 이 크기가 되지 않는다 — `IconButton`은 테마 기본
      // `MaterialTapTargetSize.padded`를 따라 레이아웃 박스를 최소 48로 부풀린다
      // (박스는 그 안에 가운데 정렬될 뿐이라 눈에는 42인데 자리는 48을 먹고,
      //  윗줄이 통째로 48이 돼 칩이 아래로 밀린다). 그래서 `shrinkWrap`을 함께 준다.
      padding: EdgeInsets.zero,
      style: IconButton.styleFrom(
        minimumSize: const Size.square(kQuestCardTrailingBox),
        padding: EdgeInsets.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
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

/// 완료 토글(26)보다 한 단계 작게 — 주요 행동이 아니라 보조 진입점이다.
///
/// 정본(24:171)의 `Symbols.more_vert` 프레임은 26이지만, `⋮`는 점 세 개라 같은
/// 크기여도 무게가 다르다. 여기서 정하는 건 **글리프 크기뿐**이고, 오른쪽 세로축은
/// 박스([kQuestCardTrailingBox])가 잡으므로 완료 토글과 중심이 어긋나지 않는다.
const double _iconSize = 22;
const double _menuIconSize = 20;
