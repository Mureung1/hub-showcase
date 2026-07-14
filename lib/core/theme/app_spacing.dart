import 'package:flutter/widgets.dart';

/// 8px 베이스라인 리듬. 화면에서 `EdgeInsets`를 직접 하드코딩하지 않고 이 값을 쓴다.
abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;

  /// 화면 좌우 여백.
  static const double screenH = 20;

  /// 카드 내부 패딩.
  static const EdgeInsets cardPadding = EdgeInsets.all(md);

  /// 화면 본문 패딩 (하단은 탭바를 피해 넉넉히).
  static const EdgeInsets screenPadding = EdgeInsets.fromLTRB(
    screenH,
    md,
    screenH,
    xl,
  );

  /// 섹션 사이 간격.
  static const SizedBox gapXs = SizedBox(height: xs);
  static const SizedBox gapSm = SizedBox(height: sm);
  static const SizedBox gapMd = SizedBox(height: md);
  static const SizedBox gapLg = SizedBox(height: lg);
  static const SizedBox gapXl = SizedBox(height: xl);

  static const SizedBox gapWXs = SizedBox(width: xs);
  static const SizedBox gapWSm = SizedBox(width: sm);
  static const SizedBox gapWMd = SizedBox(width: md);
}
