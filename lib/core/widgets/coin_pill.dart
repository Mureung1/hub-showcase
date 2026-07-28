import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../theme/reward_colors.dart';

/// 코인 잔액 pill. 🟡 노랑 사용 허용 위젯(코인 = 보상).
class CoinPill extends StatelessWidget {
  const CoinPill({super.key, required this.amount, this.compact = false});

  final int amount;

  /// 헤더용 축소 버전.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reward = theme.reward;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm : AppSpacing.md,
        vertical: compact ? AppSpacing.xs : AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: reward.coinGlow.withValues(alpha: 0.22),
        borderRadius: AppRadius.fullAll,
      ),
      // **`Row`가 아니라 `Wrap`이다.** 고정폭 `Row`였을 때는 큰 잔액(1,234)과 큰
      // 글꼴 배율이 겹치면 pill이 부모 폭을 넘었다(E-4 D-6: 배율 2.0 · 폭 320dp의
      // 홈 코인 배너에서 20px). 폭이 모자라면 "코인" 단위를 다음 줄로 내려보낸다.
      // [RewardChip]이 코인·XP 묶음을 접는 것과 같은 처방이다.
      child: Wrap(
        // 예전 Row의 gapWXs와 같은 값 — 배율 1.0에서 생김새가 바뀌지 않는다.
        spacing: AppSpacing.xs,
        runSpacing: AppSpacing.xs,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          // 아이콘과 숫자는 **한 묶음**이다. 둘이 다른 줄로 갈라지면 "🪙"와
          // "1,234"가 남남처럼 읽힌다. 줄바꿈은 바깥 Wrap에만 맡긴다.
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Symbols.monetization_on,
                size: compact ? 16 : 20,
                fill: 1,
                color: reward.coin,
              ),
              AppSpacing.gapWXs,
              // 잔액은 숫자·쉼표뿐이라 **수치 서체(Sora)** 를 쓴다.
              // 아래 '코인' 라벨은 한글이므로 기본 서체(Pretendard)다.
              Text(
                _format(amount),
                style:
                    (compact
                            ? AppTypography.numericLabelSmall
                            : AppTypography.numericLabelMedium)
                        .copyWith(color: reward.onCoin),
              ),
            ],
          ),
          if (!compact)
            Text(
              '코인',
              style: theme.textTheme.labelSmall?.copyWith(
                color: reward.onCoin.withValues(alpha: 0.75),
              ),
            ),
        ],
      ),
    );
  }
}

/// 상품 **가격** 표시 — 알약 배경 없는 코인 수치. 🟡 노랑 사용 허용 위젯.
///
/// [CoinPill]과 나눈 이유: pill은 "내가 가진 잔액"이라 노랑 틴트 알약 위에 얹히지만,
/// 가격은 상품 카드 본문의 한 줄이라 배경이 없다. 배경이 없어지면 같은 노랑 글자가
/// 흰 카드 위에서 대비를 잃으므로 **글자색이 달라진다.**
///
/// Figma 정본 상품 카드 실측: 코인 아이콘 14 + `Sora SemiBold 14`(ls 0.14,
/// = [AppTypography.numericLabelMedium]), 글자색 `#855300`
/// (= [RewardTheme.onCoinTint] — 노랑 틴트 위 갈색과 같은 값이고, 흰 배경에서 대비를
/// 확보하려고 디자이너가 아이콘만 노랑으로 두고 숫자를 어둡게 내린 자리다).
///
/// ⚠️ **다크는 정본에 없다.** 다크 카드(`#13263D`) 위에서 어두운 갈색은 읽히지
/// 않으므로, 새 색을 만들지 않고 [RewardTheme]이 이미 다크용으로 밝혀 둔
/// [RewardTheme.coin](`#FFB95F`)을 그대로 쓴다.
class CoinPrice extends StatelessWidget {
  const CoinPrice({super.key, required this.amount});

  final int amount;

  /// Figma 실측 아이콘 크기.
  static const double _iconSize = 14;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reward = theme.reward;
    final numberColor = theme.brightness == Brightness.dark
        ? reward.coin
        : reward.onCoinTint;

    // 아이콘과 숫자는 **한 묶음**이라 줄을 나누지 않는다([CoinPill]의 안쪽 Row와
    // 같은 이유). 가격은 두 자리 수라 큰 배율에서도 카드 폭을 넘지 않는다.
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Symbols.monetization_on,
          size: _iconSize,
          fill: 1,
          color: reward.coin,
        ),
        AppSpacing.gapWXs,
        Text(
          _format(amount),
          style: AppTypography.numericLabelMedium.copyWith(color: numberColor),
        ),
      ],
    );
  }
}

/// 1,240 처럼 천 단위 구분.
String _format(int value) {
  final digits = value.abs().toString();
  final buffer = StringBuffer(value < 0 ? '-' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}
