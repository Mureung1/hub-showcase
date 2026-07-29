import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../constants/reward_rules.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../theme/reward_colors.dart';

/// 예상 보상 표시 — `🪙 +5 · XP +10`.
///
/// 🟡 노랑 사용 허용 위젯(코인 = 보상). XP는 성장이므로 그린을 쓴다.
///
/// **노랑에 접근할 수 있는 유일한 보상 표시 위젯이다.** 완료 연출처럼 보상을 크게
/// 보여줘야 하는 화면도 새로 노랑을 쓰지 말고 [large]로 이 위젯을 키워 쓴다
/// (색 역할 규칙을 한 곳에 가둬 두기 위해서다 — `test/theme/color_role_test.dart`).
///
/// **레이아웃: `Row`가 아니라 `Wrap`이다.** 예전엔 아이콘·간격·텍스트 5개를 고정폭
/// `Row(mainAxisSize.min)`에 늘어놓아서, 접근성 글꼴 배율을 키운 사용자에게는 텍스트만
/// 커지고 줄바꿈할 곳이 없어 오버플로 줄무늬가 떴다(퀘스트 카드 본문 폭 208·배율 2.0,
/// [large]는 폭 320·배율 2.0). 폭이 모자라면 **묶음 단위로 다음 줄에 내려보낸다** —
/// 퀘스트 카드가 난이도·출처 pill을 `Wrap`으로 두는 것과 같은 처방이다.
/// 회귀 방어: `test/features/reward_chip_test.dart`.
class RewardChip extends StatelessWidget {
  const RewardChip({super.key, required this.reward, this.large = false});

  final Reward reward;

  /// 완료 연출용 확대 표시. 카드 목록의 보조 정보가 아니라 **주인공**일 때 쓴다
  /// (screens.md "퀘스트 완료 화면"의 보상 표시 카드).
  final bool large;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final coinColor = theme.reward.coin;

    final iconSize = large ? 28.0 : 14.0;
    // `+5` · `XP +10` — 숫자와 라틴 문자뿐이라 **수치 서체(Sora)** 를 쓴다.
    // 크기·굵기·행간은 기존 titleLarge/labelSmall과 같고 패밀리만 다르다.
    final textStyle = large
        ? AppTypography.numericTitleLarge
        : AppTypography.numericLabelSmall;

    return Wrap(
      // 코인 묶음과 XP 묶음 사이 간격 — 예전 Row의 gapWMd/gapWSm와 같은 값이다.
      spacing: large ? AppSpacing.md : AppSpacing.sm,
      // 줄이 바뀌었을 때만 쓰이는 세로 간격.
      runSpacing: AppSpacing.xs,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        _RewardPart(
          icon: Symbols.monetization_on,
          label: '+${reward.coin}',
          color: coinColor,
          iconSize: iconSize,
          textStyle: textStyle,
        ),
        _RewardPart(
          icon: Symbols.star,
          label: 'XP +${reward.xp}',
          // XP는 성장이라 그린. 노랑은 코인 쪽만 쓴다.
          // 상수가 아니라 **스킴**을 쓴다 — 다크는 이 슬롯이 밝은 그린(`#4ae176`)으로
          // 뒤집혀 있어 어두운 카드 위에서 읽힌다(상수 `#006e2f`는 2.38:1).
          color: theme.colorScheme.primary,
          iconSize: iconSize,
          textStyle: textStyle,
        ),
      ],
    );
  }
}

/// 보상 한 묶음(아이콘 + 수치). **줄바꿈의 최소 단위다.**
///
/// 아이콘과 숫자가 갈라져 서로 다른 줄에 놓이면 "🪙"와 "+5"가 남남처럼 읽힌다.
/// 그래서 묶음 안은 유연 위젯 없는 `Row`로 붙여 두고, 줄바꿈은 바깥 `Wrap`에만 맡긴다
/// (여기에 `Flexible`을 넣으면 폭이 무한한 부모 — 예: `Row(spaceBetween)` 안의 예상
/// 보상 — 에서 RenderFlex가 단언 실패한다).
class _RewardPart extends StatelessWidget {
  const _RewardPart({
    required this.icon,
    required this.label,
    required this.color,
    required this.iconSize,
    required this.textStyle,
  });

  final IconData icon;
  final String label;
  final Color color;
  final double iconSize;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: iconSize, fill: 1, color: color),
        const SizedBox(width: 2),
        Text(label, style: textStyle?.copyWith(color: color)),
      ],
    );
  }
}
