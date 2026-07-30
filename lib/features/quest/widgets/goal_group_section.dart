import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../models/quest.dart';
import '../../../models/quest_group.dart';

/// 큰 목표(폴더) 하나를 접기/펼치기 섹션으로 그린다.
///
/// AI 분해의 핵심 가치는 "큰 목표 → 작은 퀘스트"인데, 평면 목록에서는 여러 목표의
/// 퀘스트가 뒤섞여 그 구조가 보이지 않는다. 헤더에 목표 이름과 진행률(`2/5 완료`)을
/// 붙여 "이 목표를 얼마나 걸어왔는지"를 목록에서 바로 읽게 한다.
///
/// **섹션 전체가 흰 카드다**(Figma `Redesign` 페이지 `24:162`). 헤더·진행바·자식
/// 퀘스트가 **하나의 카드 안**에 들어간다 — 이 경계선 자체가 "여기까지가 이 목표"를
/// 말한다. (이전 구현은 다른 페이지의 영문 와이어프레임을 보고 헤더 배경을 걷어내고
/// 자식만 틴트 패널로 감쌌다. 정본이 아니어서 되돌렸다.)
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
    this.showProgress = true,
  });

  final QuestGroup group;

  /// 헤더 아래 진행바를 그릴지.
  ///
  /// 정본이 화면마다 갈린다. 오늘의 퀘스트(`24:162`)에는 `Progress` 프레임이 있고,
  /// **보관함(`45:347`·`45:376`)에는 없다** — 보관함 그룹은 전부 100%라 꽉 찬 그린
  /// 막대가 아무 정보도 주지 못하고 카드 높이만 먹는다. 접힌 카드 높이(정본 실측
  /// 74 = 패딩 16 + 헤더 42 + 패딩 16)도 진행바가 없어야 맞는다.
  final bool showProgress;

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

    final scheme = theme.colorScheme;
    // 정본(`24:162`)의 진행 표시는 `primary` 고정이다. 0건일 때 회색으로 낮추는 것은
    // **우리 판단**이다 — 정본에 0건 케이스 자체가 없다. "아직 시작 전"과 "걷는 중"을
    // 색으로 먼저 구분해, 한 걸음이라도 뗐을 때 그린이 살아나는 보상감을 남긴다.
    final progressColor = group.doneCount > 0
        ? scheme.primary
        : scheme.onSurfaceVariant;

    // 헤더 **아래**에 실제로 그려지는 것들. 비어 있으면(진행바 없음 + 접힘) 헤더만
    // 남은 카드라, 헤더가 아래 패딩까지 직접 품어 정본 실측 74에 맞춘다.
    final bodyChildren = _bodyChildren(context, progressColor, scheme);

    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: scheme.outlineVariant),
        boxShadow: AppColors.cardShadow,
      ),
      // 헤더 잉크가 카드 모서리를 삐져나오지 않게 카드 자신이 한 번 더 자른다.
      // (그림자는 decoration이 그리므로 잘리지 않는다 — 자르는 대상은 자식뿐이다.)
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            label: expanded ? '${group.label} 접기' : '${group.label} 펼치기',
            // 카드 배경이 불투명해서 Scaffold의 Material 위에 그려지는 잉크는 가려진다.
            // 투명 Material을 카드 **안쪽**에 세워 잉크가 배경 위로 올라오게 한다.
            child: Material(
              type: MaterialType.transparency,
              child: InkWell(
                onTap: onToggleExpanded,
                borderRadius: _headerInkRadius,
                // 카드 상단 패딩까지 탭 영역에 포함시킨다 — 헤더 글자 높이만으로는
                // 접기/펼치기 탭 영역이 최소 터치 크기에 못 미친다.
                child: Padding(
                  padding: bodyChildren.isEmpty
                      ? _headerOnlyPadding
                      : _headerPadding,
                  child: Row(
                    children: [
                      // Figma 실측 22 — 본문 아이콘(24)보다 한 단 작아 목표명이 먼저 읽힌다.
                      Icon(
                        expanded ? Icons.expand_more : Icons.chevron_right,
                        size: _chevronSize,
                        color: scheme.onSurfaceVariant,
                      ),
                      AppSpacing.gapWSm,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 정본은 종류 라벨(`목표`)이 **위**, 목표명이 아래다.
                            // 한글이라 대문자 변환은 하지 않는다.
                            Text(
                              '목표',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: _labelGap),
                            Text(
                              group.label,
                              style: theme.textTheme.titleMedium,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      AppSpacing.gapWSm,
                      // 진행 표시 `2/5 완료`를 두 조각으로 나눈다. 정본은 문자열 전체에
                      // Sora를 걸어 뒀지만 Sora엔 한글 글리프가 없다 — 수치만 Sora,
                      // '완료'는 Pretendard다(서체 역할 계약이 이긴다).
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${group.doneCount}/${group.total}',
                            style: AppTypography.numericLabelSmall.copyWith(
                              color: progressColor,
                            ),
                          ),
                          AppSpacing.gapWXs,
                          Text(
                            '완료',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: progressColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (bodyChildren.isNotEmpty)
            Padding(
              padding: _bodyPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: bodyChildren,
              ),
            ),
        ],
      ),
    );
  }

  /// 헤더 아래 본문(진행바 · 자식 퀘스트)을 만든다.
  ///
  /// 항목 사이 간격은 정본 실측 12([AppSpacing.smd])로 일정하고, **첫 항목 위**
  /// 간격은 헤더 패딩이 이미 벌려 놨으므로 넣지 않는다.
  List<Widget> _bodyChildren(
    BuildContext context,
    Color progressColor,
    ColorScheme scheme,
  ) {
    return [
      if (showProgress)
        ClipRRect(
          borderRadius: AppRadius.fullAll,
          child: LinearProgressIndicator(
            value: group.progress,
            minHeight: _progressHeight,
            // 트랙은 `surfaceContainer`. 흰 카드 안이라 더 옅은 값을 쓰면
            // 트랙이 배경에 묻혀 진행바가 채운 만큼만 떠 보인다.
            backgroundColor: scheme.surfaceContainer,
            // Figma 실측 채움은 `#005322`지만 토큰 `primary`(`#006e2f`)를
            // 유지한다 — 육안으로 구분되지 않는데 값을 새로 박으면
            // tokens.md와 이중 진실원이 된다.
            valueColor: AlwaysStoppedAnimation(scheme.primary),
          ),
        ),
      // 접혀 있거나 자식이 없으면 헤더(+진행바)만 남은 작은 카드가 된다(정상).
      if (expanded && group.nodes.isNotEmpty)
        // 재분해 자식은 부모 바로 뒤에 들여쓰기해서 그린다. 순서·깊이
        // 규칙은 위젯이 아니라 [arrangeQuestTree](순수 함수)가 정한다.
        for (var i = 0; i < group.nodes.length; i++) ...[
          if (showProgress || i > 0) AppSpacing.gapSmd,
          Padding(
            padding: EdgeInsets.only(
              left: group.nodes[i].depth * _indentPerDepth,
            ),
            child: questBuilder(context, group.nodes[i]),
          ),
        ],
    ];
  }
}

