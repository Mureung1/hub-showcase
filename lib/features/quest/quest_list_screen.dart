import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/quest_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/quest.dart';
import '../../models/quest_group.dart';
import '../../models/quest_status.dart';
import '../../providers/providers.dart';
import '../shell/tab_scroll_registry.dart';
import 'widgets/goal_group_section.dart';
import 'widgets/quest_complete_dialog.dart';
import 'widgets/quest_memo_sheet.dart';

/// 퀘스트 목록 화면.
///
/// checklist 1주차:
/// - 퀘스트가 0개일 때 빈 상태 안내가 표시된다
/// - 여러 개일 때 스크롤되고 각 항목에 제목·난이도가 보인다
/// - **로딩·오류 상태가 각각 구분되어 표시된다** (스켈레톤 vs 에러 뷰)
class QuestListScreen extends ConsumerStatefulWidget {
  const QuestListScreen({super.key});

  @override
  ConsumerState<QuestListScreen> createState() => _QuestListScreenState();
}

class _QuestListScreenState extends ConsumerState<QuestListScreen>
    with TabScrollRegistration {
  @override
  int get tabIndex => 1;

  /// **저장소 요청이 실제로 날아가 있는** 퀘스트 ID. 카드의 진행 표시용.
  ///
  /// 지급 트랜잭션은 왕복이 있어 즉시 끝나지 않는다. 그동안 카드에 스피너를 띄운다.
  final Set<String> _completing = {};

  /// **완료 흐름이 진행 중인** 퀘스트 ID (메모 시트가 떠 있는 동안 포함).
  ///
  /// [_completing]과 나눈 이유: 시트는 사용자의 입력을 기다리는 동안 얼마든지
  /// 열려 있을 수 있는데, 그 시간 내내 카드에 스피너를 돌리면 "처리 중"이라는
  /// 거짓말이 된다(아직 아무 요청도 안 나갔다). 중복 실행 방지는 시트 단계부터
  /// 필요하고, 진행 표시는 요청 단계에만 필요하다 — 수명이 다르니 상태도 나눈다.
  final Set<String> _pending = {};

  /// 그룹별 펼침 상태 (키 = [QuestGroup.key]).
  ///
  /// 값이 정해지는 순간은 딱 두 번이다: **그 그룹을 처음 그릴 때**(기본값 계산)와
  /// **사용자가 헤더를 누를 때**. 그 뒤로는 스트림이 아무리 갱신돼도 건드리지 않는다.
  final Map<String, bool> _expanded = {};

  /// 기본 펼침. **전부 완료된 그룹만 기본 접힘**(끝난 목표가 진행 중인 목표를
  /// 밀어내지 않게).
  ///
  /// 기본값을 매 프레임 다시 계산하지 않고 처음 본 순간에 확정하는 이유:
  /// 퀘스트를 완료할 때마다 스트림이 갱신되는데, 그때마다 규칙을 다시 적용하면
  /// **마지막 퀘스트에 체크하는 순간 그룹이 눈앞에서 접혀 버린다.** 방금 누른
  /// 카드가 사라지는 건 완료의 보람이 아니라 사고처럼 보인다.
  bool _isExpanded(QuestGroup group) =>
      _expanded.putIfAbsent(group.key, () => !group.isAllDone);

  Future<void> _toggleDone(Quest quest, bool done) async {
    // 중복 실행 방지 — 이미 흐름을 타고 있는 퀘스트의 추가 탭은 무시한다.
    // (시트가 뜨기 전 한 프레임 사이의 연타도 여기서 걸린다.)
    if (_pending.contains(quest.id)) return;
    _pending.add(quest.id);

    // 아직 보상받지 않은 **첫 완료**에만 인증 메모를 묻는다.
    //
    // 시트를 먼저 띄우는 이유: 메모 유무가 지급액을 바꾸므로, 메모를 손에 쥔 채
    // completeQuest를 한 번 호출해야 완료·기본보상·보너스가 한 트랜잭션에 담긴다.
    // 완료 후에 물으면 보너스가 두 번째 트랜잭션이 되고 가드가 하나 더 필요해진다.
    //
    // 이미 보상받은 퀘스트(완료→해제 후 재완료)는 시트를 건너뛴다 — 보너스를 더 받을
    // 수 없으니 "오늘 어땠나요?"를 물어봐야 헛수고다. 대신 완료 처리 자체는 그대로
    // 흘려보낸다: completeQuest가 상태를 done으로 바꿔 체크·밑줄이 켜지고(시각 반영),
    // rewardedAt 가드가 코인만 재지급하지 않는다. 왜 축하가 없는지는 아래 사후 안내가 맡는다.
    QuestMemoResult? memoResult;
    if (done && !quest.isRewarded) {
      memoResult = await showQuestMemoSheet(context, questTitle: quest.title);

      // null = 취소(바깥 탭·뒤로가기). 실수로 체크한 경우이므로 **완료하지 않는다.**
      // 상태도 잔액도 건드리지 않고 진행 표시만 되돌린다.
      // (건너뛰기는 null이 아니라 skipped()라 여기 걸리지 않는다.)
      if (memoResult == null) {
        _pending.remove(quest.id);
        return;
      }
    }

    // 여기서부터 실제 요청이 나간다 — 이제야 카드에 진행 표시를 켠다.
    if (mounted) setState(() => _completing.add(quest.id));

    Reward? reward;
    try {
      // sessionProvider는 로그인 완료된 uid를 보장한다.
      // currentUidProvider를 read하면 AsyncLoading이라 uid가 null로 나온다.
      final uid = await ref.read(sessionProvider.future);
      final repo = ref.read(questRepositoryProvider);

      if (done) {
        // 완료: 상태 변경 + 메모·사진 저장 + 코인·XP(+인증 보너스) 지급 + 성취
        // 기록이 한 트랜잭션으로 처리된다. 인증은 메모 또는 사진 중 하나만 있어도
        // 성립한다. 이미 보상을 받은 퀘스트면 null이 돌아온다(재지급 없음).
        reward = await repo.completeQuest(
          uid,
          quest.id,
          memo: memoResult?.memo,
          photoBase64: memoResult?.photoBase64,
        );
      } else {
        // 완료 해제: 상태만 되돌린다. 지급 이력(rewardedAt)은 해제해도 남으므로,
        // 다시 완료해도 보상은 재지급되지 않는다.
        await repo.setStatus(uid, quest.id, QuestStatus.todo);
      }
    } on AppFailure catch (failure) {
      // 트랜잭션이 커밋되지 않았으므로 서버 상태는 그대로다(자동 롤백).
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
      return;
    } finally {
      // 성공·실패 모두 진행 표시와 중복 방지 잠금을 반드시 해제한다.
      _pending.remove(quest.id);
      if (mounted) setState(() => _completing.remove(quest.id));
    }

    if (!mounted) return;

    // 여기 도달했으면 성공 경로다(실패는 catch에서 이미 return). reward가 null인
    // 경우는 두 갈래이고, 둘을 반드시 구분한다:
    //   (a) done == true  + reward == null  → 완료를 눌렀는데 지급이 없었다
    //       = 이미 보상 받은 퀘스트(재완료). 상태는 done으로 바뀌어(체크·밑줄 켜짐)
    //         completeQuest가 정상 처리했지만, rewardedAt 가드가 코인을 재지급하지 않았다.
    //         무반응이 아니라 왜 축하가 없는지를 스낵바로 알린다.
    //   (b) done == false + reward == null  → 완료 해제. 원래 지급이 없는 동작이니
    //       조용히 통과한다(안내를 띄우면 오히려 오탐이다).
    // 축하 다이얼로그와 이 안내는 상호배타 — reward가 있으면 축하, 없으면 여기서 끝.
    if (reward == null) {
      if (done) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('이미 완료한 퀘스트예요')));
      }
      return;
    }
    await showQuestCompleteDialog(
      context,
      questTitle: quest.title,
      reward: reward,
      // 보너스 포함 여부는 지급한 쪽이 안다. reward 총액에서 역산하지 않는다.
      verified: memoResult?.isVerified ?? false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // 목표(폴더) 단위로 묶인 목록. 목표를 못 읽어도 퀘스트는 폴백 라벨로 뜬다
    // (questGroupsProvider가 goal 스트림의 실패를 삼킨다).
    final groupsAsync = ref.watch(questGroupsProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/quest/new'),
        icon: const Icon(Symbols.add),
        label: const Text('퀘스트 등록'),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenH,
                AppSpacing.md,
                AppSpacing.screenH,
                AppSpacing.sm,
              ),
              child: Text('오늘의 퀘스트', style: theme.textTheme.headlineLarge),
            ),
            // AI 분해 진입점. plan.md의 2대 핵심 기능 중 하나로 들어가는 문이라
            // 아웃라인이 아니라 **채운 버튼**으로 위계를 올렸다. 색은 블루 유지 —
            // 그린으로 바꾸면 수동 등록 FAB(그린)와 역할이 겹친다.
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenH,
                0,
                AppSpacing.screenH,
                AppSpacing.sm,
              ),
              child: FilledButton.icon(
                onPressed: () => context.go('/quest/split'),
                style: FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.secondary,
                  foregroundColor: theme.colorScheme.onSecondary,
                  minimumSize: const Size.fromHeight(48),
                ),
                icon: const Icon(Symbols.auto_awesome),
                label: const Text('AI로 목표 나누기'),
              ),
            ),
            Expanded(
              child: groupsAsync.when(
                // 로딩: 스켈레톤 카드 3장.
                loading: () => ListView(
                  padding: AppSpacing.screenPadding,
                  children: const [
                    SkeletonBox(height: 120),
                    AppSpacing.gapSm,
                    SkeletonBox(height: 120),
                    AppSpacing.gapSm,
                    SkeletonBox(height: 120),
                  ],
                ),
                // 오류: 빈 상태와 시각적으로 확실히 다르다(에러 색 + 경고 아이콘 + 재시도).
                error: (error, _) => ErrorView(
                  message: error is AppFailure
                      ? error.message
                      : '퀘스트를 불러오지 못했어요.',
                  onRetry: () => ref.invalidate(questListProvider),
                ),
                data: (groups) {
                  if (groups.isEmpty) {
                    return EmptyView(
                      title: '아직 퀘스트가 없어요',
                      message: '큰 목표를 작은 퀘스트로 쪼개면\n오늘 당장 시작할 수 있어요.',
                      emoji: '🪺',
                      actionLabel: '퀘스트 등록하기',
                      onAction: () => context.go('/quest/new'),
                    );
                  }

                  // scrollController는 탭 재선택 시 목록 최상단 복귀에 쓰인다.
                  // 그룹 단위로 바뀌어도 반드시 유지한다.
                  return ListView.builder(
                    controller: scrollController,
                    padding: AppSpacing.screenPadding,
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
                          questBuilder: (context, quest) => QuestCard(
                            quest: quest,
                            isCompleting: _completing.contains(quest.id),
                            onToggleDone: (done) => _toggleDone(quest, done),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
