import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/state_views.dart';
import '../../models/quest_draft.dart';
import 'decompose_notifier.dart';
import 'widgets/quest_draft_card.dart';

/// AI 도전 분해 화면 (2주차 · AI Quest Splitter).
///
/// 큰 목표를 입력 → AI가 마이크로 퀘스트로 분해 → 결과를 보여준다.
/// **이 커밋은 표시 전용이다.** 수정·삭제·난이도 변경·재생성·확정은 이후 커밋에서 붙는다.
///
/// 색 규칙(one-step-design):
/// - AI 요소(아이콘 타일·로딩 인디케이터·폴백 배너) = **블루**(`colorScheme.secondary`).
/// - 주요 행동("분해하기") = **그린**(FilledButton 기본 = `colorScheme.primary`).
/// - 노랑은 직접 쓰지 않는다. 보상은 [RewardChip](allowlist)이 담당한다.
class QuestSplitScreen extends ConsumerStatefulWidget {
  const QuestSplitScreen({super.key});

  @override
  ConsumerState<QuestSplitScreen> createState() => _QuestSplitScreenState();
}

class _QuestSplitScreenState extends ConsumerState<QuestSplitScreen> {
  final _goalController = TextEditingController();

  /// 분해 요청이 진행 중인지. 중복 탭 방지 + 버튼 스피너의 근거.
  bool _isDecomposing = false;

  /// 목표가 비었거나 공백뿐이면, 또는 이미 분해 중이면 버튼이 눌리지 않는다.
  bool get _canSubmit =>
      _goalController.text.trim().isNotEmpty && !_isDecomposing;

  @override
  void initState() {
    super.initState();
    // 버튼 활성 상태를 입력과 동기화한다.
    _goalController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _goalController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final goal = _goalController.text.trim();
    // 빈 값·공백·중복 탭 방어. 버튼 비활성과 이중 방어.
    if (goal.isEmpty || _isDecomposing) return;

    setState(() => _isDecomposing = true);
    try {
      // decompose는 실패해도 throw하지 않는다(폴백으로 귀결). 그래도 finally로
      // _isDecomposing을 반드시 풀어 제출 상태에 갇히지 않게 한다.
      await ref.read(decomposeNotifierProvider.notifier).decompose(goal);
    } finally {
      if (mounted) setState(() => _isDecomposing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final decomposeState = ref.watch(decomposeNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('AI 도전 분해')),
      body: SafeArea(
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            _SplitterCard(
              controller: _goalController,
              isDecomposing: _isDecomposing,
              canSubmit: _canSubmit,
              onSubmit: _submit,
            ),
            AppSpacing.gapLg,
            // 결과 영역: 초기(null)엔 아무것도, 로딩엔 블루 인디케이터, 데이터엔 목록.
            decomposeState.when(
              loading: () => const _DecomposingView(),
              // decompose는 상태를 error로 두지 않지만(항상 폴백), 방어적으로 처리한다.
              error: (error, _) => ErrorView(
                message: '퀘스트를 나누지 못했어요.',
                onRetry: _canSubmit ? _submit : null,
              ),
              data: (state) {
                if (state == null) return const SizedBox.shrink();
                if (state.drafts.isEmpty) {
                  // 폴백이 항상 채우므로 정상적으로는 도달하지 않는다 — 방어용(checklist #11).
                  // "다시 시도"는 **빈 결과 전용** 복구 수단이다. 정상 결과의 전체 재생성은
                  // 이후 커밋 몫이라 여기서 만들지 않는다.
                  return EmptyView(
                    title: '나눠줄 퀘스트가 없어요',
                    message: '다른 목표로 다시 시도해 볼까요?',
                    emoji: '🧩',
                    actionLabel: '다시 시도',
                    onAction: _isDecomposing
                        ? null
                        : () => ref
                              .read(decomposeNotifierProvider.notifier)
                              .decompose(state.goalText),
                  );
                }
                return _ResultSection(state: state);
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// 입력 카드 — 블루 AI 타일 + 제목 + 설명 + 입력 필드 + 그린 분해 버튼 + 안내 박스.
class _SplitterCard extends StatelessWidget {
  const _SplitterCard({
    required this.controller,
    required this.isDecomposing,
    required this.canSubmit,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final bool isDecomposing;
  final bool canSubmit;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        // 흰 카드 + 미세한 그린 톤 배경(테마 그린을 낮은 알파로).
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.surfaceContainerLowest,
            scheme.primaryContainer.withValues(alpha: 0.06),
          ],
        ),
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // AI = 블루 아이콘 타일.
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: scheme.secondaryContainer,
                  borderRadius: AppRadius.mdAll,
                ),
                child: Icon(
                  Symbols.auto_awesome,
                  fill: 1,
                  color: scheme.onSecondary,
                ),
              ),
              AppSpacing.gapWMd,
              Expanded(
                child: Text('AI 도전 분해기', style: theme.textTheme.headlineMedium),
              ),
            ],
          ),
          AppSpacing.gapMd,
          Text(
            '큰 목표를 입력하면 오늘 시작할 수 있는 작은 퀘스트로 나눠드려요.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.gapMd,
          TextField(
            controller: controller,
            autofocus: true,
            maxLength: 60,
            enabled: !isDecomposing,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) {
              if (canSubmit) onSubmit();
            },
            decoration: const InputDecoration(
              hintText: '예: 공모전 지원하기',
              prefixIcon: Icon(Symbols.target),
            ),
          ),
          AppSpacing.gapSm,
          FilledButton(
            // 목표가 비거나 공백뿐이면, 또는 분해 중이면 눌리지 않는다.
            onPressed: canSubmit ? onSubmit : null,
            child: isDecomposing
                // 분해 중: 버튼 자리에 AI 블루 스피너. 요청은 한 번만 나간다.
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: scheme.secondary,
                    ),
                  )
                : const Text('분해하기'),
          ),
          AppSpacing.gapMd,
          // 안내 박스: surfaceContainerHigh + 블루 분기 아이콘(AI 정보).
          Container(
            padding: AppSpacing.cardPadding,
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHigh,
              borderRadius: AppRadius.mdAll,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Symbols.alt_route, color: scheme.secondary),
                AppSpacing.gapWSm,
                Expanded(
                  child: Text(
                    'AI가 목표를 분석해 오늘 할 수 있는 퀘스트로 나눠줘요.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 분해 중 로딩 — AI = 블루 인디케이터(checklist #74) + 결과 카드 실루엣 스켈레톤.
///
/// 블루 인디케이터 + 안내 문구로 "AI가 일하는 중"을 알리고, 그 아래 스켈레톤 카드로
/// 곧 나올 결과 카드의 실루엣을 예고한다(quest_list_screen 로딩과 일관된 스켈레톤 방식).
class _DecomposingView extends StatelessWidget {
  const _DecomposingView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: theme.colorScheme.secondary,
                ),
              ),
              AppSpacing.gapWSm,
              Text(
                'AI가 목표를 나누고 있어요',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          AppSpacing.gapLg,
          // 곧 나올 결과 카드 실루엣 3장.
          const SkeletonBox(height: 96),
          AppSpacing.gapSm,
          const SkeletonBox(height: 96),
          AppSpacing.gapSm,
          const SkeletonBox(height: 96),
        ],
      ),
    );
  }
}

