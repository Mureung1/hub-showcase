import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/growth_rules.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/pixel_art.dart';

/// 환생 **확인** 다이얼로그.
///
/// 환생은 레벨을 Lv.1로 되돌리는 되돌릴 수 없는 동작이라, 실행 전에 한 번 묻는다
/// (완료·삭제 확인과 같은 정신). 다만 프레이밍은 손해가 아니라 훈장이다 — 무엇이
/// **유지되는지**를 분명히 알려 "레벨을 잃는다"는 오해를 막는다.
///
/// 반환: 사용자가 확인하면 `true`, 취소하거나 바깥을 탭하면 `false`/`null`.
Future<bool?> showRebirthConfirmDialog(BuildContext context) {
  return showDialog<bool>(
    context: context,
    builder: (dialogContext) {
      final theme = Theme.of(dialogContext);
      final scheme = theme.colorScheme;
      return AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
        icon: Icon(Symbols.refresh, size: 32, color: scheme.primary),
        title: const Text('환생할까요?', textAlign: TextAlign.center),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '레벨이 Lv.1로 초기화돼요.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapSm,
            Text(
              '코인·아이템·성취 기록·환생 표식은 그대로 남아요.\n'
              '환생을 거듭하면 새로운 계열이 열려요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actionsAlignment: MainAxisAlignment.spaceBetween,
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('아직요'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('환생하기'),
          ),
        ],
      );
    },
  );
}

/// 환생 **연출** 다이얼로그 — "환생했어요!" + 새 계열 캐릭터 + 등급.
///
/// 레벨업(`LevelUpDialog`)·진화(`EvolveDialog`) 연출과 **같은 시각 언어**를 쓴다
/// (원형/캐릭터 팝 → 제목 → 강조 → 확인 버튼). 새 규칙을 만들지 않는다.
///
/// 계열이 새로 열리는 순간(환생 3·6회)에는 "용/피닉스 계열 해금" 강조를 얹는다.
///
/// 색 규칙(one-step-design): 원형·제목·강조·확인 버튼 = 그린(성장). **노랑은 환생
/// 표식에 쓰지 않는다**(노랑은 코인·보상·스트릭 전용).
class RebirthCelebrationDialog extends StatefulWidget {
  const RebirthCelebrationDialog({super.key, required this.newRebirth});

  /// 환생 **후**의 누적 환생 횟수(rebirth+1).
  final int newRebirth;

  @override
  State<RebirthCelebrationDialog> createState() =>
      _RebirthCelebrationDialogState();
}

class _RebirthCelebrationDialogState extends State<RebirthCelebrationDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _pop;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 700),
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

    // 환생 직후 캐릭터 = 새 계열의 1단계(Lv.1). 계열이 바뀌었으면 새 알로 보인다.
    final stage = stageOf(1, rebirth: widget.newRebirth);
    final unlocked = unlockedFamily(widget.newRebirth);

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 새 계열 캐릭터가 튕겨 나온다(진화 연출의 강조 규격 재사용).
            AnimatedBuilder(
              animation: _pop,
              builder: (context, child) => Transform.scale(
                scale: _pop.value.clamp(0.0, 2.0),
                child: Opacity(
                  opacity: _pop.value.clamp(0.0, 1.0),
                  child: child,
                ),
              ),
              child: PixelArt.emoji(
                asset: stage.asset,
                emoji: stage.emoji,
                size: 76,
                semanticLabel: stage.name,
              ),
            ),
            AppSpacing.gapMd,
            Text(
              '환생했어요!',
              style: theme.textTheme.headlineLarge?.copyWith(
                color: scheme.primary,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.gapSm,
            // 환생 등급 표식 — "손해가 아닌 훈장".
            _RebirthBadge(title: rebirthTitle(widget.newRebirth)),
            AppSpacing.gapMd,
            Text(
              '레벨은 Lv.1로 새로 시작하지만,\n'
              '쌓아 온 코인·아이템·기록은 그대로예요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            // 계열이 새로 열린 환생이면 강조 배너를 얹는다.
            if (unlocked != null) ...[
              AppSpacing.gapMd,
              _FamilyUnlockBanner(
                stage: stage,
                familyLabel: characterFamilyLabel(unlocked),
              ),
            ],
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

/// 환생 등급 칩 (★ + 타이틀). 그린 틴트 — 노랑은 쓰지 않는다.
class _RebirthBadge extends StatelessWidget {
  const _RebirthBadge({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Symbols.star,
            fill: 1,
            size: 18,
            color: scheme.onPrimaryContainer,
          ),
          AppSpacing.gapWXs,
          Text(
            title,
            style: theme.textTheme.labelLarge?.copyWith(
              color: scheme.onPrimaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}

/// 계열 해금 강조 배너 (환생 3·6회에만 뜬다).
class _FamilyUnlockBanner extends StatelessWidget {
  const _FamilyUnlockBanner({required this.stage, required this.familyLabel});

  /// 새로 열린 계열의 1단계. 자산·폴백 이모지를 함께 들고 있어야 해서 문자열이
  /// 아니라 단계 자체를 받는다.
  final CharacterStage stage;

  final String familyLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer,
        borderRadius: AppRadius.mdAll,
      ),
      child: Column(
        children: [
          PixelArt.emoji(
            asset: stage.asset,
            emoji: stage.emoji,
            size: 32,
            semanticLabel: stage.name,
          ),
          AppSpacing.gapXs,
          Text(
            '$familyLabel 계열이 열렸어요!',
            style: theme.textTheme.titleMedium?.copyWith(
              color: scheme.onSecondaryContainer,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// 환생 연출을 띄운다. 사용자가 닫을 때까지 기다린다.
///
/// `barrierDismissible: true` — 다른 축하 연출과 같다.
Future<void> showRebirthCelebrationDialog(
  BuildContext context, {
  required int newRebirth,
}) {
  return showDialog<void>(
    context: context,
    builder: (_) => RebirthCelebrationDialog(newRebirth: newRebirth),
  );
}
