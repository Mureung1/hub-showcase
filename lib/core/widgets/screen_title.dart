import 'package:flutter/material.dart';

/// 화면 제목 — 5탭(홈·퀘스트·상점·보관함·MY)과 하위 화면이 **모두 같은 크기**로 쓴다.
///
/// **크기는 사용자 결정(2026-07-29)이다.** 상점만 `headlineLarge`(32)이고 나머지 네
/// 탭은 `titleLarge`(20)이라 화면마다 제목 급이 달랐다. 사용자가 **큰 쪽(상점)으로
/// 통일**하기로 정했다.
///
/// ⚠️ **이 값은 두 정본과 어긋난다.** "정본과 다른데?"라는 이유로 되돌리지 말 것
/// — 아래 두 값을 알고 내린 결정이다. 바꾸려면 사용자에게 먼저 물어야 한다.
/// - Figma Redesign 정본 실측: 화면 제목 **20/700/28**(= `titleLarge`).
///   (`47:406` MY · `45:330` 보관함 · 퀘스트 목록 AppBar)
/// - `one-step-design/tokens.md:59`: headline-lg는 "페이지 타이틀 32, **모바일 24**".
///
/// 제목의 **크기만** 통일한다. 섹션 제목(홈 「진행 중인 퀘스트」, MY 「통계」·「설정」,
/// 등록 화면 「하위 퀘스트」)은 `titleLarge` 그대로다 — 둘이 같아지면 "화면 제목 ↔
/// 섹션 제목" 위계가 사라진다.
///
/// 한글이라 기본 서체(Pretendard)다. 수치 서체(Sora)에는 한글 글리프가 없다.
class ScreenTitle extends StatelessWidget {
  /// 본문 첫 줄로 놓는 제목(홈·상점·보관함·MY). 폭이 모자라면 그냥 줄바꿈한다 —
  /// 스크롤 목록 안이라 세로로 자랄 자리가 있다.
  const ScreenTitle(this.text, {super.key}) : _inAppBar = false;

  /// `AppBar(title:)` 자리에 놓는 제목(퀘스트 목록·도전 분해·퀘스트 등록).
  ///
  /// 툴바는 높이가 고정이라 줄바꿈이 곧 **세로 잘림**이다. 그래서 한 줄로 고정하되,
  /// 폭이 모자랄 때 잘라내는(`ellipsis`) 대신 **줄여서 전부 보여 준다**
  /// (`BoxFit.scaleDown`). 가장 긴 제목(「멈춘 퀘스트 다시 나누기」)은 32로 그리면
  /// 폭 320dp에서 넘치는데, 잘리면 어느 화면인지 못 읽는다. 줄어들어도 하한은
  /// 대략 23~24로 **예전 titleLarge(20)보다 크다.**
  ///
  /// 세로는 안전하다: `AppBar`가 제목의 글꼴 배율을 1.34로 클램프하므로
  /// (`app_bar.dart` `_kMaxTitleTextScaleFactor`) 최대 행 높이는 40×1.34 = 53.6이고,
  /// [appBarHeight]가 그보다 크다.
  const ScreenTitle.appBar(this.text, {super.key}) : _inAppBar = true;

  final String text;

  final bool _inAppBar;

  /// [ScreenTitle.appBar]를 쓰는 `AppBar`의 높이.
  ///
  /// 기본 `kToolbarHeight`(56)에서는 32/40 제목이 위아래 8만 남기고 바를 거의 채운다.
  /// 64면 12씩 남아 숨통이 트이고, 배율 클램프 상한(53.6)에도 여유가 있다.
  static const double appBarHeight = 64;

  @override
  Widget build(BuildContext context) {
    // 상점이 쓰던 것과 같은 스타일. 값의 정의처는 AppTypography 하나뿐이다.
    final style = Theme.of(context).textTheme.headlineLarge;

    if (!_inAppBar) return Text(text, style: style);

    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: AlignmentDirectional.centerStart,
      child: Text(text, style: style, maxLines: 1, softWrap: false),
    );
  }
}
