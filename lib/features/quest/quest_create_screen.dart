import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/analytics/analytics_logger.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/reward_chip.dart';
import '../../models/analytics_event.dart';
import '../../models/difficulty.dart';
import '../../models/quest_draft.dart';
import '../../models/quest_source.dart';
import '../../providers/providers.dart';

/// 직접 퀘스트 등록 화면 (3단계-c · 목표 폴더 단위).
///
/// AI 분해([QuestSplitScreen])가 "큰 목표 → 하위 퀘스트 초안"을 **자동으로** 채우는
/// 것과 달리, 여기서는 사용자가 **목표명 + 하위 퀘스트들을 직접 타이핑**한다. 저장
/// 경로는 완전히 공용이다: 목표(Goal) 저장 → 그 goalId로 초안들을 일괄 저장한다
/// ([DecomposeNotifier.confirm]의 target==null 경로와 동일).
///
/// **신규 등록은 목표를 강제한다** — goalId 없는 낱개 등록은 이 화면에서 만들지
/// 않는다(목표명이 비면 등록 불가). 기존 goalId-null 낱개 데이터·그룹("직접 등록한
/// 퀘스트")은 하위호환으로 그대로 두되, 새 등록은 항상 폴더로 묶인다.
///
/// 색 규칙(one-step-design):
/// - 주요 행동("등록하기") = 그린(`FilledButton` 기본 = `colorScheme.primary`).
/// - 노랑은 직접 쓰지 않는다. 예상 보상은 [RewardChip](allowlist)이 전담한다.
class QuestCreateScreen extends ConsumerStatefulWidget {
  const QuestCreateScreen({super.key});

  @override
  ConsumerState<QuestCreateScreen> createState() => _QuestCreateScreenState();
}

/// 저장 전 퀘스트 한 행의 편집 상태. 인라인 TextField가 필요해 컨트롤러를 들고
/// 있으므로 불변 [QuestDraft] 대신 이 가변 구조로 관리하고, 저장 시점에
/// [QuestDraft]로 변환한다(order는 목록 인덱스로 다시 매긴다).
class _QuestRow {
  _QuestRow({required this.localId}) : controller = TextEditingController();

  final String localId;
  final TextEditingController controller;

  /// 기본값 보통. 행 생성 후 SegmentedButton으로 바뀐다.
  Difficulty difficulty = Difficulty.normal;
}

class _QuestCreateScreenState extends ConsumerState<QuestCreateScreen> {
  final _goalController = TextEditingController();

  /// 하위 퀘스트 행들. 최소 1개(0개면 등록 불가)로 시작한다.
  final List<_QuestRow> _rows = [];

  /// 행 localId 생성용 단조 증가 카운터. Firestore ID가 아니라 화면 내 임시 식별자다.
  int _nextRowId = 0;

  bool _submitting = false;

  /// 등록 가능 조건: 목표명 비지 않음 + 퀘스트 ≥1 + 각 제목 비지 않음 + 제출 중 아님.
  bool get _canSubmit {
    if (_submitting) return false;
    if (_goalController.text.trim().isEmpty) return false;
    if (_rows.isEmpty) return false;
    return _rows.every((r) => r.controller.text.trim().isNotEmpty);
  }

  @override
  void initState() {
    super.initState();
    // 버튼 활성 상태를 목표명 입력과 동기화한다.
    _goalController.addListener(_onChanged);
    // 최소 1개 행으로 시작한다(0개면 등록 불가라 빈 화면이 되지 않게).
    _addRow();
  }

  @override
  void dispose() {
    _goalController.dispose();
    for (final row in _rows) {
      row.controller.dispose();
    }
    super.dispose();
  }

  void _onChanged() => setState(() {});

  void _addRow() {
    final row = _QuestRow(localId: 'row-${_nextRowId++}');
    // 각 행 제목도 버튼 활성 조건에 들어가므로 입력에 따라 상태를 갱신한다.
    row.controller.addListener(_onChanged);
    setState(() => _rows.add(row));
  }

  /// 행을 삭제한다. 최소 1개는 남긴다(0개면 등록할 게 없어진다).
  void _removeRow(_QuestRow row) {
    if (_rows.length <= 1) return;
    row.controller.removeListener(_onChanged);
    row.controller.dispose();
    setState(() => _rows.remove(row));
  }

  void _changeDifficulty(_QuestRow row, Difficulty difficulty) {
    setState(() => row.difficulty = difficulty);
  }

