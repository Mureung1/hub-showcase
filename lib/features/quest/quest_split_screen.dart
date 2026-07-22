import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/constants/decompose_limits.dart';
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
/// **재분해 모드 (4주차 B-5).** [target]을 주면 큰 목표 입력 대신 "이미 저장된 퀘스트
/// 하나"를 더 작게 나누는 화면이 된다. null이면 기존 큰 목표 분해 흐름 그대로다.
class QuestSplitScreen extends ConsumerStatefulWidget {
  const QuestSplitScreen({super.key, this.target});

  /// 재분해할 원본 퀘스트. null이면 큰 목표 분해(기존 무인자 진입).
  final RedecomposeTarget? target;

  @override
  ConsumerState<QuestSplitScreen> createState() => _QuestSplitScreenState();
}

class _QuestSplitScreenState extends ConsumerState<QuestSplitScreen> {
  final _goalController = TextEditingController();

  bool get _isRedecompose => widget.target != null;

  /// 분해 요청이 진행 중인지. 중복 탭 방지 + 버튼 스피너의 근거.
  bool _isDecomposing = false;

  /// 목표가 비었거나 공백뿐이면, 또는 이미 분해 중이면 버튼이 눌리지 않는다.
  bool get _canSubmit =>
      _goalController.text.trim().isNotEmpty && !_isDecomposing;

  /// 공백만 입력(비어 있진 않지만 trim하면 빈)일 때만 필드 아래 안내를 띄운다.
  /// 완전히 빈 입력은 아래 정적 안내 박스가 이미 설명하므로 여기선 제외한다 —
  /// 버튼 비활성(막힘)만으론 "왜 안 되는지"가 안 보여서 errorText로 이유를 준다.
  bool get _isWhitespaceOnly =>
      _goalController.text.isNotEmpty && _goalController.text.trim().isEmpty;

