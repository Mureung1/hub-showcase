import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../models/quest.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import 'difficulty_pill.dart';
import 'quest_actions_menu.dart';
import 'quest_source_chip.dart';
import 'quest_status_pill.dart';
import 'reward_chip.dart';

/// 퀘스트 카드. 흰 카드 + 좌측 난이도 색 accent 보더.
class QuestCard extends StatelessWidget {
  const QuestCard({
    super.key,
    required this.quest,
    this.onTap,
    this.onToggleDone,
    this.isCompleting = false,
    this.menuActions = const [],
  });

  final Quest quest;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onToggleDone;

  /// 우측 `⋮` 더보기 메뉴 항목. 비어 있으면 `⋮` 자체가 뜨지 않는다.
  ///
  /// **카드는 저장소를 모른다** — 어떤 항목을 줄지도, 눌렀을 때 무엇을 할지도
  /// 화면이 정해서 주입한다([onToggleDone]과 같은 방식). 덕분에 나중에 항목이
  /// 늘어나도(제목 수정·삭제 등) 이 위젯은 그대로다.
  final List<QuestMenuAction> menuActions;

  /// 완료 처리(트랜잭션 지급)가 진행 중인지. true면 토글을 비활성화하고 스피너를
  /// 띄운다 — 지급 트랜잭션이 커밋되기 전에 다시 눌러 중복 요청이 나가는 걸 막고,
  /// "지금 처리 중"임을 눈으로 알린다.
  final bool isCompleting;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = difficultyAccent(context, quest.difficulty);

    // 오른쪽 컨트롤이 하나라도 서는가. 보기 전용(홈 미리보기·보관함)이면 둘 다 없다.
    // 있을 때만 오른쪽 패딩을 박스 여백만큼 덜어 낸다(→ [_padding]).
    final hasTrailing = menuActions.isNotEmpty || onToggleDone != null;

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
          padding: hasTrailing ? _padding : _paddingViewOnly,
          // 정본(24:171) 3단 구조 — TopRow(칩 … `⋮`) / MiddleRow(제목 … 완료 토글)
          // / RewardChip. `⋮`와 완료 토글을 오른쪽 한 열에 쌓지 않는다: 쌓으면
          // 완료 토글이 제목 옆이 아니라 윗줄로 딸려 올라가 위쪽으로 쏠려 보인다.
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── TopRow: 칩 묶음 … `⋮` 더보기 ──
              Row(
                children: [
                  // 난이도 + 출처. 긴 제목·좁은 폭에서도 넘치지 않도록 Wrap을
                  // 쓴다(Row였다면 폭이 모자랄 때 오버플로 줄무늬가 뜬다).
                  // Expanded라 `⋮`가 없어도(보기 전용) 자리가 무너지지 않는다.
                  Expanded(
                    child: Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.xs,
                      children: [
                        DifficultyPill(difficulty: quest.difficulty),
                        QuestSourceChip(source: quest.effectiveSource),
                        // 멈춤일 때만 렌더된다(그 외 상태는 빈 위젯).
                        QuestStatusPill(status: quest.status),
                      ],
                    ),
                  ),
                  // 칩과의 간격을 따로 두지 않는다 — `⋮` 박스가 이미 좌우
                  // [AppSpacing.sm]씩 자체 여백을 갖는다. 비면 SizedBox.shrink다.
                  QuestActionsMenu(
                    actions: menuActions,
                    tooltip: '${quest.title} 더보기',
                  ),
                ],
              ),
              AppSpacing.gapSm,
              // ── MiddleRow: 제목 … 완료 토글(세로 중앙) ──
              Row(
                children: [
                  Expanded(
                    child: Text(
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
                  ),
                  // 제목↔토글 정본 간격 12 = 여기 4 + 토글 박스 자체 여백 8.
                  if (onToggleDone != null) ...[
                    AppSpacing.gapWXs,
                    _DoneButton(
                      done: quest.done,
                      isCompleting: isCompleting,
                      onPressed: () => onToggleDone!(!quest.done),
                    ),
                  ],
                ],
              ),
              AppSpacing.gapSm,
              RewardChip(reward: quest.reward),
            ],
          ),
        ),
      ),
    );
  }
}

