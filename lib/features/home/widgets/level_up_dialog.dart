import 'package:flutter/material.dart';

import '../../../core/constants/dialog_art.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_dialog_shell.dart';
import '../../../core/widgets/celebration_badge.dart';

/// 레벨업 연출 — `Lv.{from} → Lv.{to}`.
///
/// 완료 연출(`QuestCompleteDialog`)·스트릭 연출(`StreakBonusDialog`)과 **같은 급의
/// 축하**다. 그래서 시각 언어를 그대로 가져왔다(원형 아이콘 → 제목 → 강조 → 확인
/// 버튼). 새 규칙을 만들지 않는 것이 요점이다 — 축하가 세 가지 언어로 갈라지면
/// 사용자가 매번 "이건 뭘 받은 화면이지?"를 다시 읽어야 한다.
///
/// 완료 연출 뒤에 **이어서** 뜬다(레벨이 올랐을 때만). 진화(단계 전환)는 이보다
/// 강한 연출(`EvolveDialog`)이 한 번 더 잇는다.
///
/// 색 규칙(one-step-design): 원형·제목·레벨 강조·확인 버튼 = 그린(성장·완료).
/// 노랑(코인·보상)은 여기 등장하지 않는다 — 레벨은 코인이 아니라 성장이다.
class LevelUpDialog extends StatefulWidget {
  const LevelUpDialog({
    super.key,
    required this.fromLevel,
    required this.toLevel,
  });

  /// 지급 **전** 레벨.
  final int fromLevel;

  /// 지급 **후** 레벨. 다단계 상승도 from→to 한 쌍으로 자연스럽게 표현된다.
  final int toLevel;

  @override
  State<LevelUpDialog> createState() => _LevelUpDialogState();
}

class _LevelUpDialogState extends State<LevelUpDialog>
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

    return AppDialogShell(
      children: [
        // 상승 배지 — 완료·스트릭 연출과 **같은 규격**([CelebrationBadge]).
        // 폴백 📈는 정본이 이 자리에 세워 둔 `Icons.trending_up`과 같은 뜻이다.
        AnimatedBuilder(
          animation: _pop,
          builder: (context, child) => Opacity(
            opacity: _pop.value.clamp(0.0, 1.0),
            child: Transform.scale(scale: _pop.value, child: child),
          ),
          child: const CelebrationBadge(
            asset: DialogArt.levelUp,
            fallbackEmoji: '📈',
            semanticLabel: '레벨 업',
          ),
        ),
        AppSpacing.gapMd,
        Text(
          '레벨 업!',
          style: theme.textTheme.headlineLarge?.copyWith(color: scheme.primary),
          textAlign: TextAlign.center,
        ),
        AppSpacing.gapSm,
        Text(
          '퀘스트를 해내며 한 단계 더 성장했어요.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        AppSpacing.gapMd,
        // Lv.{from} → Lv.{to}. 이전 레벨은 흐리게, 도달한 레벨은 그린 강조.
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            // 보더 없는 강조 박스 — 다크에서 다이얼로그 면과 붙지 않도록
            // [AppSurfaceRoles.insetSurface]가 한 단 올려 준다(라이트는 그대로).
            color: scheme.insetSurface,
            borderRadius: AppRadius.mdAll,
          ),
          // **`Row`가 아니라 `Wrap`이다.** 이 줄은 앱에서 유일하게 **가로**로
          // 넘치는 축하 연출 자리였다(배율 1.3·320dp에서 23px, 2.0·360dp에서
          // 60px). 본문 스크롤([AppDialogShell])은 세로만 풀어 주므로 가로는
          // 이 줄 자체가 접혀야 한다.
          //
          // 글자를 줄이는 처방(`FittedBox(scaleDown)`·배율 클램프)은 쓰지 않는다
          // — 보상 카드에서 같은 처방이 고배율 내부 위계를 뒤집은 전례가 있다
          // (checklist E-4 「커버 공백」). 좁으면 `Lv.3` / `→` / `Lv.5`가 줄을
          // 나눠 서고, 크기는 사용자가 고른 배율 그대로다.
          child: Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.xs,
            children: [
              Text(
                'Lv.${widget.fromLevel}',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
              Icon(
                Icons.arrow_forward,
                size: 24,
                color: scheme.onSurfaceVariant,
              ),
              Text(
                'Lv.${widget.toLevel}',
                style: theme.textTheme.headlineLarge?.copyWith(
                  color: scheme.primary,
                ),
              ),
            ],
          ),
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
    );
  }
}

/// 레벨업 연출을 띄운다. 사용자가 닫을 때까지 기다린다.
///
/// `barrierDismissible: true` — 완료·스트릭 연출과 같다. 축하는 정보 전달일 뿐이라
/// 아무 데나 눌러도 닫히는 편이 완료 리듬을 끊지 않는다.
Future<void> showLevelUpDialog(
  BuildContext context, {
  required int fromLevel,
  required int toLevel,
}) {
  return showDialog<void>(
    context: context,
    builder: (_) => LevelUpDialog(fromLevel: fromLevel, toLevel: toLevel),
  );
}
