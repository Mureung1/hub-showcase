import 'package:flutter/material.dart';

/// 🟡 노랑 — **코인 · 보상 · 스트릭 전용.**
///
/// 이 파일은 `lib/` 안에서 노랑 HEX 리터럴이 존재하는 **유일한 곳**이다.
/// 다른 파일에서 노랑을 쓰려면 [RewardTheme]을 통해서만 접근한다.
///
/// 사용이 허용된 파일 목록은 `test/theme/color_role_test.dart`의 allowlist가
/// 강제한다. 허용 목록 밖에서 노랑이 등장하면 테스트가 실패한다.
/// (checklist 1주차: "노랑이 코인·보상 이외의 UI 요소에 사용되지 않는다 — 코드 검색으로 확인 가능")
abstract final class RewardColors {
  /// 코인 · 보상의 기본 노랑. tokens.md의 `tertiary-container`.
  static const coin = Color(0xFFEF9900);

  /// 코인 글로우 · 보너스 강조. tokens.md의 `tertiary-fixed-dim`.
  static const coinGlow = Color(0xFFFFB95F);

  /// 노랑 위에 얹는 텍스트. 라이트 테마 기준 [coin] 대비 4.5:1 이상.
  static const onCoin = Color(0xFF5C3800);

  /// 보통(Normal) 난이도 pill의 텍스트. 노랑 틴트 배경 위에서 읽히는 갈색.
  static const onCoinTint = Color(0xFF855300);

  /// 코인 pill의 배경. Figma 정본 `tint/coinbg`.
  ///
  /// ⚠️ **라이트 전용 불투명값이다.** 예전에는 `coinGlow`의 알파 0.22 파생값을
  /// 썼는데, 알파는 뒤에 깔린 배경색에 따라 합성 결과가 흔들린다. 정본이 불투명
  /// 값을 못 박아 뒀으므로 그대로 가져온다.
  ///
  /// 다크에는 대응하는 정본이 없다. 값을 지어내지 않고 [RewardTheme.dark]가
  /// 기존 알파 파생 경로를 유지한다 — 파생값은 어두운 표면 위에서 알아서 어두워진다.
  static const coinSurface = Color(0xFFFDF3E0);

  // 다크 테마: 배경이 어두우므로 더 밝은 노랑을 쓴다.
  static const darkCoin = Color(0xFFFFB95F);
  static const darkOnCoin = Color(0xFF5C3800);
}

/// 노랑을 위젯에 노출하는 **유일한 통로**.
///
/// `ColorScheme`에 노랑을 넣지 않는 대신 이 `ThemeExtension`으로 전달한다.
/// 이렇게 하면 "노랑을 쓴 위젯"이 `Theme.of(context).extension<RewardTheme>()`
/// 호출로 명시적으로 드러나 검색이 가능해진다.
@immutable
class RewardTheme extends ThemeExtension<RewardTheme> {
  const RewardTheme({
    required this.coin,
    required this.coinGlow,
    required this.onCoin,
    required this.onCoinTint,
    required this.coinSurface,
  });

  /// 코인 아이콘 · 보상 수치의 색.
  final Color coin;

  /// 코인 배너 배경 · 보너스 강조.
  final Color coinGlow;

  /// [coin] 위의 텍스트.
  final Color onCoin;

  /// 노랑 틴트 배경 위의 텍스트.
  final Color onCoinTint;

  /// 코인 pill의 배경. 라이트는 정본 불투명값, 다크는 알파 파생값이다.
  final Color coinSurface;

  static const light = RewardTheme(
    coin: RewardColors.coin,
    coinGlow: RewardColors.coinGlow,
    onCoin: RewardColors.onCoin,
    onCoinTint: RewardColors.onCoinTint,
    coinSurface: RewardColors.coinSurface,
  );

  /// `const`가 아닌 이유: [coinSurface]의 다크 값이 **알파 파생**이라
  /// (`withValues`는 const가 아니다) 컴파일 타임에 접을 수 없다. 정본에 다크
  /// 사양이 없어 불투명 값을 지어내는 대신 기존 파생 경로를 그대로 남긴 결과다.
  static final dark = RewardTheme(
    coin: RewardColors.darkCoin,
    coinGlow: RewardColors.coinGlow,
    onCoin: RewardColors.darkOnCoin,
    onCoinTint: RewardColors.darkOnCoin,
    coinSurface: RewardColors.coinGlow.withValues(alpha: _darkCoinSurfaceAlpha),
  );

  /// 어두운 표면 위에서 알아서 어두워지는 코인 틴트의 불투명도.
  static const double _darkCoinSurfaceAlpha = 0.22;

  @override
  RewardTheme copyWith({
    Color? coin,
    Color? coinGlow,
    Color? onCoin,
    Color? onCoinTint,
    Color? coinSurface,
  }) {
    return RewardTheme(
      coin: coin ?? this.coin,
      coinGlow: coinGlow ?? this.coinGlow,
      onCoin: onCoin ?? this.onCoin,
      onCoinTint: onCoinTint ?? this.onCoinTint,
      coinSurface: coinSurface ?? this.coinSurface,
    );
  }

  @override
  RewardTheme lerp(RewardTheme? other, double t) {
    if (other == null) return this;
    return RewardTheme(
      coin: Color.lerp(coin, other.coin, t)!,
      coinGlow: Color.lerp(coinGlow, other.coinGlow, t)!,
      onCoin: Color.lerp(onCoin, other.onCoin, t)!,
      onCoinTint: Color.lerp(onCoinTint, other.onCoinTint, t)!,
      coinSurface: Color.lerp(coinSurface, other.coinSurface, t)!,
    );
  }
}

/// `Theme.of(context).reward` 로 짧게 쓰기 위한 확장.
extension RewardThemeAccess on ThemeData {
  RewardTheme get reward => extension<RewardTheme>() ?? RewardTheme.light;
}
