import 'dart:math' as math;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';

/// 앱 전체를 **폰 목업 틀** 안에 넣는 셸 — 웹 데모에서만 걸린다.
///
/// **왜 있나.** 데스크톱 브라우저로 열면 화면이 창 폭(1000dp 이상)을 그대로 채워
/// "웹 대시보드"로 읽힌다. 이 앱의 모든 레이아웃은 폭 390 프레임(Figma 정본)을
/// 전제로 짜였고, 심사·시연은 웹 링크로 이뤄진다. 틀을 씌워 **모바일 앱임을
/// 첫 화면에서 알리는 것**이 목적이고, 폰 사진을 재현하는 것이 목적이 아니다.
///
/// **어디에 꽂히나.** `MaterialApp.router`의 `builder`다. 그 자리의 `child`가
/// 라우터(=Navigator)이므로 화면뿐 아니라 **다이얼로그·바텀시트·스낵바까지 전부
/// 틀 안에서 그려진다**(dialog route는 이 Navigator의 오버레이에 뜨고, SnackBar는
/// 틀 안의 `Scaffold`가 그린다). 틀 바깥에 뜨는 오버레이는 없다.
///
/// **[MediaQuery]는 덮어쓰지 않는다.** 앱에서 `MediaQuery.size`로 레이아웃을
/// 정하는 코드가 한 곳도 없어(`textScalerOf`·`viewInsetsOf`만 쓴다) 폭을 알려 줄
/// 이유가 없고, `MediaQuery`를 재구성하면 키보드 인셋(`viewInsets`)이 창 기준과
/// 어긋날 위험만 생긴다. 인셋은 창 기준 그대로 흘려보낸다.
class WebPhoneShell extends StatelessWidget {
  const WebPhoneShell({super.key, required this.child});

  /// 틀 안에 들어가는 앱 본체(라우터).
  final Widget child;

  /// 앱 화면(베젤 안쪽)의 폭. **Figma 정본 프레임과 같은 390.**
  static const double _screenWidth = 390;

  /// 앱 화면의 세로 상한. 390 × 844는 정본 폭에 대응하는 실단말 논리 크기
  /// (iPhone 14/13)다. 상한이 없으면 세로로 긴 창에서 틀이 1000dp 넘게 늘어나
  /// 폰이 아니라 "긴 기둥"으로 읽힌다.
  static const double _screenMaxHeight = 844;

  /// 이 높이보다 짧게 그려야 할 상황이면 틀을 아예 접는다(390 × 480 = 0.81:1은
  /// 폰 비율이 아니다). 실제로 걸리는 경우는 **가로로 누운 폰 브라우저**
  /// (예: 844 × 390 — 폭 조건은 통과하고 높이가 모자란다)다.
  static const double _screenMinHeight = 480;

  /// 좌·우·아래 베젤 두께.
  static const double _bezel = AppSpacing.sm;

  /// 위 베젤만 두껍다 — 스피커 슬릿이 들어갈 자리다. 슬릿을 앱 화면 **위에**
  /// 얹으면 상단 콘텐츠(AppBar 제목)를 가리므로 베젤 안에서 해결한다.
  static const double _bezelTop = AppSpacing.lg;

  /// 스피커 슬릿 폭. 앱 화면 폭의 약 1/8 — 이보다 길면 장식이 먼저 눈에 띈다.
  static const double _slitWidth = 48;

  /// 틀과 창 가장자리 사이 숨 쉴 여백.
  static const double _outerMargin = AppSpacing.lg;

  /// 틀을 그리는 데 필요한 최소 가용 폭 = 화면 390 + 좌우 베젤 + 좌우 여백 = 454.
  ///
  /// 이보다 좁으면 틀이 콘텐츠 폭을 갉아먹으므로 `child`를 그대로 통과시킨다.
  /// 모바일 브라우저의 CSS 뷰포트 폭은 360~430(iPhone 375~430, 안드로이드
  /// 360~412)이라 **전부 이 밑**이다 — 즉 폰으로 열면 자동으로 full-bleed가 되고
  /// 키보드 대응(`viewInsetsOf`를 쓰는 메모/성취 시트)도 원래대로 동작한다.
  static const double _minCanvasWidth =
      _screenWidth + _bezel * 2 + _outerMargin * 2;

  /// 틀을 그리는 데 필요한 최소 가용 높이 = 480 + 위/아래 베젤 + 상하 여백 = 560.
  static const double _minCanvasHeight =
      _screenMinHeight + _bezelTop + _bezel + _outerMargin * 2;

  @override
  Widget build(BuildContext context) {
    // 실단말(iOS·Android)에서는 틀을 그리지 않는다. 폰 안에 폰 틀이 또 보이면
    // 화면만 좁아진다.
    if (!kIsWeb) return child;

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < _minCanvasWidth ||
            constraints.maxHeight < _minCanvasHeight) {
          return child;
        }

        final scheme = Theme.of(context).colorScheme;
        final screenHeight = math.min(
          _screenMaxHeight,
          constraints.maxHeight - _outerMargin * 2 - _bezelTop - _bezel,
        );

        return ColoredBox(
          // 틀 **바깥** 면. 중립 램프의 끝단(라이트 `#DCE9FF` · 다크 `#213A5B`)이라
          // 앱 표면(`surface`)과 한 단 떨어진다 — 라이트 ΔL\* 6.0(1.17:1) ·
          // 다크 ΔL\* 14.1(1.49:1). 램프 안에서 `surface`로부터 가장 먼 값이고,
          // 새 HEX를 짓지 않는다는 계약 안에서는 이보다 더 벌릴 수 없다.
          // 라이트의 6.0은 옅으므로 폰 윤곽은 아래 베젤이 책임진다.
          color: scheme.surfaceContainerHigh,
          child: Center(
            child: DecoratedBox(
              decoration: BoxDecoration(
                // 베젤 = 테두리 역할의 `outline`. 라이트는 앱 표면과 4.25:1 ·
                // 배경과 3.65:1, 다크는 5.96:1 · 4.00:1 — 두 면 **모두**와
                // 확실히 갈라져 폰 윤곽이 양쪽에서 읽힌다. (라이트에서는 어두운
                // 링, 다크에서는 밝은 링이 된다. `outline`의 역할이 각 테마의 면
                // 위에서 보이는 선이므로 방향이 뒤집히는 게 정상이다.)
                color: scheme.outline,
                borderRadius: AppRadius.lgAll,
                // 앱의 L2 엘리베이션 토큰을 그대로 쓴다(새 섀도를 만들지 않는다).
                boxShadow: AppColors.softShadow,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: _bezelTop,
                    child: Center(
                      child: Container(
                        width: _slitWidth,
                        height: AppSpacing.xs,
                        decoration: BoxDecoration(
                          // 화면과 같은 톤 — 베젤에 뚫린 틈처럼 읽힌다.
                          color: scheme.surface,
                          borderRadius: AppRadius.fullAll,
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      _bezel,
                      0,
                      _bezel,
                      _bezel,
                    ),
                    // 앱 화면은 베젤 안쪽에서 클립된다 — 라운드 밖으로 삐져나오는
                    // 콘텐츠(하단 탭바·히어로 카드)가 없어야 틀이 틀로 보인다.
                    child: ClipRRect(
                      borderRadius: AppRadius.mdAll,
                      child: SizedBox(
                        width: _screenWidth,
                        height: screenHeight,
                        child: child,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
