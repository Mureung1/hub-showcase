import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/dialog_art.dart';
import '../../../core/constants/growth_rules.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_dialog_shell.dart';
import '../../../core/widgets/celebration_badge.dart';
import '../../../core/widgets/pixel_art.dart';

/// 환생 **확인** 다이얼로그.
///
/// 환생은 레벨을 Lv.1로 되돌리는 되돌릴 수 없는 동작이라, 실행 전에 한 번 묻는다
/// (완료·삭제 확인과 같은 정신). 다만 프레이밍은 손해가 아니라 훈장이다 — 무엇이
/// **유지되는지**를 분명히 알려 "레벨을 잃는다"는 오해를 막는다.
///
/// 정본 `123:617`. 축하 연출과 달리 **배지가 없고 왼쪽 정렬**이며, 유지·해금 안내는
/// 틴트 박스에 담긴다 — 퀘스트 삭제 확인(`123:630`)과 같은 골격이다. 확인을 묻는
/// 자리끼리 형태를 맞춰 두면 "지금은 읽고 고르는 화면"이 한눈에 구분된다.
///
/// 반환: 사용자가 확인하면 `true`, 취소하거나 바깥을 탭하면 `false`/`null`.
Future<bool?> showRebirthConfirmDialog(BuildContext context) {
  return showDialog<bool>(
    context: context,
    builder: (dialogContext) {
      final theme = Theme.of(dialogContext);
      final scheme = theme.colorScheme;
      // 본문 스크롤은 [AppDialogShell]이 쥔다. 예전에는 이 다이얼로그만 손으로
      // `SingleChildScrollView`를 챙겼고 나머지 8곳이 빠져 있었다 — 같은 처방을
      // 파일마다 복붙한 것이 애초의 사고 원인이라 셸로 합쳤다.
      return AppDialogShell(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('환생할까요?', style: theme.textTheme.headlineMedium),
          AppSpacing.gapMd,
          Text('레벨 1 · XP 0으로 돌아가요.', style: theme.textTheme.bodyLarge),
          AppSpacing.gapMd,
          // 유지·해금 안내 — 삭제 확인의 경고 박스와 같은 형태를 쓰되,
          // 파괴가 아니라 안심시키는 정보라 중립 틴트다(정본 `137:699`).
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.smd),
            decoration: BoxDecoration(
              // 보더 없는 박스라 채움만으로 다이얼로그 면과 갈라져야 한다.
              // 다크는 `surfaceContainerLow`가 면과 L* 차 2.8뿐이라 붙어 버린다
              // ([AppSurfaceRoles.insetSurface]가 다크에서만 한 단 올린다).
              color: scheme.insetSurface,
              borderRadius: AppRadius.mdAll,
            ),
            child: Text(
              '코인·아이템·성취 기록은 유지돼요.\n'
              '환생 표식이 쌓이면 새 계열이 열려요.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
          ),
          AppSpacing.gapLg,
          // 정본은 오른쪽 정렬 + 내용 폭 버튼이지만, 이 앱의 확인 다이얼로그는
          // 삭제 확인과 함께 **Expanded 2개**로 통일한다 — 큰 글꼴 배율에서
          // 내용 폭 버튼 두 개가 좁은 화면 폭을 넘기기 때문이다(4주차 배율 결함
          // 정리에서 확인). 순서·라벨·색은 정본 그대로다.
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: const Text('아니요'),
                ),
              ),
              AppSpacing.gapWSm,
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.of(dialogContext).pop(true),
                  child: const Text('환생하기'),
                ),
              ),
            ],
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

    // 환생 직후 캐릭터 = 새 계열의 1단계(Lv.1). 계열이 새로 열린 환생에서만
    // 해금 배너가 이 캐릭터를 보여 준다.
    final stage = stageOf(1, rebirth: widget.newRebirth);
    final unlocked = unlockedFamily(widget.newRebirth);

    return AppDialogShell(
      children: [
        // 환생 표식(별) 배지가 튕겨 나온다 — 다른 축하 연출과 같은 규격
        // ([CelebrationBadge]). 폴백 ⭐는 정본이 이 자리에 세워 둔
        // `Symbols.auto_awesome`(및 아래 등급 칩의 ★)과 같은 뜻이다.
        //
        // ⚠️ 예전에는 여기에 **새 계열 캐릭터**를 세웠다. 정본 `122:646`은 배지를
        // 그리므로 정본을 따랐고, 계열이 실제로 바뀌는 환생에서는 아래
        // [_FamilyUnlockBanner]가 새 캐릭터를 그대로 보여 준다.
        AnimatedBuilder(
          animation: _pop,
          builder: (context, child) => Transform.scale(
            scale: _pop.value.clamp(0.0, 2.0),
            child: Opacity(opacity: _pop.value.clamp(0.0, 1.0), child: child),
          ),
          child: const CelebrationBadge(
            asset: DialogArt.rebirth,
            fallbackEmoji: '⭐',
            semanticLabel: '환생',
          ),
        ),
        AppSpacing.gapMd,
        Text(
          '환생했어요!',
          style: theme.textTheme.headlineLarge?.copyWith(color: scheme.primary),
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
      // `mainAxisSize.min`만으로는 넘침을 못 막는다 — 등급 타이틀이 길면
      // ('Master Scholar'·'Grand Scholar') 고유 폭이 다이얼로그 안쪽 폭을 넘어
      // **배율 1.0 · 320dp에서 이미 잘렸다.** 이 앱에서 아무 설정도 안 한
      // 사용자에게 보이던 유일한 배율 결함이라, 본문 세로 스크롤([AppDialogShell])과
      // **별개로** 이 줄 자체가 접혀야 한다. 홈·MY의 [RebirthBadge]가 같은 이유로
      // 이미 쓰고 있는 처방이다(`core/widgets/rebirth_badge.dart`).
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
          Flexible(
            child: Text(
              title,
              style: theme.textTheme.labelLarge?.copyWith(
                color: scheme.onPrimaryContainer,
              ),
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
