import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';

/// 안내 문구 블록 — Figma 정본(Redesign 페이지) `Notice` 컴포넌트 `73:460`.
///
/// 본문에 딸린 한두 줄짜리 설명 상자다. 카드가 아니다 — 보더도 그림자도 없이
/// 옅은 블루 면([AppColors.secondarySurface] = 정본 변수 `tint/aiSurface`) 위에
/// 흰 원형 아이콘 홀더 하나와 글줄만 얹는다.
///
/// 정본 실측(`73:452`): 라운드 24 · 패딩 20 · 내부 간격 16 · 홀더 32×32 원형
/// (흰색 + [AppColors.noticeIconShadow]) · 아이콘색 `tint/aiSurfaceFg`(=`secondary`) ·
/// 본문 bodySmall / `onSurface`.
///
/// 아이콘 크기 [_iconSize]는 20이다. 정본은 이 자리에 **16px 텍스트 글리프**(`⑂`)를
/// 대역으로 세워 뒀는데, 같은 16을 Material Symbol에 그대로 주면 32 홀더 안에서
/// 눈에 띄게 작아 보인다(글리프는 폰트 메트릭상 실제 잉크가 더 크게 찍힌다).
/// `AiPromoCard`가 12px 라벨 옆 `✦`를 16으로 환산한 것과 같은 규칙이다.
///
/// ⚠️ **다크 사양이 정본에 없다.** 예전에는 라이트 전용 불투명 상수를 다크에도
/// 그대로 썼는데, 어두운 화면에 흰 판이 뜨고 그 위의 `onSurface`(다크=밝음) 본문이
/// **대비 1.01:1**로 사라졌다. 지금은 배경만 [AppSurfaceRoles.tintPanelSurface]로
/// 받는다 — 새 HEX를 짓지 않고 기존 다크 중립 슬롯을 가리킨다(본문 9.77:1).
///
/// 아이콘 홀더는 그대로 둔다. 다크에서 홀더는 `surfaceContainerLowest`(`#13263D`)
/// **어두운 원**이 되고 그 위 블루 글리프가 3.28:1이라 그래픽 기준(3:1)을 넘는다 —
/// 홀더가 패널보다 어두워지면서 라이트의 "얹힌 칩" 인상이 "파인 칩"으로 바뀌지만,
/// 흰 원을 다크에 그대로 두는 쪽이 훨씬 튄다.
class NoticeBox extends StatelessWidget {
  const NoticeBox({
    super.key,
    required this.icon,
    required this.message,
    this.alert = false,
  });

  /// 홀더 안에 들어갈 글리프. Material Symbols를 넘긴다.
  final IconData icon;

  final String message;

  /// 이 안내가 **평범한 설명이 아니라 "평소와 다른 일이 일어났다"는 알림**인가.
  ///
  /// true면 아이콘 홀더가 뒤집힌다: 흰 원 + 블루 글리프 → **채운 블루 원 + 흰 글리프**
  /// ([_AiChallengeSection]의 AI 배지와 같은 대비). 컨테이너(배경·라운드·패딩·간격)는
  /// 정본 그대로 두고 **홀더만** 바꾸는 이유는 아래 두 가지다.
  ///
  /// 1. 정본에는 알림 톤 Notice가 없다. 컨테이너를 새로 그리면 정본에서 더 멀어진다.
  /// 2. 같은 화면에서 안내 박스와 폴백 배너가 **번갈아** 뜨는데(둘이 동시에 뜨는 일은
  ///    없다) 형태가 완전히 같으면 사용자가 대체 결과임을 못 알아챈다 — 실기기
  ///    테스트에서 실제로 지적된 문제다. 채운 배지는 옅은 면 위에서 가장 먼저 눈에
  ///    걸리는 요소라, 글줄을 읽기 전에 "평소와 다르다"가 먼저 전달된다.
  ///
  /// 보더가 아니라 홀더를 택한 이유: 라운드 24 틴트 상자에 1px 선을 두르면 "경고"가
  /// 아니라 "카드 경계"로 읽힌다(구조 신호이지 상태 신호가 아니다).
  final bool alert;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: AppSpacing.cardPaddingLg,
      decoration: BoxDecoration(
        // 라이트는 정본 `tint/aiSurface`([AppColors.secondarySurface]) 그대로,
        // 다크만 중립 램프로 받는다([AppSurfaceRoles.tintPanelSurface]).
        color: scheme.tintPanelSurface,
        borderRadius: AppRadius.lgAll,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: _holderSize,
            height: _holderSize,
            decoration: BoxDecoration(
              color: alert
                  ? scheme.secondaryContainer
                  : scheme.surfaceContainerLowest,
              shape: BoxShape.circle,
              // 채운 배지는 이미 스스로 떠 보인다. 옅은 섀도는 흰 원이 배경에 뚫린
              // 구멍처럼 보이지 않게 하는 장치라 흰 홀더에만 필요하다.
              boxShadow: alert ? null : AppColors.noticeIconShadow,
            ),
            child: Center(
              // 채움 여부는 호출부가 고른 아이콘 이름이 정한다(Material Icons에는
              // `fill` 축이 없다 — 예전 Material Symbols는 `fill: 1`을 줬다).
              child: Icon(
                icon,
                size: _iconSize,
                // 채운 홀더 위 글리프는 **`onSecondaryContainer`**다(채움이
                // `secondaryContainer`이므로). 예전에는 `onSecondary`를 썼는데
                // 라이트에서 두 값이 우연히 같은 흰색이라 티가 나지 않았을 뿐이다 —
                // 다크 `onSecondary`가 밝은 블루의 짝(#003060)으로 뒤집히면서
                // 어두운 글리프 on 어두운 블루(1.4:1)가 될 자리였다.
                color: alert ? scheme.onSecondaryContainer : scheme.secondary,
              ),
            ),
          ),
          AppSpacing.gapWMd,
          // 글줄은 남은 폭 안에서 접힌다 — 홀더는 32 고정이지만 본문은 글꼴 배율을
          // 그대로 타므로, Expanded가 없으면 큰 배율·좁은 폭에서 넘친다.
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 아이콘 홀더 한 변(정본 실측 32).
const double _holderSize = 32;

/// 홀더 안 아이콘 크기. 정본의 16px 텍스트 글리프를 Material Symbol로 환산한 값.
const double _iconSize = 20;
