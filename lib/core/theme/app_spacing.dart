import 'package:flutter/widgets.dart';

/// 8px 베이스라인 리듬. 화면에서 `EdgeInsets`를 직접 하드코딩하지 않고 이 값을 쓴다.
abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;

  /// 8과 16 사이의 조밀한 묶음 간격 — 나란한 카드 사이 · 아이콘↔텍스트.
  /// (Figma 리디자인이 stat 카드·액션 버튼·퀘스트 카드 간격에 일관되게 쓴다.)
  static const double smd = 12;

  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;

  /// 화면 좌우 여백. 본문 블록 사이 간격도 같은 값을 쓴다([gapBlock]).
  static const double screenH = 20;

  /// 카드 내부 패딩.
  static const EdgeInsets cardPadding = EdgeInsets.all(md);

  /// 큰 카드(라운드 24) 내부 패딩 — 화면 좌우 여백과 같은 20.
  /// 라운드가 클수록 모서리가 콘텐츠를 잠식하므로 16보다 한 단 넓다.
  static const EdgeInsets cardPaddingLg = EdgeInsets.all(screenH);

  /// 화면 본문 패딩 (하단은 탭바를 피해 넉넉히).
  static const EdgeInsets screenPadding = EdgeInsets.fromLTRB(
    screenH,
    md,
    screenH,
    xl,
  );

  /// 좌우 여백만 — full-bleed 항목과 여백 항목이 섞이는 목록에서 항목별로 준다.
  static const EdgeInsets screenHorizontal = EdgeInsets.symmetric(
    horizontal: screenH,
  );

  /// 섹션 사이 간격.
  static const SizedBox gapXs = SizedBox(height: xs);
  static const SizedBox gapSm = SizedBox(height: sm);
  static const SizedBox gapSmd = SizedBox(height: smd);
  static const SizedBox gapMd = SizedBox(height: md);
  static const SizedBox gapLg = SizedBox(height: lg);

  /// 본문 블록(히어로·이름·XP·통계·액션·목록) 사이 간격.
  static const SizedBox gapBlock = SizedBox(height: screenH);

  /// [gapBlock]의 가로판 — 화면 좌우 여백만큼의 가로 간격.
  /// `AppBar(actions:)` 끝에 붙여 오른쪽 여백을 본문과 같은 20으로 맞춘다
  /// (`AppBar`는 actions 뒤에 여백을 주지 않아 화면 끝에 딱 붙는다).
  static const SizedBox gapWBlock = SizedBox(width: screenH);

  static const SizedBox gapWXs = SizedBox(width: xs);
  static const SizedBox gapWSm = SizedBox(width: sm);
  static const SizedBox gapWSmd = SizedBox(width: smd);
  static const SizedBox gapWMd = SizedBox(width: md);
}
