import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/reward_chip.dart';
import '../../models/difficulty.dart';
import '../../providers/providers.dart';

/// 퀘스트 등록 화면.
///
/// checklist 1주차:
/// - 제목 미입력 시 등록 버튼이 비활성 또는 오류 메시지가 노출된다 (둘 다 한다)
/// - 난이도를 선택할 수 있고 **기본값이 지정된다** (보통)
/// - 등록 성공 시 목록에 즉시 반영되고 화면이 닫힌다
class QuestCreateScreen extends ConsumerStatefulWidget {
  const QuestCreateScreen({super.key});

  @override
  ConsumerState<QuestCreateScreen> createState() => _QuestCreateScreenState();
}

class _QuestCreateScreenState extends ConsumerState<QuestCreateScreen> {
  final _titleController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  /// 기본값. SegmentedButton은 "선택 없음"을 표현할 수 없으므로 구조적으로 보장된다.
  Difficulty _difficulty = Difficulty.normal;
  DateTime? _deadline;
  bool _submitting = false;

  /// 제목이 비면 등록 버튼이 눌리지 않는다.
  bool get _canSubmit =>
      _titleController.text.trim().isNotEmpty && !_submitting;

  @override
  void initState() {
    super.initState();
    // 버튼 활성 상태를 입력과 동기화한다.
    _titleController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _deadline ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _deadline = picked);
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    // 중복 탭 방지: 제출 중에는 버튼이 비활성화되고 요청이 한 번만 나간다.
    setState(() => _submitting = true);

    try {
      // currentUidProvider를 read하면 안 된다 — 아무도 watch하지 않는 StreamProvider는
      // read 시점에 AsyncLoading이라 uid가 null이고, 등록이 조용히 무시된다.
      // sessionProvider는 익명 로그인 + users 문서 생성까지 끝난 uid를 보장한다.
      final uid = await ref.read(sessionProvider.future);

      await ref
          .read(questRepositoryProvider)
          .createQuest(
            uid,
            title: _titleController.text.trim(),
            difficulty: _difficulty,
            deadline: _deadline,
          );

      if (!mounted) return;

      // go_router의 context.pop() 대신 Navigator를 쓴다 —
      // 위젯 테스트처럼 GoRouter가 없는 트리에서도 안전하게 동작한다.
      final navigator = Navigator.of(context);
      if (navigator.canPop()) {
        navigator.pop();
        return;
      }

      // 되돌아갈 화면이 없으면(테스트 트리 등) 스피너를 풀어 준다.
      // 안 그러면 제출 상태에 영원히 갇힌다.
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

    return Scaffold(
      appBar: AppBar(title: const Text('퀘스트 등록')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: AppSpacing.screenPadding,
            children: [
              Text('무엇을 해볼까요?', style: theme.textTheme.titleLarge),
              AppSpacing.gapMd,

              TextFormField(
                controller: _titleController,
                autofocus: true,
                maxLength: 60,
                enabled: !_submitting,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  hintText: '예: 공모전 공고 3개 찾아보기',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '제목을 입력해 주세요.';
                  }
                  return null;
                },
                onFieldSubmitted: (_) {
                  if (_canSubmit) _submit();
                },
              ),
              AppSpacing.gapMd,

              Text('난이도', style: theme.textTheme.titleLarge),
              AppSpacing.gapSm,
              SegmentedButton<Difficulty>(
                segments: [
                  for (final d in Difficulty.values)
                    ButtonSegment(value: d, label: Text(d.label)),
                ],
                selected: {_difficulty},
                onSelectionChanged: _submitting
                    ? null
                    : (selection) =>
                          setState(() => _difficulty = selection.first),
              ),
              AppSpacing.gapMd,

              // 난이도를 바꾸면 예상 보상도 함께 바뀐다.
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerLow,
                  borderRadius: AppRadius.mdAll,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('예상 보상', style: theme.textTheme.labelMedium),
                    RewardChip(reward: rewardFor(_difficulty)),
                  ],
                ),
              ),
              AppSpacing.gapMd,

              OutlinedButton.icon(
                onPressed: _submitting ? null : _pickDeadline,
                icon: const Icon(Icons.event_outlined),
                label: Text(
                  _deadline == null
                      ? '마감일 선택 (선택 사항)'
                      : '마감 ${_deadline!.month}월 ${_deadline!.day}일',
                ),
              ),
              AppSpacing.gapXl,

              FilledButton(
                // 제목이 비어 있으면 눌리지 않는다.
                onPressed: _canSubmit ? _submit : null,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('등록하기'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
