import 'package:flutter/material.dart';

import '../../../core/constants/reward_rules.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/reward_chip.dart';
import '../../../models/difficulty.dart';
import '../../../models/quest.dart';

/// 수정 다이얼로그의 결과 — 사용자가 확정한 **제목·난이도**.
///
/// 다이얼로그는 저장소를 모른다(입력만 모아 돌려준다). `updateQuest` 호출과
/// 실패 처리는 화면이 맡는다 — `QuestMemoResult`/`showQuestMemoSheet`가 완료를
/// 화면에 넘기는 것과 같은 구조다. `null` 반환은 취소(바깥 탭·뒤로가기).
class QuestEditResult {
  const QuestEditResult({required this.title, required this.difficulty});

  final String title;
  final Difficulty difficulty;
}

/// 등록된 퀘스트의 **제목·난이도 수정** 다이얼로그 (4주차 B-5b).
///
/// 입력 규칙은 `QuestCreateScreen`을 그대로 따른다: 제목 60자 상한 + 빈 제목 거부
/// (저장 버튼 비활성 + validator), 난이도 SegmentedButton, 난이도를 바꾸면 예상
/// 보상 미리보기가 함께 갱신된다.
///
/// 색 규칙(one-step-design): 노랑(코인)은 [RewardChip]이 전담한다. 이 파일은
/// 노랑에 직접 접근하지 않는다. 강조·주요 행동은 그린을 쓴다.
class QuestEditDialog extends StatefulWidget {
  const QuestEditDialog({super.key, required this.quest});

  final Quest quest;

  @override
  State<QuestEditDialog> createState() => _QuestEditDialogState();
}

class _QuestEditDialogState extends State<QuestEditDialog> {
  late final TextEditingController _titleController;
  final _formKey = GlobalKey<FormState>();

  late Difficulty _difficulty;

  @override
  void initState() {
    super.initState();
    // 기존 값에서 출발한다 — 수정이지 새 등록이 아니다.
    _titleController = TextEditingController(text: widget.quest.title);
    _difficulty = widget.quest.difficulty;
    // 저장 버튼 활성 상태를 입력과 동기화한다(QuestCreateScreen과 같은 규칙).
    _titleController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  /// 제목이 비면 저장 버튼이 눌리지 않는다(등록 화면과 동일).
  bool get _canSave => _titleController.text.trim().isNotEmpty;

  void _save() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.of(context).pop(
      QuestEditResult(
        title: _titleController.text.trim(),
        difficulty: _difficulty,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // 프로젝트 다이얼로그 관례(`Dialog` + 직접 레이아웃)를 따른다. AlertDialog의
    // actions(OverflowBar)는 폭이 좁으면 버튼을 세로로 쌓아 취소가 저장 위로
    // 올라가므로, 하단 Row + Expanded 2개로 항상 가로 배치를 보장한다.
    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('퀘스트 수정', style: theme.textTheme.titleLarge),
              AppSpacing.gapMd,

              TextFormField(
                controller: _titleController,
                autofocus: true,
                maxLength: 60,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(labelText: '제목'),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '제목을 입력해 주세요.';
                  }
                  return null;
                },
                onFieldSubmitted: (_) {
                  if (_canSave) _save();
                },
              ),
              AppSpacing.gapSm,

              Text('난이도', style: theme.textTheme.titleMedium),
              AppSpacing.gapSm,
              // 좁은 다이얼로그 폭에서 왼쪽 쏠림 없이 가로를 꽉 채운다 — 세그먼트가
              // 폭을 균등 분할해 등록 화면과 시각적으로 일관된다.
              SizedBox(
                width: double.infinity,
                child: SegmentedButton<Difficulty>(
                  segments: [
                    for (final d in Difficulty.values)
                      ButtonSegment(value: d, label: Text(d.label)),
                  ],
                  selected: {_difficulty},
                  onSelectionChanged: (selection) =>
                      setState(() => _difficulty = selection.first),
                ),
              ),
              AppSpacing.gapMd,

              // 난이도를 바꾸면 예상 보상도 함께 바뀐다(등록 화면과 같은 미리보기).
              Container(
                width: double.infinity,
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
              AppSpacing.gapLg,

              // 취소·저장을 가로로 나란히. Expanded 2개라 폭이 좁아도 세로로 쌓이지
              // 않는다(수정·삭제 다이얼로그가 동일 배치를 공유한다).
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('취소'),
                    ),
                  ),
                  AppSpacing.gapWSm,
                  Expanded(
                    child: FilledButton(
                      // 제목이 비어 있으면 눌리지 않는다.
                      onPressed: _canSave ? _save : null,
                      child: const Text('저장'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 수정 다이얼로그를 띄운다. 저장하면 [QuestEditResult], 취소하면 `null`.
Future<QuestEditResult?> showQuestEditDialog(
  BuildContext context, {
  required Quest quest,
}) {
  return showDialog<QuestEditResult>(
    context: context,
    builder: (_) => QuestEditDialog(quest: quest),
  );
}
