import 'package:flutter/material.dart';

import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';

/// 앱의 모든 다이얼로그가 공유하는 셸 — **본문 스크롤을 이 한 곳에서 챙긴다.**
///
/// **왜 있나.** 이 앱은 `AlertDialog`를 쓰지 않는다. `actions`의 `OverflowBar`가 폭이
/// 좁거나 글꼴 배율이 크면 버튼을 세로로 쌓아 「취소」가 「삭제/저장」 **위**로 올라가기
/// 때문이다. 대신 `Dialog` + 직접 레이아웃(하단 `Row` + `Expanded` 2개)을 쓰는데,
/// 그렇게 옮기는 순간 **`AlertDialog`가 공짜로 주던 본문 스크롤이 사라진다.**
/// `Dialog`의 자식은 그냥 `Column(mainAxisSize.min)`이라, 내용이 남은 높이를 넘으면
/// 넘친 만큼이 그대로 화면 밖으로 나간다. 그리고 `Column`의 **마지막 자식은 언제나
/// 확인/취소 버튼**이다.
///
/// 그 결과가 등급이 갈린다:
/// - 축하 연출(완료·레벨업·진화·환생·스트릭·목표 완수) → 「좋아요」가 잘려 **닫지
///   못한다**(바깥 탭으로 겨우 빠져나간다).
/// - 확인 다이얼로그(퀘스트 삭제·수정) → 「삭제」·「저장」이 잘려 **그 동작을 실행할
///   방법 자체가 사라진다.** 배율 1.6·폭 320dp부터 실측으로 재현된다.
///
/// **왜 셸로 뽑았나.** 다이얼로그 8곳에 `SingleChildScrollView`를 손으로 복붙하면
/// 아홉 번째 다이얼로그가 같은 함정에 다시 빠진다(실제로 `Dialog`로 옮길 때 2곳만
/// 스크롤을 챙겨 왔고 8곳이 빠졌다). 스크롤·라운드·패딩을 셸 하나에 가둬 두면
/// 새 다이얼로그는 셸을 부르는 것만으로 이 결함을 피한다.
///
/// **라운드·패딩은 파라미터가 아니다.** 지금 앱의 다이얼로그 10곳이 모두 라운드
/// [AppRadius.lgAll] · 안쪽 패딩 [AppSpacing.lg]로 같다. 노브를 열어 두면 갈라진다.
/// 배경색도 여기서 정하지 않는다 — `dialogTheme`이 이미 흰 면을 잡고 있고 다크는
/// `ColorScheme` 경로가 뒤집는다.
///
/// 회귀 방어: `test/features/text_scale_layout_test.dart`(실제 `showXxxDialog`
/// 라우트 × 배율 × 실단말 크기).
class AppDialogShell extends StatelessWidget {
  const AppDialogShell({
    super.key,
    required this.children,
    this.insetPadding,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.onBodyTap,
  });

  /// 다이얼로그 본문. 스크롤되는 `Column`의 자식이 된다.
  final List<Widget> children;

  /// 다이얼로그 **바깥** 여백. null이면 Material 기본값(좌우 40 · 상하 24)이다.
  ///
  /// 축하 연출은 보상 카드가 가로로 길어 좁은 단말에서 기본 여백이 곧 오버플로가
  /// 된다 — 그쪽은 `kCelebrationDialogInset`을 넘긴다(`reward_showcase.dart`).
  final EdgeInsets? insetPadding;

  /// 본문 정렬. 축하 연출은 가운데(기본), 확인·입력 다이얼로그는 왼쪽 정렬이다.
  final CrossAxisAlignment crossAxisAlignment;

  /// 본문 아무 데나 탭했을 때. 완료 연출의 "카운트업 건너뛰기"가 유일한 사용처다.
  ///
  /// null이면 제스처 감지기 자체를 끼우지 않는다 — 쓰지 않는 곳에 히트테스트를
  /// 불투명하게 깔아 두면 그 아래로 탭이 못 내려간다.
  final VoidCallback? onBodyTap;

  @override
  Widget build(BuildContext context) {
    // 구조가 요점이다: Dialog → 패딩 → **스크롤** → Column(min).
    // 스크롤이 Column 바깥에 있어야 마지막 자식(버튼)까지 손이 닿는다.
    Widget body = Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: crossAxisAlignment,
          children: children,
        ),
      ),
    );

    if (onBodyTap != null) {
      body = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onBodyTap,
        child: body,
      );
    }

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
      insetPadding: insetPadding,
      child: body,
    );
  }
}
