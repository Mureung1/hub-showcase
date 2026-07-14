import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/error/app_failure.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/quest_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/app_user.dart';
import '../../models/quest.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';
import 'widgets/character_card.dart';

/// 홈 / 캐릭터 화면.
///
/// checklist 1주차:
/// - 레벨·XP·코인이 데이터 바인딩되어 실제 값이 출력된다
/// - 로딩 중 스켈레톤이 표시된다
/// - 신규 사용자도 기본값(Lv.1, XP 0, 코인 0)으로 정상 렌더된다
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with TabScrollRegistration {
  @override
  int get tabIndex => 0;

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);

    return Scaffold(
      body: SafeArea(
        child: userAsync.when(
          loading: () => const _HomeSkeleton(),
          error: (error, _) => ErrorView(
            message: error is AppFailure
                ? error.message
                : '화면을 불러오지 못했어요.',
            onRetry: () => ref.invalidate(sessionProvider),
          ),
          // 문서가 없는 신규 사용자도 저장소가 AppUser.initial을 흘리므로
          // 특수 분기 없이 이 경로로 Lv.1 / XP 0 / 코인 0이 렌더된다.
          data: (user) => _HomeContent(
            user: user,
            scrollController: scrollController,
          ),
        ),
      ),
    );
  }
}

class _HomeContent extends ConsumerWidget {
  const _HomeContent({required this.user, required this.scrollController});

  final AppUser user;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final pending = ref.watch(pendingQuestsProvider);

    return ListView(
      controller: scrollController,
      padding: AppSpacing.screenPadding,
      children: [
        Text('One-Step', style: theme.textTheme.headlineLarge),
        AppSpacing.gapXs,
        Text(
          '오늘도 한 걸음.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        AppSpacing.gapLg,

        CharacterCard(user: user),
        AppSpacing.gapLg,

        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: () => context.go('/quest'),
                icon: const Icon(Symbols.check_circle),
                label: const Text('오늘의 퀘스트'),
              ),
            ),
            AppSpacing.gapWMd,
            Expanded(
              // 환생은 4주차 기능이다. 눌러도 아무 일도 안 하는 버튼을 활성화해 두면
              // "준비 중"이라고 정직하게 말하는 플레이스홀더 탭보다 나쁘다 —
              // 사용자에게 거짓말을 하게 된다. 구현 전까지는 항상 비활성으로 둔다.
              child: Tooltip(
                message: '환생은 4주차에 열려요',
                child: OutlinedButton.icon(
                  onPressed: null,
                  icon: const Icon(Symbols.refresh),
                  label: Text('환생 (Lv.${user.level})'),
                ),
              ),
            ),
          ],
        ),
        AppSpacing.gapLg,

        Text('진행 중인 퀘스트', style: theme.textTheme.titleLarge),
        AppSpacing.gapMd,
        _PendingQuests(quests: pending),
      ],
    );
  }
}

class _PendingQuests extends StatelessWidget {
  const _PendingQuests({required this.quests});

  final AsyncValue<List<Quest>> quests;

  @override
  Widget build(BuildContext context) {
    return quests.when(
      loading: () => const Column(
        children: [
          SkeletonBox(height: 96),
          AppSpacing.gapSm,
          SkeletonBox(height: 96),
        ],
      ),
      error: (error, _) => ErrorView(
        message: error is AppFailure ? error.message : '퀘스트를 불러오지 못했어요.',
      ),
      data: (list) {
        if (list.isEmpty) {
          return const EmptyView(
            title: '진행 중인 퀘스트가 없어요',
            message: '큰 목표를 작은 퀘스트로 쪼개서 시작해 보세요.',
            emoji: '🌱',
          );
        }
        // 홈에서는 미리보기만. 전체 목록은 퀘스트 탭에 있다.
        final preview = list.take(2).toList();
        return Column(
          children: [
            for (final quest in preview) ...[
              QuestCard(quest: quest),
              AppSpacing.gapSm,
            ],
          ],
        );
      },
    );
  }
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: AppSpacing.screenPadding,
      children: const [
        SkeletonBox(width: 160, height: 40),
        AppSpacing.gapLg,
        SkeletonBox(height: 320, radius: AppRadius.lg),
        AppSpacing.gapLg,
        SkeletonBox(height: 52),
        AppSpacing.gapLg,
        SkeletonBox(height: 96),
      ],
    );
  }
}
