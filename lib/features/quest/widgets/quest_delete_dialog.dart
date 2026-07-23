import 'package:flutter/material.dart';

import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';

/// 퀘스트 삭제 확인 다이얼로그 (4주차 B-5b).
///
/// 삭제는 되돌릴 수 없으므로 **자식 유무와 무관하게** 확인을 항상 둔다(오탭 방지).
/// [childCount] > 0이면 = 재분해 원본이라, 함께 사라질 하위 퀘스트 수를 경고에
/// 덧붙인다. N은 화면이 `descendantIds`로 계산한 계보 크기다.
///
/// 색 규칙(one-step-design): 파괴적 동작이므로 삭제 버튼은 `error` 계열
/// (오류·어려움 난이도에 쓰는 그 색)이다. 취소는 중립.
///
/// 반환: `true`(삭제 확정) · `false`(취소) · `null`(바깥 탭·뒤로가기 = 취소로 취급).
class QuestDeleteDialog extends StatelessWidget {
  const QuestDeleteDialog({
    super.key,
    required this.questTitle,
    required this.childCount,
  });

  final String questTitle;

  /// 이 퀘스트와 함께 지워질 하위 퀘스트 수(계보). 0이면 단건 삭제.
  final int childCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final hasChildren = childCount > 0;

    return AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      title: const Text('삭제할까요?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            questTitle,
            style: theme.textTheme.bodyLarge,
          ),
          AppSpacing.gapSm,
          Text(
            hasChildren
                // 재분해 원본 — 함께 사라질 계보 수를 밝힌다. 이걸 안 알리면
                // 사용자는 하위 퀘스트가 조용히 없어진 걸 나중에야 발견한다.
                ? '이 퀘스트를 지우면 재분해한 하위 퀘스트 $childCount개도 함께 삭제돼요. '
                      '되돌릴 수 없어요.'
                : '삭제하면 되돌릴 수 없어요.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('취소'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: scheme.error,
            foregroundColor: scheme.onError,
          ),
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('삭제'),
        ),
      ],
    );
  }
}

/// 삭제 확인 다이얼로그를 띄운다.
///
/// 반환 `true`만 삭제 진행이다 — `false`·`null`(dismiss)은 취소로 취급한다.
Future<bool?> showQuestDeleteDialog(
  BuildContext context, {
  required String questTitle,
  required int childCount,
}) {
  return showDialog<bool>(
    context: context,
    builder: (_) =>
        QuestDeleteDialog(questTitle: questTitle, childCount: childCount),
  );
}
