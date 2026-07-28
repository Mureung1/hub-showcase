import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/constants/empty_art.dart';
import '../../core/constants/growth_rules.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/coin_pill.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/quest_card.dart';
import '../../core/widgets/screen_title.dart';
import '../../core/widgets/stat_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/app_user.dart';
import '../../models/quest.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';
import 'widgets/character_card.dart';
import 'widgets/rebirth_dialog.dart';
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
            message: error is AppFailure ? error.message : '화면을 불러오지 못했어요.',
            onRetry: () => ref.invalidate(sessionProvider),
          ),
          // 문서가 없는 신규 사용자도 저장소가 AppUser.initial을 흘리므로
          // 특수 분기 없이 이 경로로 Lv.1 / XP 0 / 코인 0이 렌더된다.
          data: (user) =>
              _HomeContent(user: user, scrollController: scrollController),
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
    final pending = ref.watch(pendingQuestsProvider);

    // **목록 자체에는 좌우 여백이 없다.** 캐릭터 히어로가 화면 폭을 꽉 채워야 해서
    // (full-bleed) 공통 패딩을 걷고, 여백이 필요한 항목마다 스스로 패딩을 준다.
    // 하단 여백만 남긴다 — 탭바에 마지막 카드가 가리지 않게.
    //
    // **순서는 성장 → 보유 → 행동이다.**
    // 히어로(캐릭터) → 경험치 → 환생 → 통계(코인·연속) → 오늘의 퀘스트 → 미리보기.
    // 두 액션 버튼을 한 덩어리로 쌓지 않고 **쪼갠** 이유: 환생은 Lv.50 도달이 조건이라
    // 경험치 바로 아래에 있어야 "이 게이지를 다 채우면 열린다"가 한눈에 읽힌다.
    // 「오늘의 퀘스트」는 그 아래 미리보기 목록으로 이어지는 자리에 둔다.
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      children: [
        _HomeAppBar(coin: user.coin),

        // 히어로(이름·레벨·환생 훈장은 그 안 오버레이) + 경험치.
        // 여백 처리는 이 위젯이 안다.
        CharacterCard(user: user),
        AppSpacing.gapBlock,

        Padding(
          padding: AppSpacing.screenHorizontal,
          child: _RebirthButton(user: user),
        ),
        AppSpacing.gapBlock,

        Padding(
          padding: AppSpacing.screenHorizontal,
          child: _HomeStats(user: user),
        ),
        AppSpacing.gapBlock,

        Padding(
          padding: AppSpacing.screenHorizontal,
          child: GradientButton(
            onPressed: () => context.go('/quest'),
            icon: Symbols.check,
            label: '오늘의 퀘스트',
          ),
        ),
        AppSpacing.gapBlock,

        const Padding(
          padding: AppSpacing.screenHorizontal,
          child: _PendingSectionHeader(),
        ),
        AppSpacing.gapBlock,

        Padding(
          padding: AppSpacing.screenHorizontal,
          child: _PendingQuests(quests: pending),
        ),
      ],
    );
  }
}

/// 상단 바 — 인사말 + 코인 잔액.
///
/// `AppBar` 위젯이 아니라 스크롤되는 첫 항목이다. 아래 히어로가 화면 폭을 꽉 채우며
/// 위로 맞물려야 해서, 고정 헤더를 두면 그 경계가 두 겹으로 보인다.
class _HomeAppBar extends StatelessWidget {
  const _HomeAppBar({required this.coin});

  final int coin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenH,
        vertical: AppSpacing.md,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 인사말이 길어지거나 배율이 커져도 코인 pill을 밀어내지 않게 접는다.
          // 크기는 5탭 공통([ScreenTitle]) — 상점에 맞춘 사용자 결정이다.
          const Flexible(child: ScreenTitle('오늘도 한 걸음.')),
          AppSpacing.gapWSm,
          CoinPill(amount: coin, compact: true),
        ],
      ),
    );
  }
}