  @override
  void initState() {
    super.initState();
    // 버튼 활성 상태를 입력과 동기화한다.
    _goalController.addListener(() => setState(() {}));

    // 분해 상태는 화면보다 오래 산다(전역 provider). 그래서 **진입 모드와 남아 있는
    // 세션이 어긋나는 경우**를 진입 시점에 정리한다. build 중에는 provider를 바꿀 수
    // 없어 첫 프레임 뒤로 미룬다.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final notifier = ref.read(decomposeNotifierProvider.notifier);
      final target = widget.target;

      if (target != null) {
        // 재분해 모드: 목표를 타이핑할 이유가 없으므로 곧바로 나눈다.
        notifier.redecomposeQuest(target);
        return;
      }
      // 큰 목표 분해로 들어왔는데 직전 재분해 세션이 남아 있으면 비운다.
      // 그대로 두면 그 결과를 등록했을 때 엉뚱한 퀘스트의 자식이 만들어진다.
      if (ref.read(decomposeNotifierProvider).valueOrNull?.isRedecompose ??
          false) {
        notifier.reset();
      }
    });
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

  /// 편집이 끝난 초안 목록을 확정 등록한다. 성공하면 퀘스트 목록으로 pop하고,
  /// 실패하면 스낵바로 안내하며 편집 결과를 유지한다.
  ///
  /// 성공 스낵바는 pop 뒤 목록 위에 뜬다 — 그래서 messenger를 await 전에 잡아 둔다
  /// (앱 레벨 ScaffoldMessenger라 이 화면이 사라져도 살아 있다).
  Future<void> _register() async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await ref.read(decomposeNotifierProvider.notifier).confirm();
    if (!mounted) return;
    if (ok) {
      // 목록으로 복귀 → questListProvider 스트림이 방금 저장한 퀘스트로 자동 갱신된다.
      context.pop();
      messenger.showSnackBar(
        const SnackBar(content: Text('퀘스트를 등록했어요.')),
      );
    } else {
      // 실패: 편집 결과는 그대로 보존되므로 화면은 유지되고 스낵바만 안내한다.
      messenger.showSnackBar(
        const SnackBar(content: Text('등록에 실패했어요. 잠시 후 다시 시도해 주세요.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final decomposeState = ref.watch(decomposeNotifierProvider);
    // 등록 바는 보여줄 결과가 있을 때만 뜬다(초기·로딩·빈 결과에는 없음).
    final result = decomposeState.valueOrNull;
    final hasResult = result != null && result.drafts.isNotEmpty;

    final target = widget.target;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isRedecompose ? '멈춘 퀘스트 다시 나누기' : 'AI 도전 분해'),
      ),
      // 스크롤과 무관하게 항상 보이도록 등록 버튼은 본문이 아니라 하단 바에 둔다.
      bottomNavigationBar: hasResult
          ? _RegisterBar(isSaving: result.isSaving, onRegister: _register)
          : null,
      body: SafeArea(
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            // 재분해 모드에서는 목표 입력란을 띄우지 않는다 — 대상은 이미 정해져
            // 있고, 사용자가 제목을 다시 타이핑할 이유가 없다.
            if (target != null)
              _RedecomposeCard(target: target)
            else
              _SplitterCard(
                controller: _goalController,
                isDecomposing: _isDecomposing,
                canSubmit: _canSubmit,
                isWhitespaceOnly: _isWhitespaceOnly,
                onSubmit: _submit,
              ),
            AppSpacing.gapLg,
            // 결과 영역: 초기(null)엔 아무것도, 로딩엔 블루 인디케이터, 데이터엔 목록.
            decomposeState.when(
              loading: () => const _DecomposingView(),
              // decompose는 상태를 error로 두지 않지만(항상 폴백), 방어적으로 처리한다.
              error: (error, _) => ErrorView(
                message: '퀘스트를 나누지 못했어요.',
                onRetry: target != null
                    ? () => ref
                          .read(decomposeNotifierProvider.notifier)
                          .redecomposeQuest(target)
                    : (_canSubmit ? _submit : null),
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
                        // 재분해 세션이면 같은 원본을 다시 나눈다. decompose를 부르면
                        // 목표 전체가 새로 쪼개져 대상이 바뀌어 버린다.
                        : () => target != null
                              ? ref
                                    .read(decomposeNotifierProvider.notifier)
                                    .redecomposeQuest(target)
                              : ref
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

/// 재분해 대상 카드 — 입력 필드 대신 **원본 퀘스트 제목**을 보여준다 (B-5).
///
/// 여기서 사용자가 할 일은 "무엇을 나눌지 정하는 것"이 아니라 "나눈 결과를 확인하는
/// 것"이다. 그래서 입력·버튼이 없고, 진입과 동시에 분해가 시작된다.
/// 목표 맥락을 함께 보여 주는 이유: AI에 넘긴 맥락이 무엇인지 사용자도 알아야
/// 결과가 엉뚱할 때 원인을 짐작할 수 있다.
class _RedecomposeCard extends StatelessWidget {
  const _RedecomposeCard({required this.target});

  final RedecomposeTarget target;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final goalText = target.goalText;

    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // AI = 블루 아이콘 타일(_SplitterCard와 같은 규칙).
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: scheme.secondaryContainer,
                  borderRadius: AppRadius.mdAll,
                ),
                child: Icon(
                  Symbols.alt_route,
                  fill: 1,
                  color: scheme.onSecondary,
                ),
              ),
              AppSpacing.gapWMd,
              Expanded(
                child: Text('막힌 퀘스트 나누기', style: theme.textTheme.headlineMedium),
              ),
            ],
          ),
          AppSpacing.gapMd,
          Text(
            '여기서 막혔군요. 이 퀘스트를 오늘 할 수 있는 크기로 더 나눠드릴게요.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.gapMd,
          Container(
            width: double.infinity,
            padding: AppSpacing.cardPadding,
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHigh,
              borderRadius: AppRadius.mdAll,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '나눌 퀘스트',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                AppSpacing.gapXs,
                Text(target.questTitle, style: theme.textTheme.bodyLarge),
                if (goalText != null) ...[
                  AppSpacing.gapSm,
                  Row(
                    children: [
                      Icon(
                        Symbols.target,
                        size: _contextIconSize,
                        color: scheme.secondary,
                      ),
                      AppSpacing.gapWXs,
                      Expanded(
                        child: Text(
                          goalText,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: scheme.secondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// bodySmall과 눈높이를 맞춘 맥락 아이콘 크기.
const double _contextIconSize = 14;

/// 입력 카드 — 블루 AI 타일 + 제목 + 설명 + 입력 필드 + 그린 분해 버튼 + 안내 박스.
class _SplitterCard extends StatelessWidget {
  const _SplitterCard({
    required this.controller,
    required this.isDecomposing,
    required this.canSubmit,
    required this.isWhitespaceOnly,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final bool isDecomposing;
  final bool canSubmit;

  /// 공백만 입력이라 분해가 막힌 상태. TextField 아래 errorText로 이유를 보여준다.
  final bool isWhitespaceOnly;
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
            decoration: InputDecoration(
              hintText: '예: 공모전 지원하기',
              prefixIcon: const Icon(Symbols.target),
              // 공백만 입력일 때만 이유를 노출한다. 색은 테마 error(빨강)를 그대로 —
              // 노랑은 보상 전용이라 여기 쓰지 않는다(one-step-design 색 역할).
              errorText: isWhitespaceOnly ? '공백만으로는 분해할 수 없어요' : null,
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

/// 분해 결과 섹션 — 섹션 제목 + "다시 나누기"(전체 재생성) + (템플릿일 때만) 폴백 배너 + draft 카드 목록.
///
/// 각 카드에 편집 콜백(제목 수정·난이도 변경·삭제)을 배선한다. 편집은 [DecomposeNotifier]의
/// 순수 메모리 조작이라 저장이 아니다.
///
/// "다시 나누기"는 같은 목표로 전체 재생성한다. AI 재요청이므로 **블루**(secondary)
/// 아웃라인이다. 재생성 중에도 카드는 그대로 보이고(전체 로딩으로 숨기지 않음), 재생성
/// 실패 시 기존 결과가 보존되며 스낵바만 뜬다. 확정 저장·개별 재생성 버튼은 이후 커밋 몫이다.
class _ResultSection extends ConsumerWidget {
  const _ResultSection({required this.state});

  final DecomposeState state;

  Future<void> _regenerate(BuildContext context, WidgetRef ref) async {
    final ok = await ref
        .read(decomposeNotifierProvider.notifier)
        .regenerateAll();
    // 실패해도 기존 결과가 남아 있으므로 화면은 유지되고 스낵바만 안내한다.
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('다시 나누지 못했어요. 기존 결과를 유지할게요.')),
      );
    }
  }

  /// 초안 하나를 더 작게 재분해한다. 성공하면 그 카드가 하위 퀘스트 여러 개로 교체되고,
  /// 실패하면 원본 항목이 그대로 남으며 스낵바만 안내한다(_regenerate와 동형).
  Future<void> _redecompose(
    BuildContext context,
    WidgetRef ref,
    String localId,
  ) async {
    final ok = await ref
        .read(decomposeNotifierProvider.notifier)
        .redecomposeOne(localId);
    if (!context.mounted) return;
    if (ok) {
      // #6 성공: 몇 개로 나눠졌는지 스낵바로 알린다. count는 방금 세팅된 하이라이트
      // 집합 크기(= 새로 생긴 하위 초안 수)에서 읽는다. 칩과 같은 근거라 항상 일치한다.
      final count =
          ref.read(decomposeNotifierProvider).valueOrNull?.justSplitIds.length ??
          0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('1개를 $count개로 나눴어요')),
      );
    } else {
      // 실패: 원본 항목이 그대로 남으며 스낵바만 안내한다(현행 유지).
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('이 항목을 더 나누지 못했어요. 그대로 둘게요.')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(decomposeNotifierProvider.notifier);

    // #5 폴백(템플릿)일 때는 "이게 추천 대체 결과"임이 드러나게 제목을 바꾼다.
    // AI 결과는 현행("이렇게 나눠봤어요") 유지.
    final isTemplate = state.source == DecomposeSource.template;
    final sectionTitle = isTemplate
        ? '추천 퀘스트로 준비했어요 · ${state.drafts.length}개'
        : '이렇게 나눠봤어요 · ${state.drafts.length}개';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(sectionTitle, style: theme.textTheme.titleLarge),
        AppSpacing.gapSm,
        // "다시 나누기"는 제목 아래 우측 정렬. Align이 버튼에 유한(bounded) 제약을 주므로
        // Row의 무한-너비 측정 문제 없이 안전하게 shrink-wrap된다.
        Align(
          alignment: Alignment.centerRight,
          child: _RegenerateButton(
            isRegenerating: state.isRegenerating,
            // #5 템플릿 폴백이면 "다시 AI로 나누기"로 의도를 명확히 한다(현재는 템플릿,
            // 이 버튼을 누르면 AI 재시도). AI 결과면 현행 "다시 나누기".
            isTemplate: isTemplate,
            onPressed: () => _regenerate(context, ref),
          ),
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
            // #3 계보 2번 제한 도달 시 🔄를 숨긴다(콜백 null → QuestDraftCard가 버튼
            // 자체를 렌더하지 않음). notifier도 가드하지만 버튼부터 사라져 명확하다.
            onReDecompose: draft.redecomposeCount >= kMaxRedecomposeCount
                ? null
                : () => _redecompose(context, ref, draft.localId),
            isReDecomposing: state.regeneratingItemId == draft.localId,
            // #6 방금 재분해로 갓 생겨난 하위 초안이면 "방금 나눔" 칩을 띄운다.
            isJustSplit: state.justSplitIds.contains(draft.localId),
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

/// 하단 등록 바 — 결과가 있을 때만 뜨는 전폭 그린 "등록하기" 버튼.
///
/// 확정 등록은 **주요 행동**이라 그린(`FilledButton` 기본 = `colorScheme.primary`)이다.
/// 저장 중이면 비활성 + 스피너로 중복 탭 방지를 시각화한다(요청은 한 번만 나간다).
/// SafeArea로 홈 인디케이터 영역을 피하고, 화면 좌우 여백과 같은 리듬을 준다.
class _RegisterBar extends StatelessWidget {
  const _RegisterBar({required this.isSaving, required this.onRegister});

  final bool isSaving;
  final VoidCallback onRegister;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

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
          // 저장 중엔 눌리지 않는다(중복 탭 방지).
          onPressed: isSaving ? null : onRegister,
          child: isSaving
              // 저장 중: 버튼 자리에 스피너. 주요 행동이라 onPrimary 톤.
              ? SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: scheme.onPrimary,
                  ),
                )
              : const Text('등록하기'),
        ),
      ),
    );
  }
}

/// "다시 나누기" 버튼 — 같은 목표로 전체 재생성. AI 재요청이라 **블루**(secondary) 아웃라인.
///
/// 재생성 중이면 비활성 + 블루 스피너로 중복요청 방지를 시각화한다(요청은 한 번만 나간다).
class _RegenerateButton extends StatelessWidget {
  const _RegenerateButton({
    required this.isRegenerating,
    required this.isTemplate,
    required this.onPressed,
  });

  final bool isRegenerating;

  /// 현재 결과가 템플릿 폴백인지. true면 라벨을 "다시 AI로 나누기"로 바꿔
  /// "지금은 템플릿, 이 버튼으로 AI 재시도"라는 의도를 명확히 한다(#5).
  final bool isTemplate;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // 헤더 Row(부모)가 비-flex 자식을 무한 너비로 측정하므로, .icon 변형(내부 Row가
    // 무한 확장) 대신 MainAxisSize.min Row를 직접 넣어 안전하게 shrink-wrap한다.
    return OutlinedButton(
      // 재생성 중엔 눌리지 않는다(중복요청 방지).
      onPressed: isRegenerating ? null : onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: scheme.secondary,
        side: BorderSide(color: scheme.secondary.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          isRegenerating
              ? SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: scheme.secondary,
                  ),
                )
              : const Icon(Symbols.refresh, size: 18),
          AppSpacing.gapWXs,
          Text(isTemplate ? '다시 AI로 나누기' : '다시 나누기'),
        ],
      ),
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
              'AI 연결이 잠시 원활하지 않아 대표 템플릿으로 준비했어요. 아래에서 다시 AI로 나눠볼 수 있어요.',
              style: theme.textTheme.bodySmall?.copyWith(color: scheme.secondary),
            ),
          ),
        ],
      ),
    );
  }
}
