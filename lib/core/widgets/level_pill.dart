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
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    // ⚠️ **다크에는 정본이 없다.** 라이트의 "옅은 그린 틴트 + 진한 그린 글자"를
    // 다크에 그대로 쓰면 어두운 이름표 판 위에 흰 알약이 뜬다(pill 자체 대비는
    // 5.89:1로 멀쩡하지만 주변과 완전히 갈라진다).
    //
    // [QuestSourceChip]이 이미 쓰는 처방을 그대로 가져온다 — 옅은 틴트 + 진한 글자를
    // **채운 컨테이너 + 밝은 전경**으로 뒤집는다. 그린 계열의 그 쌍이 다크 스킴의
    // `primaryContainer`(`#006e2f`) / `onPrimaryContainer`(`#ffffff`)다(6.42:1).
    // 라이트 렌더는 바뀌지 않는다.
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.smd,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: isDark ? scheme.primaryContainer : AppColors.primarySurface,
        borderRadius: AppRadius.fullAll,
      ),
      child: Text(
        'Lv.$level',
        style: AppTypography.numericLabelMedium.copyWith(
          color: isDark ? scheme.onPrimaryContainer : AppColors.primary,
        ),
      ),
    );
  }
}
