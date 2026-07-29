import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/constants/growth_rules.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_dialog_shell.dart';
import '../../../core/widgets/pixel_art.dart';

/// 진화 연출 — `{이전 단계} → {새 단계}` 캐릭터 전환.
///
/// 진화는 며칠에 한 번 오는 사건이라 **가장 강한 연출** 자격이 있다(완료·레벨업보다
/// 캐릭터 이모지를 크게, 전환을 또렷하게). 그래도 시각 언어의 뼈대는 다른 축하와
/// 같다(원형/캐릭터 → 제목 → 확인 버튼) — 새 규칙을 만들지 않는다.
///
/// 완료 → (레벨업) → **진화** 순서의 마지막에 뜬다. 진화가 있었다면 레벨업도 반드시
/// 있었으므로(단계 경계는 레벨 상승으로만 넘는다) 순서가 자연스럽다.
///
/// 캐릭터는 단계별 도트아트 자산이고, 못 읽으면 `CharacterStage.emoji`로 떨어진다
/// (`PixelArt`가 그 폴백을 전담한다).
///
/// 색 규칙(one-step-design): 원형·제목·확인 버튼 = 그린(성장). 노랑은 등장하지 않는다.
class EvolveDialog extends StatefulWidget {
  const EvolveDialog({
    super.key,
    required this.fromStage,
    required this.toStage,
  });

  /// 진화 **전** 단계.
  final CharacterStage fromStage;

  /// 진화 **후** 단계.
  final CharacterStage toStage;

  @override
  State<EvolveDialog> createState() => _EvolveDialogState();
}

class _EvolveDialogState extends State<EvolveDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  /// 이전 캐릭터가 옅어지는 동안 새 캐릭터가 튕겨 나온다.
  late final Animation<double> _reveal;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 900),
      vsync: this,
    );
    _reveal = CurvedAnimation(parent: _controller, curve: Curves.easeOutBack);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// 한글 목적격 부사격 조사 '(으)로'. 받침 없음·ㄹ받침이면 '로', 그 외 '으로'.
  /// 현재 단계명(알·참새·매·독수리…)은 전부 '로'지만, 자산 교체로 이름이 바뀌어도
  /// 문장이 깨지지 않게 규칙으로 처리한다.
  String _ro(String word) {
    if (word.isEmpty) return '로';
    final code = word.characters.last.runes.last;
    if (code >= 0xAC00 && code <= 0xD7A3) {
      final jongseong = (code - 0xAC00) % 28;
      // 0 = 받침 없음, 8 = ㄹ받침 → '로'.
      return (jongseong == 0 || jongseong == 8) ? '로' : '으로';
    }
    return '로';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final particle = _ro(widget.toStage.name);

    return AppDialogShell(
      children: [
        // 이전 단계 → 새 단계. 캐릭터를 크게 세워 전환을 주인공으로.
        // 이 줄은 캐릭터 그림(44·76)과 아이콘(28)뿐이라 글꼴 배율을 타지 않는다
        // — 레벨업의 `Lv. → Lv.` 줄과 달리 `Row` 그대로 둔다.
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _reveal,
              builder: (context, child) => Opacity(
                // 이전 캐릭터는 점점 옅어진다(전환 강조).
                opacity: (1.0 - _reveal.value * 0.6).clamp(0.0, 1.0),
                child: child,
              ),
              child: PixelArt.emoji(
                asset: widget.fromStage.asset,
                emoji: widget.fromStage.emoji,
                size: 44,
                semanticLabel: widget.fromStage.name,
              ),
            ),
            AppSpacing.gapWSm,
            Icon(
              Symbols.arrow_forward,
              size: 28,
              color: scheme.onSurfaceVariant,
            ),
            AppSpacing.gapWSm,
            // 새 캐릭터는 튕겨 나온다 — 가장 강한 강조.
            AnimatedBuilder(
              animation: _reveal,
              builder: (context, child) => Transform.scale(
                scale: _reveal.value.clamp(0.0, 2.0),
                child: Opacity(
                  opacity: _reveal.value.clamp(0.0, 1.0),
                  child: child,
                ),
              ),
              child: PixelArt.emoji(
                asset: widget.toStage.asset,
                emoji: widget.toStage.emoji,
                size: 76,
                semanticLabel: widget.toStage.name,
              ),
            ),
          ],
        ),
        AppSpacing.gapMd,
        Text(
          '${widget.toStage.name}$particle 진화했어요!',
          style: theme.textTheme.headlineLarge?.copyWith(color: scheme.primary),
          textAlign: TextAlign.center,
        ),
        AppSpacing.gapSm,
        Text(
          '${widget.fromStage.name}에서 ${widget.toStage.name}$particle,\n'
          '캐릭터가 한 단계 더 자랐어요.',
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
    );
  }
}

/// 진화 연출을 띄운다. 사용자가 닫을 때까지 기다린다.
///
/// `barrierDismissible: true` — 다른 축하 연출과 같다.
Future<void> showEvolveDialog(
  BuildContext context, {
  required CharacterStage fromStage,
  required CharacterStage toStage,
}) {
  return showDialog<void>(
    context: context,
    builder: (_) => EvolveDialog(fromStage: fromStage, toStage: toStage),
  );
}
