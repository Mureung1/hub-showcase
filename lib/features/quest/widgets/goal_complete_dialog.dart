import 'package:flutter/material.dart';

import '../../../core/constants/dialog_art.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/celebration_badge.dart';

/// 목표 완수 연출 (2단계) — 목표(폴더)의 마지막 퀘스트를 완료해 **폴더 전체가
/// 보관함으로 옮겨지는 순간**에만 뜬다.
///
/// 완료 연출·레벨업 연출([LevelUpDialog])·스트릭 연출과 **같은 급의 축하**다. 그래서
/// 시각 언어를 그대로 가져왔다(원형 아이콘 → 제목 → 안내문 → 확인 버튼). 새 규칙을
/// 만들지 않는 것이 요점이다 — 축하가 여러 언어로 갈라지면 사용자가 매번 "이건 뭘
/// 받은 화면이지?"를 다시 읽어야 한다.
///
/// 직접 등록 낱개 이동에는 이 연출이 없다(기존 완료 연출만). 목표를 이룬 것은 낱개
/// 완료보다 큰 사건이라, 폴더째 완료됐을 때만 이 마무리 연출을 얹는다.
///
/// 색 규칙(one-step-design): 원형·제목·확인 버튼 = 그린(성장·완료). 노랑(코인·보상)은
/// 여기 등장하지 않는다 — 목표 완수는 보상 지급이 아니라 성취다.
class GoalCompleteDialog extends StatefulWidget {
  const GoalCompleteDialog({super.key, required this.goalLabel});

  /// 완수한 목표(폴더) 이름. 무엇을 이뤘는지 사용자에게 다시 비춰 준다.
  final String goalLabel;

  @override
  State<GoalCompleteDialog> createState() => _GoalCompleteDialogState();
}

class _GoalCompleteDialogState extends State<GoalCompleteDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _pop;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _pop = CurvedAnimation(parent: _controller, curve: Curves.easeOutBack);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 월계관 메달 배지 — 레벨업·스트릭 연출과 **같은 규격**
            // ([CelebrationBadge]). 완료 연출의 트로피와 구분되는 그림을 써, 완료
            // 축하 바로 뒤에 이어 떠도 "또 같은 화면"으로 읽히지 않게 한다.
            // 폴백 🏅는 정본이 이 자리에 세워 둔 훈장 아이콘과 같은 뜻이다.
            AnimatedBuilder(
              animation: _pop,
              builder: (context, child) => Opacity(
                opacity: _pop.value.clamp(0.0, 1.0),
                child: Transform.scale(scale: _pop.value, child: child),
              ),
              child: const CelebrationBadge(
                asset: DialogArt.goalComplete,
                fallbackEmoji: '🏅',
                semanticLabel: '목표 완수',
              ),
            ),
            AppSpacing.gapMd,
            Text(
              '목표를 이루었어요!',
              style: theme.textTheme.headlineLarge?.copyWith(
                color: scheme.primary,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapSm,
            // 어떤 목표를 완수했는지 되비춰 준다. 긴 목표명도 넘치지 않게 자른다.
            Text(
              widget.goalLabel,
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            AppSpacing.gapSm,
            Text(
              '이 목표의 모든 퀘스트를 끝냈어요.\n보관함에서 확인해 보세요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapLg,
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('좋아요'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 목표 완수 연출을 띄운다. 사용자가 닫을 때까지 기다린다.
///
/// `barrierDismissible: true` — 다른 축하 연출과 같다. 축하는 정보 전달일 뿐이라
/// 아무 데나 눌러도 닫히는 편이 완료 리듬을 끊지 않는다.
Future<void> showGoalCompleteDialog(
  BuildContext context, {
  required String goalLabel,
}) {
  return showDialog<void>(
    context: context,
    builder: (_) => GoalCompleteDialog(goalLabel: goalLabel),
  );
}
