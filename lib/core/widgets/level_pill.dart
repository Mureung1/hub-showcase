import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';

/// `Lv.12` — 그린 틴트 pill.
///
/// 정본 `LevelPill`(Redesign `47:413`). 실측: 패딩 좌우 12 · 상하 4, full radius,
/// 채움 `tint/easyBg`(= [AppColors.primarySurface] `#e9f9ef`), 글자 `tint/easyFg`
/// (= [AppColors.primary] `#006e2f`), 서체는 Sora 14/600/20 자간 0.14
/// (= [AppTypography.numericLabelMedium]).
///
/// 숫자와 라틴 문자뿐이라 **수치 서체(Sora)** 를 쓴다 — 한글을 넣지 말 것.
///
/// **홈 히어로 이름표와 MY 캐릭터 블록이 같은 pill을 쓴다.** 예전에는 홈의
/// `character_card.dart` 안에 private로만 있어서, MY가 같은 모양을 그리려면
/// 복제해야 했다(복제하면 반드시 어긋난다). 색은 그린 계열만 쓴다 — 레벨은
/// 성장이지 보상이 아니라 🟡 노랑을 쓰지 않는다.
class LevelPill extends StatelessWidget {
  const LevelPill({super.key, required this.level});

  final int level;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.smd,
        vertical: AppSpacing.xs,
      ),
      decoration: const BoxDecoration(
        color: AppColors.primarySurface,
        borderRadius: AppRadius.fullAll,
      ),
      child: Text(
        'Lv.$level',
        style: AppTypography.numericLabelMedium.copyWith(
          color: AppColors.primary,
        ),
      ),
    );
  }
}
