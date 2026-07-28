import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../theme/reward_colors.dart';

/// 코인 잔액 pill. 🟡 노랑 사용 허용 위젯(코인 = 보상).
///
/// 정본 `CoinPill`(Redesign `11:36`, 인스턴스 `65:423` 홈 · `66:446` 퀘스트 목록 ·
/// `43:253` 상점). 실측 71×24: 패딩 **좌 8 · 우 12 · 상하 4**, full radius, 채움
/// `tint/coinbg`(#fdf3e0), 아이콘 `Symbols.monetization_on` 16, 숫자
/// `Sora SemiBold 12/16`(= [AppTypography.numericLabelSmallStrong]), 글자
/// `reward/cointext` #855300(= [RewardTheme.onCoinTint]).
///
/// **크기 변형(compact)이 없다.** 예전에는 헤더용 축소본과 '코인' 라벨이 붙은 큰
/// 본을 나눠 상점만 큰 쪽을 썼는데, 정본은 세 화면(홈·퀘스트 목록·상점)이 **같은
/// 71×24 하나**를 쓴다. 변형을 두면 같은 정보가 화면마다 다른 무게로 읽힌다.
/// 라벨('코인')도 정본에 없다 — 아이콘이 이미 단위를 말한다.
///
/// 좌우 패딩이 비대칭인 것은 오타가 아니다. 아이콘 쪽은 글리프 자체에 여백이
/// 있어 8이면 충분하고, 숫자 쪽은 12를 줘야 시각적으로 같은 간격으로 보인다.
class CoinPill extends StatelessWidget {
  const CoinPill({super.key, required this.amount});

  final int amount;

  /// 정본 실측 패딩(좌 8 · 우 12 · 상하 4).
  static const EdgeInsets _padding = EdgeInsets.fromLTRB(
    AppSpacing.sm,
    AppSpacing.xs,
    AppSpacing.smd,
    AppSpacing.xs,
  );

  /// 정본 실측 아이콘 크기. [CoinPrice]의 14와 다르다 — 저쪽은 카드 본문 한 줄이다.
  static const double _iconSize = 16;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reward = theme.reward;
    // 흰 배경 위 노랑 틴트에서 대비를 확보하려고 정본이 숫자만 갈색으로 내렸다.
    // 다크 카드 위에서는 그 갈색이 읽히지 않으므로 [CoinPrice]와 같은 처방으로
    // 이미 밝혀 둔 [RewardTheme.coin]을 쓴다(새 색을 만들지 않는다).
    final numberColor = theme.brightness == Brightness.dark
        ? reward.coin
        : reward.onCoinTint;

    return Container(
      padding: _padding,
      decoration: BoxDecoration(
        // 정본 실측은 불투명 `#fdf3e0`이고, 이 알파 파생값은 라이트 표면(#f8f9ff)
        // 위에서 `#f9ebdc`로 합성돼 육안으로 구분되지 않는다. 이 pill이 놓이는
        // 자리는 셋 다 `surface` AppBar라 배경에 따라 흔들릴 여지도 없어,
        // 새 노랑 토큰을 늘리는 대신 파생값을 유지하고 실측을 여기 적어 둔다.
        // (다크는 정본에 없다 — 알파 파생이 다크 표면 위에서 알아서 어두워진다.)
        color: reward.coinGlow.withValues(alpha: 0.22),
        borderRadius: AppRadius.fullAll,
      ),
      // 아이콘과 숫자는 **한 묶음**이라 줄을 나누지 않는다. 예전에 `Wrap`이었던
      // 것은 '코인' 라벨을 다음 줄로 내려보내기 위해서였는데(E-4 D-6: 배율 2.0 ·
      // 폭 320dp에서 20px 초과), 그 라벨이 사라지면서 접을 것도 없어졌다.
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Symbols.monetization_on,
            size: _iconSize,
            fill: 1,
            color: reward.coin,
          ),
          // 정본 실측 간격은 2다. 8px 리듬에 없는 값이고 2dp 차이는 육안으로
          // 구분되지 않아 토큰(4)을 유지한다.
          AppSpacing.gapWXs,
          // 잔액은 숫자·쉼표뿐이라 **수치 서체(Sora)** 를 쓴다.
          Text(
            _format(amount),
            style: AppTypography.numericLabelSmallStrong.copyWith(
              color: numberColor,
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
