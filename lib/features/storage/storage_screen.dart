import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/constants/empty_art.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/proof_image_picker.dart';
import '../../core/widgets/quest_card.dart';
import '../../core/widgets/screen_title.dart';
import '../../core/widgets/stat_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/quest.dart';
import '../../models/quest_group.dart';
import '../../providers/providers.dart';
import '../quest/widgets/goal_group_section.dart';
import '../shell/tab_scroll_registry.dart';
import 'widgets/achievement_detail_sheet.dart';

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
///
/// 정본은 Redesign 페이지 `45:329`다. AppBar(`45:330`, **코인 pill 없음**) · 리드
/// 텍스트 · StatCard 2장(`45:334`) · 펼친 그룹(`45:347`)과 접힌 그룹(`45:376`) 순이고,
/// 블록 사이 간격은 20 일괄이다.
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

  /// 보관함 카드 탭 → 완료 당시 정보(메모·사진·보상) 상세 시트. 메모·사진 편집 가능.
  ///
  /// 조회·저장·픽업 클로저를 시트에 주입한다 — 시트는 uid·저장소·image_picker를
  /// 모른다(경계 유지). proof는 목록에서 미리 읽지 않고 **이 시트를 열 때** 그 하나만
  /// 읽는다(proofDoc이 questId당 별도라 목록에서 N번 읽으면 비싸다 — 3주차 문서 분리).
  ///
  /// **정책 구분.** 여기서 여는 편집은 **보관함 기록**의 메모·사진이고 보상 경제를
  /// 건드리지 않는다. B-5b가 막은 것은 **오늘의 퀘스트 목록**의 제목·난이도 수정
  /// (재완료 보상 유효화 차단)이라 별개다 — 시트 문서 참고.
  Future<void> _openDetail(Quest quest) {
    return showAchievementDetailSheet(
      context,
      quest: quest,
      loadProof: () async {
        // sessionProvider는 로그인 완료된 uid를 보장한다.
        final uid = await ref.read(sessionProvider.future);
        return ref.read(questRepositoryProvider).fetchProof(uid, quest.id);
      },
      // 메모만 바꿔 updateQuest로 반영한다(상태·지급 이력·난이도 불변).
      onSaveMemo: (memo) async {
        final uid = await ref.read(sessionProvider.future);
        await ref
            .read(questRepositoryProvider)
            .updateQuest(uid, _questWithMemo(quest, memo));
      },
      // 사진만 독립 갱신한다 — updateProof는 완료·보상 트랜잭션과 무관하다.
      onSavePhoto: (base64) async {
        final uid = await ref.read(sessionProvider.future);
        await ref
            .read(questRepositoryProvider)
            .updateProof(uid, quest.id, base64);
      },
      pickImage: pickCompressedProofImage,
    );
  }

  /// 메모만 바꾼 퀘스트를 만든다.
  ///
  /// `copyWith`은 null 병합이라 메모를 **지우지** 못한다(`memo: null` → 기존값 유지).
  /// 보관함 편집은 메모 비우기(=null)를 지원해야 하므로 전체 필드를 그대로 옮기며
  /// memo만 교체한다. 상태·지급 이력(`rewardedAt`)·난이도·보관 여부는 불변이다 —
  /// 보상 경제를 건드리지 않는 순수 메모 갱신이다.
  Quest _questWithMemo(Quest q, String? memo) => Quest(
    id: q.id,
    title: q.title,
    difficulty: q.difficulty,
    status: q.status,
    deadline: q.deadline,
    order: q.order,
    goalId: q.goalId,
    parentQuestId: q.parentQuestId,
    createdAt: q.createdAt,
    completedAt: q.completedAt,
    rewardedAt: q.rewardedAt,
    memo: memo,
    archived: q.archived,
  );

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
              // 정본 AppBar(`45:330`)에는 **코인 pill이 없다** — 상점·홈·퀘스트
              // 목록과 다르다. 보관함에서 할 수 있는 일이 "보기"뿐이라 잔액이
              // 판단에 쓰이지 않는다. 지금 코드도 이미 그렇다(변경 없음).
              // 제목 크기는 5탭 공통([ScreenTitle]) — 상점에 맞춘 사용자 결정이다.
              // `leadingMark`는 5탭에만 켠다(→ `ScreenTitle.leadingMark`).
              const ScreenTitle('보관함', leadingMark: true),
              // 정본 실측: AppBar 아래 패딩 8 + Content 위 패딩 8 = 16.
              AppSpacing.gapMd,
              Text(
                '끝낸 도전을 모아 뒀어요.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              // 정본 Content는 블록 사이 간격이 20 일괄이다(리드 y8~32 · Stats y52).
              AppSpacing.gapBlock,
              _SummaryCard(completedCount: completedCount, streak: streak),
            ],
          ),
        ),
        // Stats y52~130 · 첫 그룹 y150 → 20.
        AppSpacing.gapBlock,
        Expanded(
          child: groups.isEmpty
              ? const EmptyView(
                  title: '아직 끝낸 도전이 없어요',
                  message: '퀘스트를 완료하면 여기로 하나씩 옮겨져요.',
                  emoji: '🗂️',
                  asset: EmptyArt.storage,
                )
              : ListView.builder(
                  controller: scrollController,
                  // 위 간격은 바깥 [AppSpacing.gapBlock]이 이미 줬다. 아래는
                  // 탭바에 마지막 카드가 가리지 않게 넉넉히(정본 Content pb 32).
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenH,
                    0,
                    AppSpacing.screenH,
                    AppSpacing.xl,
                  ),
                  itemCount: groups.length,
                  itemBuilder: (context, index) {
                    final group = groups[index];
                    return Padding(
                      // 그룹 사이 20 (정본: 첫 그룹 y150~644 · 둘째 y664).
                      padding: const EdgeInsets.only(
                        bottom: AppSpacing.screenH,
                      ),
                      child: GoalGroupSection(
                        group: group,
                        expanded: _isExpanded(group),
                        onToggleExpanded: () => setState(() {
                          _expanded[group.key] = !_isExpanded(group);
                        }),
                        // 보관함 정본(`45:347`·`45:376`)에는 진행바가 없다 —
                        // 여기 그룹은 전부 100%라 꽉 찬 막대가 정보를 주지 않는다.
                        showProgress: false,
                        // 보기 전용 카드 — 완료 토글도 `⋮` 메뉴도 없다. 보관함은
                        // 끝낸 일을 되돌리지 않으므로 상호작용을 걷어낸다. 탭하면
                        // 완료 당시 메모·사진·보상을 보는 상세 시트만 연다(수정 없음).
                        questBuilder: (context, node) => QuestCard(
                          quest: node.quest,
                          onTap: () => _openDetail(node.quest),
                        ),
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
/// 홈·MY와 **같은 [StatCard]** 를 쓴다(예전에는 화면마다 따로 그려 셋의 생김새가
/// 조금씩 어긋나 있었다).
///
/// 색: 완료 수는 성장(그린), 연속 일수는 🟡 노랑이다. 스트릭을 홈에서만 노랑으로
/// 쓰고 여기서는 중립으로 두던 예전 판단을 접었다 — 같은 수치가 화면마다 다른 색을
/// 입으면 "노랑 = 보상"이라는 신호 자체가 약해진다(사용자 결정).
class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.completedCount, required this.streak});

  final int completedCount;
  final int streak;

  @override
  Widget build(BuildContext context) {
    return StatCardRow(
      cards: [
        StatCard(
          icon: Symbols.check_circle,
          label: '완료',
          value: '$completedCount',
        ),
        StatCard(
          icon: Symbols.local_fire_department,
          label: '연속 일수',
          value: '$streak',
          // 정본 실측 값은 `5일`이다. '일'은 한글이라 수치 서체(Sora)에 넣을 수
          // 없어 단위로 따로 넘긴다(홈 stat과 같은 방식).
          suffix: '일',
          accent: StatAccent.reward,
        ),
      ],
    );
  }
}

class _StorageSkeleton extends StatelessWidget {
  const _StorageSkeleton();

  @override
  Widget build(BuildContext context) {
    // 실루엣은 실제 화면과 같은 리듬이다 — 제목 28 → 리드 24 → stat 줄 80 →
    // 그룹 카드. 블록 사이 간격은 본문과 같은 20([AppSpacing.gapBlock]).
    return ListView(
      padding: AppSpacing.screenPadding,
      children: const [
        SkeletonBox(width: 120, height: 28),
        AppSpacing.gapMd,
        SkeletonBox(width: 200, height: 24),
        AppSpacing.gapBlock,
        SkeletonBox(height: 80, radius: AppRadius.md),
        AppSpacing.gapBlock,
        SkeletonBox(height: 200, radius: AppRadius.md),
        AppSpacing.gapBlock,
        SkeletonBox(height: 74, radius: AppRadius.md),
      ],
    );
  }
}