/// 코인 · 연속 출석 2분할 통계.
///
/// 둘 다 보상 경제의 수치라 🟡 노랑 계열이다([StatAccent.reward]). 노랑에 직접
/// 닿는 것은 [StatCard] 하나뿐이라 이 화면은 색 역할 규칙을 신경 쓸 것이 없다.
class _HomeStats extends StatelessWidget {
  const _HomeStats({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return StatCardRow(
      cards: [
        StatCard(
          icon: Symbols.monetization_on,
          label: '코인',
          value: _formatThousands(user.coin),
          accent: StatAccent.reward,
        ),
        StatCard(
          icon: Symbols.local_fire_department,
          label: '연속',
          value: '${user.streak}',
          // '일'은 한글이라 수치 서체(Sora)에 넣을 수 없다 — 단위로 따로 넘긴다.
          suffix: '일',
          accent: StatAccent.reward,
        ),
      ],
    );
  }
}

/// 1,240 처럼 천 단위 구분.
String _formatThousands(int value) {
  final digits = value.abs().toString();
  final buffer = StringBuffer(value < 0 ? '-' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}

/// 「진행 중인 퀘스트」 + 「전체 보기」.
class _PendingSectionHeader extends StatelessWidget {
  const _PendingSectionHeader();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(child: Text('진행 중인 퀘스트', style: theme.textTheme.titleLarge)),
        // 홈은 미리보기 3개뿐이다. 전체 목록은 퀘스트 탭에 있다는 걸 알려 주는
        // 링크 — 「오늘의 퀘스트」 버튼과 같은 목적지다.
        TextButton(
          onPressed: () => context.go('/quest'),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          ),
          child: const Text('전체 보기'),
        ),
      ],
    );
  }
}

/// 환생 버튼 + 실행 흐름.
///
/// **잠김과 열림이 서로 다른 버튼이다.**
/// - **잠김(Lv.50 미만)**: 정본(Figma `65:455`) 그대로 평평한 중립 버튼 —
///   배경 `surfaceContainer` · 글자 `outline` · ↻ 아이콘 · 「환생 (Lv.50 도달 시)」.
/// - **열림(Lv.50 도달)**: 🔵 **블루 그라디언트**([GradientButtonStyle.rebirth]).
///   정본에는 비활성 상태만 그려져 있어 활성 형태는 사용자 결정(2026-07-29)이다.
///   같은 화면의 그린 「오늘의 퀘스트」(주요 행동)와 색으로 갈리고, 잠겨 있던 회색
///   판이 색을 얻는 것 자체가 "이제 누를 수 있다"는 신호가 된다.
///
/// 상태(중복 방지 잠금)를 들어야 해서 별도 `ConsumerStatefulWidget`으로 뺐다.
/// - **탭**: 확인 다이얼로그 → `rebirth()` → 성공 시 환생 연출. 각 단계 사이에
///   `mounted`를 확인하고, `_busy`로 중복 실행을 막는다(완료 흐름과 같은 패턴).
class _RebirthButton extends ConsumerStatefulWidget {
  const _RebirthButton({required this.user});

  final AppUser user;

  @override
  ConsumerState<_RebirthButton> createState() => _RebirthButtonState();
}

class _RebirthButtonState extends ConsumerState<_RebirthButton> {
  /// 중복 실행 방지 잠금. 확인~연출 사이에 버튼을 다시 눌러도 두 번 돌지 않는다.
  bool _busy = false;

  Future<void> _onPressed() async {
    final user = widget.user;
    // 화면 가드 — 저장소도 마지막 방어선으로 한 번 더 막지만, 눌리지 않게 먼저 막는다.
    if (_busy || !user.canRebirth) return;

    final confirmed = await showRebirthConfirmDialog(context);
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    // 연출에 쓸 환생 후 횟수는 지금 값에서 +1이다(스트림 갱신을 기다리지 않는다).
    final newRebirth = user.rebirth + 1;
    try {
      await ref.read(userRepositoryProvider).rebirth(user.uid);
    } on AppFailure catch (failure) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
      return;
    } finally {
      // 성공·실패 모두 잠금을 반드시 해제한다.
      if (mounted) setState(() => _busy = false);
    }

    if (!mounted) return;
    await showRebirthCelebrationDialog(context, newRebirth: newRebirth);
  }

  @override
  Widget build(BuildContext context) {
    final unlocked = widget.user.canRebirth;

    return Tooltip(
      message: unlocked ? '환생해서 새로 시작해요' : 'Lv.$kMaxLevel에 도달하면 환생할 수 있어요',
      child: unlocked ? _unlocked() : const _RebirthLockedButton(),
    );
  }

  /// 열린 환생 — 블루 그라디언트. 진행 중 표시(스피너)와 중복 탭 차단은
  /// [GradientButton.busy]가 맡는다(주 버튼과 같은 처리라 따로 짜지 않는다).
  Widget _unlocked() => GradientButton(
    onPressed: _onPressed,
    icon: Symbols.refresh,
    label: '환생',
    style: GradientButtonStyle.rebirth,
    busy: _busy,
  );
}

