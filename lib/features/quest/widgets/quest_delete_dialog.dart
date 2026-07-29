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

    // 프로젝트 다이얼로그 관례(`Dialog` + 직접 레이아웃)를 따른다 — 수정
    // 다이얼로그와 동일한 하단 Row + Expanded 2개 버튼 배치를 공유한다.
    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 정본 `123:631` — 무엇을 지우는지 제목에 밝힌다("삭제할까요?"만으로는
            // 목록에서 무엇을 눌렀는지 놓친 사용자가 대상을 못 짚는다).
            Text('퀘스트를 삭제할까요?', style: theme.textTheme.headlineMedium),
            AppSpacing.gapMd,
            Text(
              questTitle,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            AppSpacing.gapMd,

            // 경고를 둥근 박스로 감싸 본문과 구분한다.
            _WarningBox(childCount: childCount),
            AppSpacing.gapLg,

            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('취소'),
                  ),
                ),
                AppSpacing.gapWSm,
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: scheme.error,
                      foregroundColor: scheme.onError,
                    ),
                    onPressed: () => Navigator.of(context).pop(true),
                    child: const Text('삭제'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 삭제 경고를 둥근 `errorContainer` 틴트 박스로 감싼다.
///
/// 정본(`136:699` 단건 · `136:701` 하위 포함)은 **두 경우가 같은 상자**다 — 틴트도
/// 아이콘도 갈리지 않고 **문구만** 다르다. 단건 삭제를 중립 틴트로 낮춰 두면
/// "이건 가벼운 동작"으로 읽히는데, 되돌릴 수 없다는 점은 자식 유무와 무관하다.
///
/// 아이콘도 두지 않는다(정본에 없다). 붉은 면 자체가 이미 경고 신호라, 그 위에
/// 경고 아이콘을 겹치면 신호가 두 겹이 되고 글줄 폭만 줄어든다.
class _WarningBox extends StatelessWidget {
  const _WarningBox({required this.childCount});

  final int childCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final message = childCount > 0
        // 재분해 원본 — 함께 사라질 계보 수를 밝힌다. 이걸 안 알리면
        // 사용자는 하위 퀘스트가 조용히 없어진 걸 나중에야 발견한다.
        ? '하위 퀘스트 $childCount개도 함께 삭제돼요.\n삭제 후에는 모두 복구할 수 없어요.'
        : '삭제 후에는 복구할 수 없어요.';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.smd),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: AppRadius.mdAll,
      ),
      child: Text(
        message,
        style: theme.textTheme.bodySmall?.copyWith(
          color: scheme.onErrorContainer,
        ),
      ),
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
