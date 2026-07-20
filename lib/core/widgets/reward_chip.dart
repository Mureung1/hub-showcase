import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../constants/reward_rules.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/reward_colors.dart';

/// 예상 보상 표시 — `🪙 +5 · XP +10`.
///
/// 🟡 노랑 사용 허용 위젯(코인 = 보상). XP는 성장이므로 그린을 쓴다.
///
/// **노랑에 접근할 수 있는 유일한 보상 표시 위젯이다.** 완료 연출처럼 보상을 크게
/// 보여줘야 하는 화면도 새로 노랑을 쓰지 말고 [large]로 이 위젯을 키워 쓴다
/// (색 역할 규칙을 한 곳에 가둬 두기 위해서다 — `test/theme/color_role_test.dart`).
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
    final textStyle = large
        ? theme.textTheme.titleLarge
        : theme.textTheme.labelSmall;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Symbols.monetization_on, size: iconSize, fill: 1, color: coinColor),
        const SizedBox(width: 2),
        Text('+${reward.coin}', style: textStyle?.copyWith(color: coinColor)),
        large ? AppSpacing.gapWMd : AppSpacing.gapWSm,
        Icon(Symbols.star, size: iconSize, fill: 1, color: AppColors.primary),
        const SizedBox(width: 2),
        Text(
          'XP +${reward.xp}',
          style: textStyle?.copyWith(color: AppColors.primary),
        ),
      ],
    );
  }
}