/// 잠긴 환생 — 정본 `65:455`의 Disabled 상태 그대로.
///
/// `FilledButton.icon`이 아니라 **평범한 `FilledButton` + 직접 짠 Row**다.
/// `.icon` 팩토리는 비공개 하위 타입(`_FilledButtonWithIcon`)을 돌려주는데,
/// `find.byType`은 정확한 런타임 타입만 보므로 테스트에서 집히지 않는다.
class _RebirthLockedButton extends StatelessWidget {
  const _RebirthLockedButton();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return FilledButton(
      // 항상 잠겨 있다 — 열리는 순간 위 [_RebirthButtonState]가 그라디언트 버튼으로
      // 갈아 끼우므로, 이 위젯이 눌리는 경우는 없다.
      onPressed: null,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(GradientButton.minHeight),
        disabledBackgroundColor: scheme.surfaceContainer,
        disabledForegroundColor: scheme.outline,
        elevation: 0,
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Symbols.refresh, size: 20),
          AppSpacing.gapWSm,
          // **현재 레벨**을 되뇌는 대신 열리는 조건을 말한다.
          // 긴 라벨·큰 배율에서 넘치지 않게 접을 수 있게 둔다.
          Flexible(
            child: Text('환생 (Lv.$kMaxLevel 도달 시)', textAlign: TextAlign.center),
          ),
        ],
      ),
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
          SkeletonBox(height: 128),
          AppSpacing.gapSmd,
          SkeletonBox(height: 128),
          AppSpacing.gapSmd,
          SkeletonBox(height: 128),
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
            asset: EmptyArt.home,
          );
        }
        // 홈에서는 미리보기만. 전체 목록은 퀘스트 탭에 있다.
        // 순서는 pendingQuestsProvider가 정한다(최신 등록순) — 여기서 다시
        // 정렬하지 않는다. 화면이 하는 일은 개수를 자르는 것뿐이다.
        final preview = list.take(_previewCount).toList();
        return Column(
          children: [
            for (var i = 0; i < preview.length; i++) ...[
              if (i > 0) AppSpacing.gapSmd,
              // 홈 미리보기 카드는 완료 토글 없이 보기 전용이다. 탭하면 개별 상세가
              // 아니라 **오늘의 퀘스트 탭**으로 전환한다 — 전체 목록에서 완료·관리한다
              // ("오늘의 퀘스트" 버튼과 같은 목적지).
              QuestCard(quest: preview[i], onTap: () => context.go('/quest')),
            ],
          ],
        );
      },
    );
  }
}

/// 로딩 스켈레톤 — 실제 본문과 **같은 실루엣**이다(히어로는 여백 없이 꽉 차고,
/// 나머지는 좌우 20dp 안에 든다). 실루엣이 어긋나면 로딩 → 데이터 전환에서
/// 화면이 통째로 튄다.
class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      children: const [
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: AppSpacing.screenH,
            vertical: AppSpacing.md,
          ),
          child: SkeletonBox(width: 180, height: 28),
        ),
        // 히어로(이름·레벨은 그 안이라 별도 블록이 없다) → 경험치 → 환생 →
        // 통계 → 오늘의 퀘스트. 본문과 같은 순서·같은 높이다.
        SkeletonBox(height: CharacterHero.height, radius: AppRadius.lg),
        AppSpacing.gapBlock,
        Padding(
          padding: AppSpacing.screenHorizontal,
          child: SkeletonBox(height: 36),
        ),
        AppSpacing.gapBlock,
        Padding(
          padding: AppSpacing.screenHorizontal,
          child: SkeletonBox(height: GradientButton.minHeight),
        ),
        AppSpacing.gapBlock,
        Padding(
          padding: AppSpacing.screenHorizontal,
          child: SkeletonBox(height: 120),
        ),
        AppSpacing.gapBlock,
        Padding(
          padding: AppSpacing.screenHorizontal,
          child: SkeletonBox(height: GradientButton.minHeight),
        ),
      ],
    );
  }
}