/// 분해 결과 섹션 — 섹션 제목 + (템플릿일 때만) 폴백 배너 + draft 카드 목록.
///
/// 각 카드에 편집 콜백(제목 수정·난이도 변경·삭제)을 배선한다. 편집은 [DecomposeNotifier]의
/// 순수 메모리 조작이라 저장이 아니다 — 확정 저장/재생성은 이후 커밋 몫이다.
class _ResultSection extends ConsumerWidget {
  const _ResultSection({required this.state});

  final DecomposeState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(decomposeNotifierProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '이렇게 나눠봤어요 · ${state.drafts.length}개',
          style: theme.textTheme.titleLarge,
        ),
        AppSpacing.gapMd,
        // 폴백 배너는 **template 출처일 때만** 뜬다(checklist #13).
        if (state.source == DecomposeSource.template) ...[
          const _FallbackBanner(),
          AppSpacing.gapMd,
        ],
        for (final draft in state.drafts) ...[
          QuestDraftCard(
            draft: draft,
            onEditTitle: () => _showEditTitleDialog(context, notifier, draft),
            onChangeDifficulty: (d) =>
                notifier.changeDifficulty(draft.localId, d),
            onDelete: () => notifier.remove(draft.localId),
          ),
          AppSpacing.gapSm,
        ],
      ],
    );
  }

  /// 제목 수정 다이얼로그. 저장 버튼은 입력이 비어 있으면 비활성(UI 이중 방어).
  /// notifier도 빈 제목을 거부하지만, 저장이 왜 막히는지 UX로 명확히 한다.
  Future<void> _showEditTitleDialog(
    BuildContext context,
    DecomposeNotifier notifier,
    QuestDraft draft,
  ) {
    return showDialog<void>(
      context: context,
      builder: (context) => _EditTitleDialog(draft: draft, notifier: notifier),
    );
  }
}

/// 제목 편집 다이얼로그 — TextField + 취소/저장. 빈 제목이면 저장 비활성.
class _EditTitleDialog extends StatefulWidget {
  const _EditTitleDialog({required this.draft, required this.notifier});

  final QuestDraft draft;
  final DecomposeNotifier notifier;

  @override
  State<_EditTitleDialog> createState() => _EditTitleDialogState();
}

class _EditTitleDialogState extends State<_EditTitleDialog> {
  late final TextEditingController _controller;

  bool get _canSave => _controller.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.draft.title);
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _save() {
    if (!_canSave) return;
    widget.notifier.editTitle(widget.draft.localId, _controller.text);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('퀘스트 제목 수정'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLength: 60,
        textInputAction: TextInputAction.done,
        onSubmitted: (_) => _save(),
        decoration: const InputDecoration(hintText: '퀘스트 제목'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('취소'),
        ),
        FilledButton(onPressed: _canSave ? _save : null, child: const Text('저장')),
      ],
    );
  }
}

/// AI 폴백 안내 — 블루 톤 info 박스. 템플릿 출처일 때만 렌더된다.
class _FallbackBanner extends StatelessWidget {
  const _FallbackBanner();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: scheme.secondaryContainer.withValues(alpha: 0.12),
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: scheme.secondary.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Symbols.info, fill: 1, color: scheme.secondary),
          AppSpacing.gapWSm,
          Expanded(
            child: Text(
              'AI가 잠시 쉬어가요 — 추천 퀘스트로 시작해 볼까요?',
              style: theme.textTheme.bodySmall?.copyWith(color: scheme.secondary),
            ),
          ),
        ],
      ),
    );
  }
}