/// 헤더 여백 — 카드 패딩(Figma 16)을 헤더가 직접 품는다. 아래쪽 12는 헤더와
/// 진행바 사이의 정본 간격([AppSpacing.smd])이다. 이렇게 나눠 두면 탭 영역이
/// 카드 좌·우·상단 끝까지 닿아 접기/펼치기가 헤더 어디를 눌러도 반응한다.
const EdgeInsets _headerPadding = EdgeInsets.fromLTRB(
  AppSpacing.md,
  AppSpacing.md,
  AppSpacing.md,
  AppSpacing.smd,
);

/// 헤더 **아래에 아무것도 없을 때**의 여백 — 아래도 카드 패딩 16이다.
/// 보관함의 접힌 그룹(정본 `45:376`, 실측 높이 74 = 16 + 42 + 16)이 이 경우다.
const EdgeInsets _headerOnlyPadding = EdgeInsets.all(AppSpacing.md);

/// 진행바·자식 퀘스트 영역 여백. 위쪽은 [_headerPadding]이 이미 벌려 놨다.
const EdgeInsets _bodyPadding = EdgeInsets.fromLTRB(
  AppSpacing.md,
  0,
  AppSpacing.md,
  AppSpacing.md,
);

/// 헤더 잉크는 카드 **위쪽** 두 모서리만 따라간다(아래는 진행바가 이어지는 직선).
const BorderRadius _headerInkRadius = BorderRadius.vertical(
  top: Radius.circular(AppRadius.md),
);

/// 접기/펼치기 셰브런 크기(Figma 실측 22).
const double _chevronSize = 22;

/// 종류 라벨(`목표`)과 목표명 사이(Figma 실측 2). 한 덩어리로 읽혀야 하는 쌍이라
/// 스케일의 최소 단위(4)보다도 좁다.
const double _labelGap = 2;

/// 진행바 높이(Figma 실측 8).
const double _progressHeight = 8;

/// 재분해 깊이 한 단계당 들여쓰기. 깊이는 최대 2라 좁은 화면에서도 카드가
/// 뭉개지지 않는다(2단계여야 32px).
const double _indentPerDepth = AppSpacing.md;
