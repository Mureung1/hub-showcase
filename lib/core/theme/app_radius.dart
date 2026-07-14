import 'package:flutter/widgets.dart';

/// 라운드 토큰. 표준 12px, 큰 컨테이너 24px, pill·칩·진행바 캡은 full.
abstract final class AppRadius {
  static const double sm = 8;

  /// 표준 라운드 — 카드 · 버튼 · 입력 필드.
  static const double md = 12;

  /// 큰 컨테이너 — 히어로 카드 · 바텀시트.
  static const double lg = 24;

  /// pill · 칩 · 진행바 캡.
  static const double full = 999;

  static const BorderRadius smAll = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius mdAll = BorderRadius.all(Radius.circular(md));
  static const BorderRadius lgAll = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius fullAll = BorderRadius.all(Radius.circular(full));
}
