import 'package:flutter/material.dart';

/// Sora 단일 서체. `assets/fonts/Sora-Variable.ttf` (가변폰트).
///
/// 가변폰트라 굵기는 `fontWeight`만으로는 축이 확실히 적용되지 않을 수 있어
/// `fontVariations`로 wght 축을 명시한다. 둘 다 지정하면 어느 렌더러에서도 안전하다.
abstract final class AppTypography {
  static const String family = 'Sora';

  static TextStyle _sora({
    required double size,
    required int weight,
    required double height,
    double? letterSpacing,
  }) {
    return TextStyle(
      fontFamily: family,
      fontSize: size,
      // 논리적 굵기(폴백·시맨틱용)와 실제 가변축 값을 함께 지정한다.
      fontWeight: FontWeight.values[(weight ~/ 100) - 1],
      fontVariations: [FontVariation('wght', weight.toDouble())],
      height: height / size,
      letterSpacing: letterSpacing,
    );
  }

  /// 48/700/56 — 대형 히어로 수치(모바일에서는 [displayMobile] 사용).
  static final displayLarge = _sora(
    size: 48,
    weight: 700,
    height: 56,
    letterSpacing: -0.96, // -0.02em
  );

  /// 32/700/40 — 모바일 히어로.
  static final displayMobile = _sora(
    size: 32,
    weight: 700,
    height: 40,
    letterSpacing: -0.64,
  );

  /// 32/600/40 — 페이지 타이틀(모바일 24 → [headlineMedium] 사용).
  static final headlineLarge = _sora(size: 32, weight: 600, height: 40);

  /// 24/600/32 — 카드 제목.
  static final headlineMedium = _sora(size: 24, weight: 600, height: 32);

  /// 20/600/28 — 섹션 제목.
  static final titleLarge = _sora(size: 20, weight: 600, height: 28);

  /// 18/400/28 — 설명문 · 퀘스트 제목.
  static final bodyLarge = _sora(size: 18, weight: 400, height: 28);

  /// 16/400/24 — 본문.
  static final bodyMedium = _sora(size: 16, weight: 400, height: 24);

  /// 14/400/20 — 보조 본문.
  static final bodySmall = _sora(size: 14, weight: 400, height: 20);

  /// 14/600/20 — 뱃지 · 버튼 · 수치.
  static final labelMedium = _sora(
    size: 14,
    weight: 600,
    height: 20,
    letterSpacing: 0.14, // 0.01em
  );

  /// 12/500/16 — 캡션 · pill.
  static final labelSmall = _sora(size: 12, weight: 500, height: 16);

  static TextTheme get textTheme => TextTheme(
    displayLarge: displayLarge,
    displayMedium: displayMobile,
    headlineLarge: headlineLarge,
    headlineMedium: headlineMedium,
    titleLarge: titleLarge,
    bodyLarge: bodyLarge,
    bodyMedium: bodyMedium,
    bodySmall: bodySmall,
    labelLarge: labelMedium,
    labelMedium: labelMedium,
    labelSmall: labelSmall,
  );
}
