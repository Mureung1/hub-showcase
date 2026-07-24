import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/error/app_failure.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/reward_chip.dart';
import '../../core/widgets/state_views.dart';
import '../../models/achievement.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';

/// 보관함 — 완료·인증한 도전이 쌓이는 성취 타임라인.
///
/// 보상 루프의 결과가 처음으로 사용자에게 이력으로 보이는 화면이다
/// (plan.md 성공 지표 「누적 완료 퀘스트 수」). 데이터는 [completeQuest]
/// 트랜잭션이 남긴 `achievements` 기록이고, 이 화면은 **읽기만** 한다.
/// one-step-design `screens.md` "성취 보관함" 스펙을 따른다.
///
/// 상단은 완료 수·연속 일수 요약(2분할), 아래는 최신순 타임라인 카드다.
/// 사진은 목록에서 썸네일을 읽지 않고 **유무 뱃지만** 보인다 — proof 문서는
/// questId당 별도라 목록에서 N번 읽으면 비싸다(3주차에 문서를 분리한 이유).
/// (탭하면 상세로 열어 그때 proof를 읽는 방식은 이번 범위 밖이다.)
class StorageScreen extends ConsumerStatefulWidget {
  const StorageScreen({super.key});

  @override
  ConsumerState<StorageScreen> createState() => _StorageScreenState();
}

class _StorageScreenState extends ConsumerState<StorageScreen>
    with TabScrollRegistration {
  @override
  int get tabIndex => 3;

  @override
  Widget build(BuildContext context) {
    final achievementsAsync = ref.watch(achievementsProvider);
    // 스트릭은 요약 부가 수치다. 그것 때문에 타임라인 전체가 오류·로딩 화면이 되면
    // 사용자는 완료 이력을 잃은 걸로 본다. 못 읽으면 0으로 떨어뜨리고 타임라인은
    // 그대로 보여 준다(questGroupsProvider가 goal 실패를 삼키는 것과 같은 원칙).
    final streak = ref.watch(currentUserProvider).valueOrNull?.streak ?? 0;

    return Scaffold(
      body: SafeArea(
        child: achievementsAsync.when(
          loading: () => const _StorageSkeleton(),
          error: (error, _) => ErrorView(
            message: error is AppFailure ? error.message : '보관함을 불러오지 못했어요.',
            onRetry: () => ref.invalidate(sessionProvider),
          ),
          data: (achievements) => _content(achievements, streak),
        ),
      ),
    );
  }

  Widget _content(List<Achievement> achievements, int streak) {
    final theme = Theme.of(context);

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
                '지금까지 해낸 도전을 모아 뒀어요.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.gapMd,
              _SummaryCard(
                completedCount: achievements.length,
                streak: streak,
              ),
            ],
          ),
        ),
        AppSpacing.gapMd,
        Expanded(
          child: achievements.isEmpty
              ? const EmptyView(
                  title: '아직 완료한 도전이 없어요',
                  message: '퀘스트를 완료하면 여기에 하나씩 쌓여요.',
                  emoji: '🗂️',
                )
              : ListView.separated(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenH,
                    AppSpacing.sm,
                    AppSpacing.screenH,
                    AppSpacing.xl,
                  ),
                  itemCount: achievements.length,
                  separatorBuilder: (_, _) => AppSpacing.gapSm,
                  itemBuilder: (context, index) =>
                      _AchievementCard(achievement: achievements[index]),
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

/// 타임라인 카드 하나 — 흰 카드 + 좌측 그린 accent 보더(성취 = 완료·성장).
class _AchievementCard extends StatelessWidget {
  const _AchievementCard({required this.achievement});

  final Achievement achievement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        borderRadius: AppRadius.mdAll,
        color: theme.colorScheme.surfaceContainerLowest,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        // 좌측 accent 세로 보더 (components.md, QuestCard와 같은 패턴).
        gradient: const LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary,
            Colors.transparent,
          ],
          stops: [0, 0.012, 0.012],
        ),
        boxShadow: AppColors.softShadow,
      ),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Symbols.calendar_today,
                size: 14,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              AppSpacing.gapWXs,
              Text(
                _formatDate(achievement.completedAt),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          AppSpacing.gapSm,
          Text(
            achievement.questTitle.isEmpty
                ? '제목 없는 도전'
                : achievement.questTitle,
            style: theme.textTheme.bodyLarge,
          ),
          AppSpacing.gapSm,
          Row(
            children: [
              // 코인·XP — 노랑은 RewardChip 안에 갇혀 있다(색 역할 규칙).
              RewardChip(reward: achievement.reward),
              const Spacer(),
              ..._badges(context),
            ],
          ),
        ],
      ),
    );
  }

  /// 인증 뱃지 — 메모/사진이 있으면 각각 아이콘으로 알린다.
  List<Widget> _badges(BuildContext context) {
    final badges = <Widget>[];
    if (achievement.memo != null) {
      badges.add(const _Badge(icon: Symbols.edit_note, label: '메모'));
    }
    if (achievement.hasPhoto) {
      if (badges.isNotEmpty) badges.add(AppSpacing.gapWSm);
      badges.add(const _Badge(icon: Symbols.photo_camera, label: '사진'));
    }
    return badges;
  }

  /// 날짜 라벨 `yyyy.MM.dd`. 완료 시각이 없으면(구버전·깨진 기록) 폴백 문구.
  String _formatDate(DateTime? at) {
    if (at == null) return '날짜 미상';
    final month = at.month.toString().padLeft(2, '0');
    final day = at.day.toString().padLeft(2, '0');
    return '${at.year}.$month.$day';
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: theme.colorScheme.secondary),
          AppSpacing.gapWXs,
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.secondary,
            ),
          ),
        ],
      ),
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
