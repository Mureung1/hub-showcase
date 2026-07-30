import 'package:flutter/material.dart';

import '../constants/app_mark.dart';
import '../theme/app_spacing.dart';
import 'pixel_art.dart';

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
  const ScreenTitle(this.text, {super.key, this.leadingMark = false})
    : _inAppBar = false;

  /// `AppBar(title:)` 자리에 놓는 제목(퀘스트 목록·도전 분해·퀘스트 등록).
  ///
  /// 툴바는 높이가 고정이라 줄바꿈이 곧 **세로 잘림**이다. 그래서 한 줄로 고정하되,
  /// 폭이 모자랄 때 잘라내는(`ellipsis`) 대신 **줄여서 전부 보여 준다**
  /// (`BoxFit.scaleDown`). 가장 긴 제목(「멈춘 퀘스트 다시 나누기」)은 32로 그리면
  /// 폭 320dp에서 넘치는데, 잘리면 어느 화면인지 못 읽는다. 줄어들어도 하한은
  /// 대략 23~24로 **예전 titleLarge(20)보다 크다.** (이 하한은 [leadingMark]가
  /// 꺼진 하위 화면 기준이다. 마크를 켠 퀘스트 목록은 마크+간격 39dp를 함께
  /// 줄이므로 좁은 폭에서 몇 dp 더 작아진다 — 대신 마크가 같은 비율로 줄어서
  /// 제목만 왜소해지지는 않는다.)
  ///
  /// 세로는 안전하다: `AppBar`가 제목의 글꼴 배율을 1.34로 클램프하므로
  /// (`app_bar.dart` `_kMaxTitleTextScaleFactor`) 최대 행 높이는 40×1.34 = 53.6이고,
  /// [appBarHeight]가 그보다 크다.
  const ScreenTitle.appBar(this.text, {super.key, this.leadingMark = false})
    : _inAppBar = true;

  final String text;

  /// 제목 왼쪽에 앱 마크([AppMark])를 붙일지. **기본은 없음이고, 켜는 화면이
  /// 명시적으로 켠다.**
  ///
  /// 왜 `.appBar` 변형 여부로 자동으로 갈 수 없는가: 마크를 다는 대상은 **5탭**인데
  /// 5탭 중 `.appBar`를 쓰는 건 퀘스트 목록 하나뿐이고, 반대로 마크를 달지 않는
  /// 하위 화면(도전 분해·퀘스트 등록) 둘도 `.appBar`다. 두 축이 교차하므로
  /// 생성자로는 구분되지 않는다.
  ///
  /// 하위 화면을 뺀 이유(사용자 결정, 2026-07-29): 뒤로가기 버튼이 이미 앞자리를
  /// 쓰고 있어 마크까지 넣으면 제목 폭이 더 줄고, 가장 긴 제목(「멈춘 퀘스트 다시
  /// 나누기」)이 [FittedBox]로 더 작아진다.
  final bool leadingMark;

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

    if (!_inAppBar) {
      final title = Text(text, style: style);
      if (!leadingMark) return title;

      // 본문 제목은 여러 줄로 자랄 수 있다. [Flexible]로 감싸야 마크가 차지한
      // 만큼 줄어든 폭 안에서 예전처럼 줄바꿈한다(감싸지 않으면 한 줄로 밀고
      // 나가 넘친다). `MainAxisSize.min`은 홈의 `Flexible(child: ScreenTitle)`이
      // 남는 폭을 코인 pill에 돌려주던 성질을 그대로 지킨다.
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _AppMarkIcon(),
          _markGap,
          Flexible(child: title),
        ],
      );
    }

    final title = Text(text, style: style, maxLines: 1, softWrap: false);

    // 마크를 [FittedBox] **안**에 넣는다. 밖에 두면 폭이 모자랄 때 마크만 제
    // 크기로 남고 제목 글자만 더 쪼그라들어 둘의 비율이 무너진다. 안에 두면
    // 마크와 제목이 같은 배율로 함께 줄어 한 덩어리로 읽힌다.
    // (`FittedBox`는 자식에게 무한 폭을 주므로 여기서는 `Flexible`이 필요 없고,
    //  써서도 안 된다.)
    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: AlignmentDirectional.centerStart,
      child: leadingMark
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [const _AppMarkIcon(), _markGap, title],
            )
          : title,
    );
  }

  /// 마크 ↔ 제목 간격. **`sm`(8)이 아니라 `xs`(4)다.**
  ///
  /// 자산이 이미 오른쪽에 투명 여백 7px(÷3 ≈ 2.3dp)를 갖고 있고, 정사각 박스가
  /// `BoxFit.contain`으로 남기는 좌우 여유 1.8dp가 더 붙는다. 합쳐 약 4.2dp가
  /// 이미 비어 있으므로, 4를 더해야 **눈에 보이는 간격**이 8px 리듬에 얹힌다.
  /// 8을 주면 12처럼 보여 마크가 제목에서 떨어져 나온다.
  static const Widget _markGap = AppSpacing.gapWXs;
}

/// 앱 마크 한 장. 크기·자산의 근거는 [AppMark]에 있다.
///
/// **글꼴 배율을 따라 커지지 않는다.** 텍스트가 아니라 표지(로고)라서가 첫째
/// 이유이고, 실무적 이유가 더 크다 — 홈·상점은 제목이 코인 pill과 한 줄이라
/// 배율 2.0에서 마크까지 70dp로 커지면 좁은 폭(320dp)에서 pill을 밀어낸다.
/// AppBar 쪽은 반대로 마크를 [FittedBox] 안에 넣어 두어, "커지는" 게 아니라
/// 폭이 모자랄 때 제목과 **함께 줄어드는** 방향으로만 반응한다.
///
/// [ExcludeSemantics]인 이유: 장식이라 스크린 리더가 읽을 것이 없다. 자산 자체는
/// `semanticLabel`을 안 주면 조용하지만, 로드 실패 시의 폴백은 이모지 `Text`라
/// 그대로 두면 "달걀"이 제목 앞에 읽힌다.
class _AppMarkIcon extends StatelessWidget {
  const _AppMarkIcon();

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: PixelArt.emoji(
        asset: AppMark.asset,
        emoji: AppMark.emoji,
        size: AppMark.size,
      ),
    );
  }
}