/// 오른쪽 컨트롤(`⋮` · 완료 토글)이 공유하는 박스 한 변.
///
/// 정본(Figma `24:171`) 실측: 완료 토글 글리프는 **26 정사각**이고, 오른쪽 끝이
/// 본문 패딩 16에 맞물리며, 윗줄 `⋮`와 **같은 세로축**에 선다. 여기서는 그 글리프
/// 26에 좌우 [AppSpacing.sm]씩 여백을 더해 42 박스로 만든다(초안 카드
/// `_actionButtonSize`와 같은 방식). 덕분에 남는 값이 전부 토큰으로 떨어진다.
///
/// - 카드 오른쪽 패딩 [AppSpacing.sm](8) + 박스 여백 8 = **글리프가 16 안쪽** ✔
/// - 제목↔토글 [AppSpacing.xs](4) + 박스 여백 8 = **시각 간격 12** ✔
///
/// Figma는 **탭 영역을 그리지 않는다.** 26을 그대로 박스로 쓰면 터치 면적이 26밖에
/// 안 되므로, 눈에 보이는 위치는 정본 그대로 두고 누르는 면적만 42로 넓혔다
/// (권장치 48보다는 작다 — 48로 키우면 보정값이 토큰에서 벗어나고, 한 줄 제목에서
/// 카드가 통째로 20 더 높아진다).
const double kQuestCardTrailingBox = _trailingIcon + AppSpacing.sm * 2;

/// 완료 토글 글리프 크기. 정본 실측 26(기존 28에서 정정).
const double _trailingIcon = 26;

/// 정본 패딩은 사방 16이다. 오른쪽만 [AppSpacing.sm](8)인 이유는
/// [kQuestCardTrailingBox]에 적었다 — 박스 자체 여백 8과 합쳐 16이 된다.
const EdgeInsets _padding = EdgeInsets.fromLTRB(
  AppSpacing.md,
  AppSpacing.md,
  AppSpacing.sm,
  AppSpacing.md,
);

/// 보기 전용 카드(홈 미리보기·보관함)에는 오른쪽 컨트롤이 없어 보정할 여백도 없다.
/// 그대로 8을 쓰면 제목이 오른쪽만 8 안쪽에서 접혀 좌우가 어긋나 보인다.
const EdgeInsets _paddingViewOnly = AppSpacing.cardPadding;

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
      // 아래 IconButton과 **같은 크기 박스**에 같은 크기 글리프를 그린다. 자리가
      // 1px이라도 움직이면 처리 중에 제목 줄이 들썩여 옆 것을 잘못 누른다.
      return const SizedBox.square(
        dimension: kQuestCardTrailingBox,
        child: Center(
          child: SizedBox.square(
            dimension: _trailingIcon,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    final scheme = Theme.of(context).colorScheme;

    return IconButton(
      onPressed: onPressed,
      tooltip: done ? '완료 취소' : '완료',
      iconSize: _trailingIcon,
      // 박스를 명시하지 않으면 테마 기본 `MaterialTapTargetSize.padded`가 레이아웃
      // 박스를 48로 부풀린다 — 그러면 위 스피너(42)와 크기가 달라 완료를 누르는
      // 순간 제목 줄 높이가 튄다.
      style: IconButton.styleFrom(
        minimumSize: const Size.square(kQuestCardTrailingBox),
        padding: EdgeInsets.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      icon: Icon(
        done ? Symbols.check_circle : Symbols.circle,
        fill: done ? 1 : 0,
        // 🟢 완료 체크는 **`scheme.primary`**다. 상수 [AppColors.primary]
        // (`#006e2f`)를 쓰면 다크 카드(`#13263D`) 위 대비가 2.38:1로 무너진다 —
        // 다크 스킴이 이 슬롯을 밝은 그린(`#4ae176`)으로 이미 뒤집어 뒀다(8.98:1).
        // 라이트에서는 두 값이 같아 렌더가 바뀌지 않는다.
        color: done ? scheme.primary : scheme.outlineVariant,
      ),
    );
  }
}
