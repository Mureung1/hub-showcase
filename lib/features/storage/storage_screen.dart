import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/error/app_failure.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/quest_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/quest_group.dart';
import '../../providers/providers.dart';
import '../quest/widgets/goal_group_section.dart';
import '../shell/tab_scroll_registry.dart';

/// 보관함 — 끝낸 일이 쌓이는 곳.
///
/// "오늘의 퀘스트 = 할 일, 보관함 = 끝낸 일" 구조(2단계). 완료돼 보관된
/// (`archived == true`) 퀘스트를 **오늘의 퀘스트와 같은 폴더 그룹뷰**로 보여 준다 —
/// [archivedGroupsProvider] → [groupQuestsByGoal] → [GoalGroupSection]을 그대로
/// 재사용한다. 다른 점은 딱 하나: **완료 토글이 없는 보기 전용 카드**다(단방향 이동
/// 이라 여기서 되돌리지 않는다).
///
/// 이 화면은 **읽기만** 한다. 목표는 통째로, 직접 등록은 낱개로 옮겨져 오지만 화면은
/// 어느 쪽인지 구분할 필요가 없다 — 그룹뷰가 폴더/직접 등록을 이미 갈라 준다.
class StorageScreen extends ConsumerStatefulWidget {
  const StorageScreen({super.key});

  @override
  ConsumerState<StorageScreen> createState() => _StorageScreenState();
}

class _StorageScreenState extends ConsumerState<StorageScreen>
    with TabScrollRegistration {
  @override
  int get tabIndex => 3;

  /// 그룹별 펼침 상태 (키 = [QuestGroup.key]).
  ///
  /// 보관함은 이미 끝난 것이라 **기본 펼침**이다 — 사용자가 해낸 것을 바로 보여 준다.
  /// 오늘의 퀘스트는 "완료된 그룹을 접어" 진행 중인 걸 위로 올리지만, 여기선 모두
  /// 완료라 접을 이유가 없다. 값은 처음 그릴 때 확정하고 그 뒤엔 사용자 조작만 바꾼다.
  final Map<String, bool> _expanded = {};

  bool _isExpanded(QuestGroup group) =>
      _expanded.putIfAbsent(group.key, () => true);

  @override
  Widget build(BuildContext context) {
    final groupsAsync = ref.watch(archivedGroupsProvider);
    // 스트릭은 요약 부가 수치다. 못 읽어도 0으로 떨어뜨리고 목록은 그대로 보여 준다
    // (questGroupsProvider가 goal 실패를 삼키는 것과 같은 원칙).
    final streak = ref.watch(currentUserProvider).valueOrNull?.streak ?? 0;

    return Scaffold(
      body: SafeArea(
        child: groupsAsync.when(
          loading: () => const _StorageSkeleton(),
          error: (error, _) => ErrorView(
            message: error is AppFailure ? error.message : '보관함을 불러오지 못했어요.',
            onRetry: () => ref.invalidate(questListProvider),
          ),
          data: (groups) => _content(groups, streak),
        ),
      ),
    );
  }

  Widget _content(List<QuestGroup> groups, int streak) {
    final theme = Theme.of(context);
    // 보관된 퀘스트 총합 = 지금까지 해낸 도전 수(폴더 안 자식·자동완료 원본 포함).
    final completedCount = groups.fold<int>(0, (sum, g) => sum + g.total);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenH,
            AppSpacing.md,
            AppSpacing.screenH,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('보관함', style: theme.textTheme.headlineLarge),
              AppSpacing.gapXs,
              Text(
                '끝낸 도전을 모아 뒀어요.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.gapMd,
              _SummaryCard(completedCount: completedCount, streak: streak),
            ],
          ),
        ),
        AppSpacing.gapMd,
        Expanded(
          child: groups.isEmpty
              ? const EmptyView(
                  title: '아직 끝낸 도전이 없어요',
                  message: '퀘스트를 완료하면 여기로 하나씩 옮겨져요.',
                  emoji: '🗂️',
                )
              : ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenH,
                    AppSpacing.sm,
                    AppSpacing.screenH,
                    AppSpacing.xl,
                  ),
                  itemCount: groups.length,
                  itemBuilder: (context, index) {
                    final group = groups[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: GoalGroupSection(
                        group: group,
                        expanded: _isExpanded(group),
                        onToggleExpanded: () => setState(() {
                          _expanded[group.key] = !_isExpanded(group);
                        }),
                        // 보기 전용 카드 — 완료 토글도 `⋮` 메뉴도 없다. 보관함은
                        // 끝낸 일을 되돌리지 않으므로 상호작용을 걷어낸다.
                        questBuilder: (context, node) =>
                            QuestCard(quest: node.quest),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

/// 완료 수 · 연속 일수 2분할 요약.
///
/// 요약 수치는 **그린/중립**이다 — 노랑은 코인·보상·스트릭 규칙이지만 여기 스트릭은
/// 배지가 아니라 요약 통계 수치라 중립으로 둔다(color_role_test 무수정 통과).
class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.completedCount, required this.streak});

  final int completedCount;
  final int streak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: AppColors.softShadow,
      ),
      child: Row(
        children: [
          Expanded(
            child: _Stat(
              icon: Symbols.check_circle,
              value: '$completedCount',
              label: '완료',
            ),
          ),
          Container(
            width: 1,
            height: 40,
            color: theme.colorScheme.outlineVariant,
          ),
          Expanded(
            child: _Stat(
              icon: Symbols.local_fire_department,
              value: '$streak',
              label: '연속 일수',
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Icon(icon, size: 22, fill: 1, color: AppColors.primary),
        AppSpacing.gapXs,
        Text(
          value,
          style: theme.textTheme.headlineMedium?.copyWith(
            color: AppColors.primary,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _StorageSkeleton extends StatelessWidget {
  const _StorageSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: AppSpacing.screenPadding,
      children: const [
        SkeletonBox(width: 120, height: 40),
        AppSpacing.gapLg,
        SkeletonBox(height: 84, radius: AppRadius.lg),
        AppSpacing.gapLg,
        SkeletonBox(height: 96, radius: AppRadius.md),
        AppSpacing.gapMd,
        SkeletonBox(height: 96, radius: AppRadius.md),
        AppSpacing.gapMd,
        SkeletonBox(height: 96, radius: AppRadius.md),
      ],
    );
  }
}
