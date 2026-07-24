import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/constants/reward_rules.dart';
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
import 'widgets/streak_bonus_dialog.dart';

/// 7일 보너스 축하를 **이번 세션에 이미 띄웠는가.**
///
/// 홈 위젯의 필드가 아니라 provider인 이유: 탭을 오가면 홈 State가 새로 만들어질
/// 수 있어 위젯 안에 둔 플래그는 그때 초기화된다. ProviderScope는 앱 실행 동안
/// 살아 있으므로 "앱 실행당 한 번"이라는 뜻이 그대로 유지된다.
/// (전역 static이 아닌 이유는 테스트마다 새 ProviderScope가 깨끗하게 시작되게
///  하기 위해서다.)
final streakBonusShownProvider = StateProvider<bool>((ref) => false);

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

  /// 7일 보너스 축하를 띄운다. **앱 실행당 한 번만.**
  ///
  /// 타이밍: `ref.listen` 콜백은 build 도중(위젯 트리가 잠긴 상태)에 불릴 수 있어
  /// 여기서 곧장 `showDialog`를 호출하면 Navigator를 빌드 중에 건드리게 된다.
  /// 그래서 항상 **다음 프레임**으로 미룬다.
  ///
  /// 그 사이에 화면이 사라졌을 수 있으므로 프레임이 돌아온 뒤 다시 확인한다:
  /// - `mounted` — 탭을 옮겨 dispose된 홈이 모달을 띄우면 안 된다.
  /// - `route.isCurrent` — 전환 중이거나 다른 다이얼로그/시트가 위에 있으면 건너뛴다.
  ///   축하가 다른 모달을 덮거나 사라지는 화면 위에 뜨는 편보다, 이번 한 번을
  ///   조용히 넘기는 편이 낫다(보상은 이미 지급됐고 잔액·연속 일수는 캐릭터
  ///   카드에 그대로 반영된다).
  void _showStreakBonus({required int streak, required Reward bonus}) {
    // 세션 가드는 스케줄 시점에 잠근다. 지급 가드(streakBonusDate)는 서버 쪽
    // 재지급만 막을 뿐이라, 탭을 오갔다 홈으로 돌아왔을 때 축하가 다시 뜨는 것은
    // 화면이 따로 막아야 한다.
    if (ref.read(streakBonusShownProvider)) return;
    ref.read(streakBonusShownProvider.notifier).state = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final route = ModalRoute.of(context);
      if (route == null || !route.isCurrent) return;
      showStreakBonusDialog(context, streak: streak, bonus: bonus);
    });
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);

    // 출석 기록을 시작시키는 지점이자, 7일 보너스를 알리는 지점이다.
    //
    // watch가 아니라 listen인 이유: 출석 결과는 화면을 다시 그릴 이유가 없다
    // (연속 일수는 사용자 문서 스트림을 타고 캐릭터 카드로 들어온다).
    // 여기서 필요한 건 "보너스가 나갔다"는 1회성 사건뿐이다.
    //
    // 실패는 무시한다 — 출석 쓰기가 실패해도 앱은 정상 동작해야 하고,
    // 사용자가 할 수 있는 조치도 없다(내일 다시 시도된다).
    ref.listen(attendanceProvider, (previous, next) {
      final result = next.valueOrNull;
      final bonus = result?.bonus;
      if (result == null || bonus == null) return;
      // 연속 일수는 지급 결과가 들고 있는 값을 그대로 쓴다 — 화면이 세지 않는다.
      _showStreakBonus(streak: result.streak, bonus: bonus);
    });

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

/// 홈 미리보기에 띄우는 퀘스트 개수. 스켈레톤 개수도 이 값에 맞춘다.
const int _previewCount = 3;

class _PendingQuests extends StatelessWidget {
  const _PendingQuests({required this.quests});

  final AsyncValue<List<Quest>> quests;

  @override
  Widget build(BuildContext context) {
    return quests.when(
      // 스켈레톤 개수는 데이터가 들어왔을 때의 최대 개수(_previewCount)와 맞춘다.
      // 개수가 어긋나면 로딩 → 데이터 전환에서 목록 높이가 튄다.
      loading: () => const Column(
        children: [
          SkeletonBox(height: 96),
          AppSpacing.gapSm,
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
        // 순서는 pendingQuestsProvider가 정한다(최신 등록순) — 여기서 다시
        // 정렬하지 않는다. 화면이 하는 일은 개수를 자르는 것뿐이다.
        final preview = list.take(_previewCount).toList();
        return Column(
          children: [
            for (final quest in preview) ...[
              // 홈 미리보기 카드는 완료 토글 없이 보기 전용이다. 탭하면 개별 상세가
              // 아니라 **오늘의 퀘스트 탭**으로 전환한다 — 전체 목록에서 완료·관리한다
              // ("오늘의 퀘스트" 버튼과 같은 목적지).
              QuestCard(
                quest: quest,
                onTap: () => context.go('/quest'),
              ),
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
