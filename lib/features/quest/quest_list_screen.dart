import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/analytics/analytics_logger.dart';
import '../../core/constants/empty_art.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/coin_pill.dart';
import '../../core/widgets/quest_actions_menu.dart';
import '../../core/widgets/quest_card.dart';
import '../../core/widgets/state_views.dart';
import '../../models/analytics_event.dart';
import '../../models/quest.dart';
import '../../models/quest_group.dart';
import '../../models/quest_status.dart';
import '../../providers/providers.dart';
import '../../repositories/quest_repository.dart';
import '../home/widgets/evolve_dialog.dart';
import '../home/widgets/level_up_dialog.dart';
import '../shell/tab_scroll_registry.dart';
import 'decompose_notifier.dart';
import 'widgets/ai_promo_card.dart';
import 'widgets/goal_complete_dialog.dart';
import 'widgets/goal_group_section.dart';
import 'widgets/quest_complete_dialog.dart';
import 'widgets/quest_delete_dialog.dart';
import 'widgets/quest_edit_dialog.dart';
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

  Future<void> _toggleDone(Quest quest, bool done, QuestGroup group) async {
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

    CompleteResult? result;
    // 이번 완료로 목표(폴더)가 통째로 보관됐는가. 완수 연출의 트리거다.
    var goalCompleted = false;
    try {
      // sessionProvider는 로그인 완료된 uid를 보장한다.
      // currentUidProvider를 read하면 AsyncLoading이라 uid가 null로 나온다.
      final uid = await ref.read(sessionProvider.future);
      final repo = ref.read(questRepositoryProvider);

      if (done) {
        // 완료: 상태 변경 + 메모·사진 저장 + 코인·XP(+인증 보너스) 지급 + 성취
        // 기록이 한 트랜잭션으로 처리된다. 인증은 메모 또는 사진 중 하나만 있어도
        // 성립한다. 이미 보상을 받은 퀘스트면 null이 돌아온다(재지급 없음).
        // 지급됐다면 실지급액 + 레벨/진화 변화가 함께 담긴 결과가 온다.
        result = await repo.completeQuest(
          uid,
          quest.id,
          memo: memoResult?.memo,
          photoBase64: memoResult?.photoBase64,
        );
        // 실제 지급이 일어난 순간에만 계측한다 — 재완료(result == null)는 로그하지
        // 않아 「도전 시작률」의 분자가 부풀려지지 않는다(rewardedAt 가드와 정합).
        // 트랜잭션 밖·성공 경로다.
        if (result != null) {
          ref.logEvent(
            uid,
            AnalyticsEvent.questCompleted(at: DateTime.now(), questId: quest.id),
          );
        }

        // ── 완료 = 보관함으로 이동 (2단계) ──
        // 지급 트랜잭션이 **성공한 뒤 별도 쓰기**로 처리한다. 지급 경로
        // (completeQuest)에는 손대지 않는다 — 보관 실패가 지급을 롤백하거나 그 반대가
        // 되면 안 된다(계측 로그를 트랜잭션 밖에 두는 것과 같은 원칙).
        //
        // 무엇을 자동완료·보관할지는 순수 함수([resolveArchiveOnComplete])가 정한다.
        // 목록은 보관된 것까지 포함한 전체를 넘긴다 — 직접 등록 재분해에서 먼저 완료돼
        // 이미 보관된 자식도 원본 자동완료 판정의 근거다. 방금 완료한 quest는 스트림
        // 반영이 한 프레임 늦을 수 있으나, 함수가 completedQuestId를 done으로 간주하므로
        // 판정이 어긋나지 않는다.
        final all = ref.read(questListProvider).valueOrNull;
        if (all != null) {
          final plan = resolveArchiveOnComplete(all, quest.id);
          // 재분해 원본 자동완료 — 자식을 다 끝낸 stuck 원본을 done으로 민다.
          // **보상 없이** setStatus로만 처리한다(자식 완료로 이미 지급됐다).
          for (final id in plan.autoCompleteIds) {
            await repo.setStatus(uid, id, QuestStatus.done);
          }
          // 완료된 낱개(직접 등록) 또는 목표 폴더 전체를 원자적으로 보관한다.
          await repo.archiveQuests(uid, plan.archiveIds);
          goalCompleted = plan.goalCompleted;
        }
      } else {
        // 완료 해제: 상태만 되돌린다. 지급 이력(rewardedAt)은 해제해도 남으므로,
        // 다시 완료해도 보상은 재지급되지 않는다.
        await repo.setStatus(uid, quest.id, QuestStatus.todo);
      }
    } on AppFailure catch (failure) {
      // 트랜잭션이 커밋되지 않았으므로 서버 상태는 그대로다(자동 롤백). 보관 쓰기가
      // 실패한 경우엔 보상은 이미 지급됐고 퀘스트만 오늘 목록에 done인 채 남는다 —
      // 다음 완료·재실행에서 다시 보관을 시도할 수 있어 데이터 손실은 없다.
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

    // result가 null인 경우는 두 갈래다:
    //   (a) done == true  + result == null  → 재완료(이미 보상 받음). 목표를 이번에
    //       완수했다면 스낵바 대신 완수 연출로 축하한다(아래 goalCompleted 분기).
    //       완수가 아니면 "왜 축하가 없는지"를 스낵바로 알린다.
    //   (b) done == false + result == null  → 완료 해제. 원래 지급이 없는 동작이니
    //       조용히 통과한다.
    if (result != null) {
      // 완료 → (레벨업) → 진화 순으로 이어 띄운다. 각 단계는 await로 순차 진행되고,
      // 사이마다 mounted를 확인해 연출 도중 화면을 떠나도 크래시가 없다(기존 패턴).
      // 표시값은 전부 저장소가 준 결과 그대로다 — 화면이 재계산하지 않는다.
      await showQuestCompleteDialog(
        context,
        questTitle: quest.title,
        reward: result.reward,
        // 보너스 포함 여부·절삭액은 지급한 쪽이 안다. 총액에서 역산하지 않는다.
        verified: memoResult?.isVerified ?? false,
        cutCoin: result.cutCoin,
      );

      // 레벨이 올랐으면 레벨업 연출을 잇는다. 다단계 상승도 from→to로 표현된다.
      if (result.leveledUp) {
        if (!mounted) return;
        await showLevelUpDialog(
          context,
          fromLevel: result.fromLevel,
          toLevel: result.toLevel,
        );
      }

      // 진화 단계가 바뀌었으면 가장 강한 연출로 이어 간다.
      // 진화가 있었다면 레벨업도 반드시 있었으므로 순서가 자연스럽다.
      if (result.evolved) {
        if (!mounted) return;
        await showEvolveDialog(
          context,
          fromStage: result.fromStage,
          toStage: result.toStage,
        );
      }
    } else if (done && !goalCompleted) {
      // 재완료인데 목표 완수도 아니면 무반응 대신 이유를 알린다.
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('이미 완료한 퀘스트예요')));
    }

    // 목표(폴더) 완수 연출 — 보상/레벨업/진화 연출 뒤에 **마무리**로 이어 띄운다.
    // 목표의 마지막 퀘스트를 완료해 폴더가 통째로 보관된 순간에만 뜬다. 직접 등록
    // 낱개 이동에는 이 연출이 없다.
    if (goalCompleted) {
      if (!mounted) return;
      await showGoalCompleteDialog(context, goalLabel: group.label);
    }
  }

  /// 진행 상태만 바꾼다(보상 경로와 무관).
  ///
  /// **`completeQuest`가 아니라 `setStatus`를 부른다.** 멈춤 표시는 완료가 아니므로
  /// 코인·XP가 오갈 일이 없고, `rewardedAt`도 건드리지 않는다.
  /// 중복 실행 방지는 완료 흐름과 **같은 [_pending] 잠금**을 공유한다 — 메모 시트가
  /// 떠 있는 사이에 `⋮`로 상태를 바꾸면 두 흐름이 같은 퀘스트를 두고 경쟁한다.
  Future<void> _setStatus(Quest quest, QuestStatus status) async {
    if (_pending.contains(quest.id)) return;
    _pending.add(quest.id);
    if (mounted) setState(() => _completing.add(quest.id));

    try {
      final uid = await ref.read(sessionProvider.future);
      await ref.read(questRepositoryProvider).setStatus(uid, quest.id, status);
      // 멈춤 표시만 계측한다(「재분해 복귀율」의 분모). 다시 진행(todo 복귀)은
      // 지표 대상이 아니다. 상태 변경 성공 뒤 · 부가로 남긴다.
      if (status == QuestStatus.stuck) {
        ref.logEvent(
          uid,
          AnalyticsEvent.questStuck(at: DateTime.now(), questId: quest.id),
        );
      }
    } on AppFailure catch (failure) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
    } finally {
      _pending.remove(quest.id);
      if (mounted) setState(() => _completing.remove(quest.id));
    }
  }

  /// 카드 `⋮` 메뉴 항목.
  ///
  /// 상태별로 노출이 갈린다:
  /// - `todo` → 「여기서 막혔어요」. 멈춤 표시가 「재분해 복귀율」의 분모를 만든다.
  /// - `stuck` → 「다시 진행할게요」 + (깊이가 남았으면)「더 작게 나누기」.
  /// - `done` → **없음.** 끝낸 퀘스트엔 메뉴 자체가 안 뜬다. 수정·삭제도 여기서
  ///   자동 제외된다 — 완료(보상받음) 퀘스트를 수정해 난이도를 올려 추가 보상을
  ///   노리는 유효화를 막는다.
  ///
  /// 미완료(todo·stuck) 카드에는 상태 항목 뒤에 **수정 → 삭제**를 공통으로 붙인다.
  /// 파괴적 동작(삭제)이 언제나 맨 아래다.
  List<QuestMenuAction> _menuActionsFor(QuestNode node, QuestGroup group) {
    final quest = node.quest;

    if (quest.done) return const [];

    final actions = <QuestMenuAction>[];

    if (!quest.isStuck) {
      actions.add(
        QuestMenuAction(
          label: '여기서 막혔어요',
          icon: Symbols.pause_circle,
          onSelected: () => _setStatus(quest, QuestStatus.stuck),
        ),
      );
    } else {
      actions.add(
        QuestMenuAction(
          label: '다시 진행할게요',
          icon: Symbols.undo,
          onSelected: () => _setStatus(quest, QuestStatus.todo),
        ),
      );
      // 깊이가 남았을 때만 노출한다. 자식의 자식까지 또 나누면 목록이 감당 못 한다.
      if (node.canRedecompose) {
        actions.add(
          QuestMenuAction(
            label: '더 작게 나누기',
            icon: Symbols.alt_route,
            onSelected: () => _openRedecompose(quest, group),
          ),
        );
      }
    }

    // 수정(제목·난이도) — 미완료 카드 공통.
    actions.add(
      QuestMenuAction(
        label: '제목·난이도 수정',
        icon: Symbols.edit,
        onSelected: () => _editQuest(quest),
      ),
    );

    // 삭제 — 파괴적 동작이라 맨 아래. 재분해 원본이면 계보까지 함께 지운다.
    actions.add(
      QuestMenuAction(
        label: '삭제',
        icon: Symbols.delete,
        onSelected: () => _deleteQuest(quest, group),
      ),
    );

    return actions;
  }

  /// 제목·난이도 수정 다이얼로그를 띄우고, 확정되면 `updateQuest`로 반영한다.
  ///
  /// 다이얼로그는 저장소를 모른다 — 입력만 받아 돌려주고([QuestEditResult]),
  /// 실제 저장과 실패 처리는 여기서 한다(_setStatus와 같은 패턴). 중복 실행 방지는
  /// 완료 흐름과 **같은 [_pending] 잠금**을 공유한다.
  Future<void> _editQuest(Quest quest) async {
    final result = await showQuestEditDialog(context, quest: quest);
    // null = 취소(바깥 탭·뒤로가기). 아무것도 바꾸지 않는다.
    if (result == null || !mounted) return;

    if (_pending.contains(quest.id)) return;
    _pending.add(quest.id);
    setState(() => _completing.add(quest.id));

    try {
      final uid = await ref.read(sessionProvider.future);
      // copyWith로 제목·난이도만 바꾼다. 상태·지급 이력·순서는 그대로 보존된다.
      await ref
          .read(questRepositoryProvider)
          .updateQuest(
            uid,
            quest.copyWith(title: result.title, difficulty: result.difficulty),
          );
    } on AppFailure catch (failure) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
    } finally {
      _pending.remove(quest.id);
      if (mounted) setState(() => _completing.remove(quest.id));
    }
  }

  /// 퀘스트를 삭제한다. 재분해 원본이면 **그 하위 계보까지 원자적으로** 지운다.
  ///
  /// 계보 계산은 화면 몫이다([descendantIds] — 저장소는 트리를 모른다). 대상은
  /// 같은 목표 폴더([QuestGroup.quests]) 안에서 찾는다 — 재분해 자식은 원본의
  /// `goalId`를 물려받아 같은 폴더에 남으므로 계보가 전부 여기 있다.
  ///
  /// ⚠️ **삭제는 지급된 코인·XP를 회수하지 않는다.** 계보에 완료된 자식이 섞여 있어
  /// 함께 지워져도, 이미 사용자 문서에 반영된 잔액은 건드리지 않는다(회수는 완료
  /// 트랜잭션의 역연산이라 별개 결정 — 이 범위 아님).
  Future<void> _deleteQuest(Quest quest, QuestGroup group) async {
    // 함께 사라질 하위 퀘스트. 경고 문구의 N이자 실제로 지울 계보다.
    final childIds = descendantIds(group.quests, quest.id);

    final confirmed = await showQuestDeleteDialog(
      context,
      questTitle: quest.title,
      childCount: childIds.length,
    );
    // true만 삭제 진행 — false·null(dismiss)은 취소다.
    if (confirmed != true || !mounted) return;

    if (_pending.contains(quest.id)) return;
    _pending.add(quest.id);
    setState(() => _completing.add(quest.id));

    try {
      final uid = await ref.read(sessionProvider.future);
      // 대상 + 계보를 한 번에. deleteQuests가 원자성·1회 방출을 보장한다.
      await ref
          .read(questRepositoryProvider)
          .deleteQuests(uid, [quest.id, ...childIds]);
    } on AppFailure catch (failure) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
    } finally {
      _pending.remove(quest.id);
      // 삭제 성공 시 카드가 사라지지만 화면은 남아 있다 — 잠금은 반드시 푼다.
      if (mounted) setState(() => _completing.remove(quest.id));
    }
  }

  /// 재분해 화면으로 이동한다. **여기서는 아무것도 저장하지 않는다** —
  /// 원본은 stuck 그대로 남고, 등록은 그 화면의 「등록하기」가 한다.
  void _openRedecompose(Quest quest, QuestGroup group) {
    // 목표 텍스트는 폴더 라벨에서 가져온다. 목표 문서를 못 찾은 그룹의 폴백 라벨
    // ('목표')이나 직접 등록 그룹 라벨은 맥락이 아니므로 넘기지 않는다 —
    // 그런 경우 퀘스트 제목 자체가 맥락이 된다(RedecomposeTarget.contextText).
    final hasGoalText = group.goalId != null && group.label != kUnknownGoalLabel;

    context.go(
      '/quest/split',
      extra: RedecomposeTarget(
        questId: quest.id,
        questTitle: quest.title,
        difficulty: quest.difficulty,
        goalId: quest.goalId,
        goalText: hasGoalText ? group.label : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 목표(폴더) 단위로 묶인 목록. 목표를 못 읽어도 퀘스트는 폴백 라벨로 뜬다
    // (questGroupsProvider가 goal 스트림의 실패를 삼킨다).
    final groupsAsync = ref.watch(questGroupsProvider);

    return Scaffold(
      // 제목 + 코인 잔액. 화면 제목을 본문 첫 줄이 아니라 AppBar로 올린 이유는
      // 목록이 스크롤돼도 "여기가 어디인지"와 잔액이 함께 남아야 해서다(Figma 리디자인).
      appBar: AppBar(
        title: const Text('오늘의 퀘스트'),
        actions: const [_HeaderCoin(), AppSpacing.gapWMd],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/quest/new'),
        icon: const Icon(Symbols.add),
        label: const Text('퀘스트 등록'),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // AI 분해 진입점. plan.md의 2대 핵심 기능 중 하나로 들어가는 문이라
            // 목록 맨 위에 카드로 세운다. 색은 블루 유지 — 그린으로 바꾸면 수동 등록
            // FAB(그린)와 역할이 겹친다.
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenH,
                AppSpacing.sm,
                AppSpacing.screenH,
                AppSpacing.screenH,
              ),
              child: AiPromoCard(onPressed: () => context.go('/quest/split')),
            ),
            const _DailyCapNotice(),
            Expanded(
              child: groupsAsync.when(
                // 로딩: 스켈레톤 카드 3장.
                loading: () => ListView(
                  padding: _listPadding,
                  children: const [
                    SkeletonBox(height: 120),
                    AppSpacing.gapSm,
                    SkeletonBox(height: 120),
                    AppSpacing.gapSm,
                    SkeletonBox(height: 120),
                  ],
                ),
                // 오류: 빈 상태와 시각적으로 확실히 다르다(에러 색 + 경고 아이콘 + 재시도).
                error: (error, _) => _FillViewport(
                  child: ErrorView(
                    message: error is AppFailure
                        ? error.message
                        : '퀘스트를 불러오지 못했어요.',
                    onRetry: () => ref.invalidate(questListProvider),
                  ),
                ),
                data: (groups) {
                  if (groups.isEmpty) {
                    return _FillViewport(
                      child: EmptyView(
                        title: '아직 퀘스트가 없어요',
                        message: '큰 목표를 작은 퀘스트로 쪼개면\n오늘 당장 시작할 수 있어요.',
                        emoji: '🪺',
                        asset: EmptyArt.quest,
                        actionLabel: '퀘스트 등록하기',
                        onAction: () => context.go('/quest/new'),
                      ),
                    );
                  }

                  // scrollController는 탭 재선택 시 목록 최상단 복귀에 쓰인다.
                  // 그룹 단위로 바뀌어도 반드시 유지한다.
                  return ListView.builder(
                    controller: scrollController,
                    padding: _listPadding,
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
                          questBuilder: (context, node) => QuestCard(
                            quest: node.quest,
                            isCompleting: _completing.contains(node.quest.id),
                            onToggleDone: (done) =>
                                _toggleDone(node.quest, done, group),
                            menuActions: _menuActionsFor(node, group),
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

/// 목록 자체의 패딩. 위쪽은 0이다 — 상단 프로모 카드가 이미 자기 아래 여백(20)을
/// 들고 있어서, 여기서 또 주면 목록이 두 배로 내려앉는다.
const EdgeInsets _listPadding = EdgeInsets.fromLTRB(
  AppSpacing.screenH,
  0,
  AppSpacing.screenH,
  AppSpacing.xl,
);

/// 남은 세로 공간을 채우되, **모자라면 넘치지 않고 스크롤한다.**
///
/// 빈 상태·오류 안내는 세로로 중앙 정렬돼야 보기 좋지만([Center]), 위쪽 프로모
/// 카드·안내 줄이 자리를 많이 먹은 짧은 화면(작은 단말 · 큰 글꼴 배율)에서는
/// 남은 높이가 안내보다 작아져 그대로 넘친다. 그렇다고 안내를 줄이면 **작은
/// 화면 사용자만 설명을 덜 받는다.** 남으면 가운데, 모자라면 스크롤이 정답이다.
class _FillViewport extends StatelessWidget {
  const _FillViewport({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        child: ConstrainedBox(
          // 부모가 높이를 안 정해 주는 자리(스크롤 목록 안 등)에 잘못 놓여도
          // 무한대를 최소 높이로 요구하지 않도록 막는다.
          constraints: BoxConstraints(
            minHeight: constraints.hasBoundedHeight ? constraints.maxHeight : 0,
          ),
          child: child,
        ),
      ),
    );
  }
}

/// AppBar 우측 코인 잔액.
///
/// 사용자 문서를 못 읽었으면(로딩·오류) **아무것도 그리지 않는다.** 잔액은 부가
/// 정보라, 못 읽었다고 AppBar에 오류를 띄우면 정작 목록의 오류 안내와 겹쳐 화면이
/// 두 번 사과한다(_DailyCapNotice와 같은 판단).
class _HeaderCoin extends ConsumerWidget {
  const _HeaderCoin();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider).valueOrNull;
    if (user == null) return const SizedBox.shrink();
    return CoinPill(amount: user.coin, compact: true);
  }
}

/// 오늘 코인 상한에 도달했을 때만 뜨는 안내 줄.
///
/// **왜 상시가 아니라 도달했을 때만 뜨는가**: 평소에 "70/70까지 받을 수 있어요"를
/// 붙여 두면 상한이 목표처럼 읽혀 퀘스트가 숙제가 된다. 안내가 필요한 순간은
/// "코인이 왜 안 들어오지?"가 생기는 순간뿐이다.
///
/// 색은 🔵 블루(정보)다. 코인 이야기지만 **노랑은 코인 수치 자체를 표시할 때만**
/// 쓴다 — 안내문까지 노랑으로 칠하면 색 역할이 "코인 관련 아무거나"로 넓어진다.
///
/// 로딩·오류에는 아무것도 그리지 않는다. 부가 안내라 사용자 문서를 못 읽었다고
/// 퀘스트 목록 위에 오류를 띄우면 손해가 더 크다(questGroupsProvider가 goal 스트림
/// 실패를 삼키는 것과 같은 판단).
///
/// ⚠️ **알려진 한계(의도된 선택)**: 시각을 build 시점에 한 번 읽으므로, 앱을 켜 둔 채
/// KST 자정을 넘기면 rebuild 전까지 이 안내가 남는다. 자동으로 지우려면 자정까지
/// 세는 타이머를 위젯 수명에 매달아야 하는데, 그 비용(타이머 생존 관리 · 테스트의
/// 시간 의존성)이 얻는 것보다 크다. 실제 지급은 저장소가 매번 날짜를 다시 계산하므로
/// **안내만 낡을 뿐 코인은 정상 지급되고**, 그 완료 시점에 사용자 문서 스트림이
/// 갱신되며 안내도 사라진다. 버그가 아니라 감수한 지연이다.
class _DailyCapNotice extends ConsumerWidget {
  const _DailyCapNotice();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider).valueOrNull;
    if (user == null) return const SizedBox.shrink();

    final now = ref.watch(clockProvider)();
    if (!user.isDailyCoinCapped(now)) return const SizedBox.shrink();

    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenH,
        0,
        AppSpacing.screenH,
        AppSpacing.sm,
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainer,
          borderRadius: AppRadius.mdAll,
        ),
        child: Row(
          children: [
            Icon(
              Symbols.info,
              size: 18,
              fill: 1,
              color: theme.colorScheme.secondary,
            ),
            AppSpacing.gapWSm,
            Expanded(
              child: Text(
                '오늘 코인은 $kDailyCoinCap개까지 받았어요. '
                '내일 다시 쌓여요 — XP는 계속 올라갑니다.',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.secondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
