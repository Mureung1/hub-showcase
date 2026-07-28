import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/gradient_button.dart';

/// 퀘스트 목록 맨 위의 **AI 분해 진입점 카드** (Figma 리디자인 · AI Promo).
///
/// 전에는 라벨 하나짜리 버튼(`AI로 목표 나누기`)이었다. 카드로 키운 이유는
/// plan.md의 2대 핵심 기능 중 하나로 들어가는 문이기 때문이다 — 버튼만 있으면
/// "눌러도 되는 건가"를 사용자가 스스로 추측해야 하지만, 카드는 **무엇을 해 주는지**
/// (본문 한 줄)를 먼저 말하고 나서 문을 연다.
///
/// 색은 🔵 블루 계열로 통일한다(AI = 블루). 좌하단 FAB(수동 등록·그린)와 나란히
/// 놓여도 "AI에게 맡기기 / 내가 직접 쓰기"가 색으로 갈린다.
///
/// ⚠️ **라운드는 24다**(`AppRadius.lg`). 같은 화면·같은 기능의 AI 분해 카드는 12를
/// 쓰는데, 통일하면 안 된다 — 이쪽은 화면 폭을 채우는 배너형 컨테이너고 저쪽은
/// 본문 카드다(Figma 실측이 서로 다르다).
class AiPromoCard extends StatelessWidget {
  const AiPromoCard({super.key, required this.onPressed});

  /// 「분해하기」를 눌렀을 때. 기존 AI 분해 화면 경로를 그대로 재사용한다.
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: AppSpacing.cardPaddingLg,
      decoration: const BoxDecoration(
        color: AppColors.secondarySurface,
        borderRadius: AppRadius.lgAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // 라벨 — 이 카드가 무엇인지. 아이콘과 글자는 한 묶음이라 Row지만,
          // 긴 배율에서 접힐 수 있게 글자 쪽만 Flexible로 둔다.
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Symbols.auto_awesome,
                size: _labelIconSize,
                fill: 1,
                color: scheme.secondary,
              ),
              AppSpacing.gapWXs,
              Flexible(
                child: Text(
                  'AI 도전 분해',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: scheme.secondary,
                  ),
                ),
              ),
            ],
          ),
          AppSpacing.gapSmd,
          Text(
            '큰 목표를 입력하면 오늘 시작할 수 있는 작은 퀘스트로 나눠드려요.',
            style: theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurface),
          ),
          AppSpacing.gapSmd,
          GradientButton(
            onPressed: onPressed,
            style: GradientButtonStyle.ai,
            icon: Symbols.auto_awesome,
            label: '분해하기',
          ),
        ],
      ),
    );
  }
}

/// 라벨(12px) 옆 아이콘 크기 — 글자와 눈높이를 맞춘다.
const double _labelIconSize = 16;