  Future<void> _submit() async {
    // 버튼 비활성과 이중 방어(중복 탭·빈 입력·빈 목표명 가드).
    if (!_canSubmit) return;

    final goalText = _goalController.text.trim();
    // 목표명 빈 값 가드 — 신규 등록은 목표를 강제한다.
    if (goalText.isEmpty) return;

    // 저장 전 초안으로 변환한다. order는 현재 목록 순서 그대로 매긴다.
    final drafts = <QuestDraft>[
      for (var i = 0; i < _rows.length; i++)
        QuestDraft(
          localId: _rows[i].localId,
          title: _rows[i].controller.text.trim(),
          difficulty: _rows[i].difficulty,
          order: i,
        ),
    ];
    // 제목이 빈 행이 하나라도 있으면 등록하지 않는다(_canSubmit가 막지만 이중 방어).
    if (drafts.any((d) => d.title.isEmpty)) return;

    // 중복 탭 방지: 제출 중에는 버튼이 비활성화되고 요청이 한 번만 나간다.
    setState(() => _submitting = true);

    try {
      // sessionProvider는 익명 로그인 + users 문서 생성까지 끝난 uid를 보장한다
      // (currentUidProvider는 아무도 watch하지 않으면 read 시점에 null이라 쓰면 안 된다).
      final uid = await ref.read(sessionProvider.future);

      // 원본 목표(폴더)를 먼저 저장하고, 그 goalId로 퀘스트들을 일괄 저장한다.
      // createQuests는 batch라 원자적이다(부분 저장 없음). goal 저장 성공 후 quests
      // 실패로 남는 orphan goal은 무해하다 — 어떤 quest도 가리키지 않는 죽은 데이터일
      // 뿐 불일치가 아니다(AI 분해 confirm()의 target==null 경로와 같은 판단).
      final goal = await ref
          .read(goalRepositoryProvider)
          .createGoal(uid, goalText);
      await ref
          .read(questRepositoryProvider)
          .createQuests(
            uid,
            drafts,
            goalId: goal.id,
            // 직접 등록임을 문서에 명시한다 — 이 퀘스트도 goalId를 갖지만 카드는
            // "✎직접"으로 표시돼야 한다(회귀 A: goalId 추론이 직접 등록을 AI로 오표기).
            source: QuestSource.manual,
          );

      // 직접 등록 계측 — 저장이 성공한 뒤(트랜잭션 밖) 부가로 남긴다. AI 등록이
      // source:ai인 것과 구분해 source:manual로 남긴다. 실패해도 등록을 막지 않는다
      // (logEvent가 삼킨다).
      ref.logEvent(
        uid,
        AnalyticsEvent.questRegistered(
          at: DateTime.now(),
          count: drafts.length,
          source: 'manual',
        ),
      );

      if (!mounted) return;

      // go_router의 context.pop() 대신 Navigator를 쓴다 — GoRouter가 없는
      // 위젯 테스트 트리에서도 안전하게 동작한다(go_router도 Navigator 위에 있다).
      final navigator = Navigator.of(context);
      if (navigator.canPop()) {
        navigator.pop();
        return;
      }

      // 되돌아갈 화면이 없으면(테스트 트리 등) 스피너를 풀어 준다.
      setState(() => _submitting = false);
    } on AppFailure catch (failure) {
      if (!mounted) return;
      // 실패해도 화면을 닫지 않는다 — 입력한 내용이 날아가면 안 된다.
      setState(() => _submitting = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(failure.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final canRemove = _rows.length > 1;

    return Scaffold(
      appBar: AppBar(title: const Text('퀘스트 등록')),
      // 등록 버튼은 스크롤과 무관하게 항상 보이도록 본문이 아니라 하단 바에 둔다
      // (긴 목록에서도 주요 행동이 화면 밖으로 밀리지 않는다 — AI 분해 화면과 같은 패턴).
      bottomNavigationBar: _SubmitBar(
        submitting: _submitting,
        onSubmit: _canSubmit ? _submit : null,
      ),
      body: SafeArea(
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            Text('어떤 목표에 도전할까요?', style: theme.textTheme.titleLarge),
            AppSpacing.gapSm,
            Text(
              '큰 목표를 적고, 오늘 시작할 수 있는 작은 퀘스트로 직접 나눠 담아요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            AppSpacing.gapMd,

            // 목표명(폴더). 비면 등록 불가.
            TextField(
              controller: _goalController,
              autofocus: true,
              maxLength: 60,
              enabled: !_submitting,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: '목표',
                hintText: '예: 교내 공모전 지원하기',
                prefixIcon: Icon(Symbols.target),
              ),
            ),
            AppSpacing.gapMd,

            Text('하위 퀘스트', style: theme.textTheme.titleLarge),
            AppSpacing.gapSm,

            for (var i = 0; i < _rows.length; i++) ...[
              _QuestRowCard(
                row: _rows[i],
                index: i,
                enabled: !_submitting,
                canRemove: canRemove,
                onChanged: _onChanged,
                onChangeDifficulty: (d) => _changeDifficulty(_rows[i], d),
                onRemove: () => _removeRow(_rows[i]),
              ),
              AppSpacing.gapSm,
            ],

            // 퀘스트 추가 — 보조 행동이라 아웃라인. AI 재요청이 아니므로 블루로 칠하지
            // 않고 중립 아웃라인 버튼을 쓴다.
            OutlinedButton.icon(
              onPressed: _submitting ? null : _addRow,
              icon: const Icon(Symbols.add),
              label: const Text('퀘스트 추가'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 하단 등록 바 — 항상 보이는 전폭 그린 "등록하기" 버튼.
///
/// 확정 등록은 **주요 행동**이라 그린(`FilledButton` 기본 = `colorScheme.primary`)이다.
/// [onSubmit]이 null이면(목표명·제목 미입력 등) 비활성이고, [submitting] 중이면
/// 스피너 + 비활성으로 중복 탭 방지를 시각화한다(요청은 한 번만 나간다).
/// SafeArea로 홈 인디케이터 영역을 피하고 화면 좌우 여백과 같은 리듬을 준다.
class _SubmitBar extends StatelessWidget {
  const _SubmitBar({required this.submitting, required this.onSubmit});

  final bool submitting;
  final VoidCallback? onSubmit;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(
        AppSpacing.screenH,
        AppSpacing.sm,
        AppSpacing.screenH,
        AppSpacing.md,
      ),
      child: SizedBox(
        width: double.infinity,
        child: FilledButton(
          // 목표명·제목이 비거나 제출 중이면 눌리지 않는다.
          onPressed: submitting ? null : onSubmit,
          child: submitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('등록하기'),
        ),
      ),
    );
  }
}

/// 하위 퀘스트 한 행 카드 — 제목 TextField + 난이도 SegmentedButton + 예상 보상 칩 + 삭제.
///
/// [QuestDraftCard]는 "표시 + 다이얼로그/팝업 편집" 모델이라 저장된 초안을 검토하는
/// 데 맞지만, 직접 등록은 사용자가 제목을 **처음부터 타이핑**하므로 인라인 TextField가
/// 필요하다. 그래서 여기서는 별도 카드를 쓰되 시각 토큰(라운드·간격·색)은 공용 토큰과
/// 테마를 참조한다(HEX·EdgeInsets 하드코딩 금지).
///
/// 색 규칙(one-step-design):
/// - 예상 보상 = [RewardChip](노랑 allowlist). 카드에서 노랑을 직접 쓰지 않는다.
/// - 삭제는 중립(`onSurfaceVariant`)이다. error 빨강은 Hard 난이도색이라 혼동을 부른다.
class _QuestRowCard extends StatelessWidget {
  const _QuestRowCard({
    required this.row,
    required this.index,
    required this.enabled,
    required this.canRemove,
    required this.onChanged,
    required this.onChangeDifficulty,
    required this.onRemove,
  });

  final _QuestRow row;
  final int index;
  final bool enabled;

  /// 삭제 가능 여부(행이 2개 이상일 때만). 최소 1개는 남긴다.
  final bool canRemove;
  final VoidCallback onChanged;
  final ValueChanged<Difficulty> onChangeDifficulty;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '퀘스트 ${index + 1}',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              // 최소 1개는 남기므로 행이 하나뿐일 때는 삭제 버튼을 숨긴다.
              if (canRemove)
                IconButton(
                  onPressed: enabled ? onRemove : null,
                  tooltip: '삭제',
                  visualDensity: VisualDensity.compact,
                  iconSize: 20,
                  color: scheme.onSurfaceVariant,
                  icon: const Icon(Symbols.close),
                ),
            ],
          ),
          AppSpacing.gapXs,
          TextField(
            controller: row.controller,
            enabled: enabled,
            maxLength: 60,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              hintText: '예: 공모전 공고 3개 찾아보기',
            ),
          ),
          AppSpacing.gapSm,
          SegmentedButton<Difficulty>(
            segments: [
              for (final d in Difficulty.values)
                ButtonSegment(value: d, label: Text(d.label)),
            ],
            selected: {row.difficulty},
            onSelectionChanged: enabled
                ? (selection) => onChangeDifficulty(selection.first)
                : null,
          ),
          AppSpacing.gapSm,
          // 난이도를 바꾸면 예상 보상도 함께 바뀐다(난이도에서 파생).
          //
          // **`Row(spaceBetween)`이 아니라 `Wrap(spaceBetween)`이다.** 라벨도 칩도
          // 글꼴 배율을 그대로 타는데, 예전 Row에는 유연 위젯이 없어 둘 다 고유 폭을
          // 요구했고 배율 1.6·폭 360dp부터 줄이 넘쳤다(E-4 D-4).
          //
          // 여기서 `Flexible` 두 개로는 부족하다 — 폭을 반씩 나눠 갖게 되는데,
          // 배율 2.0에서는 칩 한 묶음("XP +10")이 그 절반보다 넓다. Wrap은 자식에게
          // **줄 전체 폭**을 주므로, 한 줄에 안 들어가면 칩이 통째로 다음 줄로 내려가
          // 온전한 폭을 받는다. 한 줄에 들어갈 때의 배치는 Row(spaceBetween)와 같다.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            runSpacing: AppSpacing.xs,
            children: [
              Text('예상 보상', style: theme.textTheme.labelMedium),
              RewardChip(reward: rewardFor(row.difficulty)),
            ],
          ),
        ],
      ),
    );
  }
}
