import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import 'pixel_art.dart';

/// 축하 연출 다이얼로그 상단의 **원형 배지 + 도트아트**.
///
/// 정본 `03 · 다이얼로그`(Redesign `121:601`)의 `Badge` — 완료(`121:608`) ·
/// 레벨업(`121:627`) · 목표 완수(`121:640`) · 스트릭(`122:626`) · 환생 연출
/// (`122:646`)이 **같은 88×88 원**을 쓴다. 축하가 여러 시각 언어로 갈라지지 않게
/// 한 위젯으로 모았다(전에는 네 파일이 같은 `Container`를 각자 복사하고 있었다).
///
/// ## 채움색이 정본과 다르다 — 알고 내린 결정
///
/// 정본 배지는 `primary`(`#006e2f`) 단색이고 그 위에 흰 Material Symbol을 얹는다.
/// 그런데 이 자리를 도트아트로 바꾸면 그 조합이 성립하지 않는다 — **도트아트의
/// 외곽선이 정확히 `#006E2F`**(자산 픽셀 실측: 그림 면적의 10~15%)이라 primary 원
/// 위에서는 윤곽이 통째로 배경에 먹히고 주황 덩어리만 남는다. 특히 목표 완수의
/// 월계관은 바깥 테두리가 전부 사라진다.
///
/// 그래서 채움을 [AppColors.primarySurface](`#e9f9ef`, 정본 변수 `tint/easyBg`)로
/// 내린다. 도트아트가 애초에 **밝은 면 위**를 전제로 그려진 팔레트이고, 이 토큰은
/// 이미 `LevelPill`·`StatCard`가 쓰는 값이라 새 색을 여는 것도 아니다.
///
/// ## 다크
///
/// [AppColors.primarySurface]는 `ColorScheme`을 타지 않는 **고정 틴트**다
/// (`LevelPill`·`StatCard`도 같다). 도트아트는 팔레트가 파일에 박힌 이미지라
/// 테마를 따라갈 수 없으므로, 배지 쪽도 함께 고정해야 두 층의 대비가 보장된다.
/// 다크 표면(`#13263D` 계열) 위에서는 오히려 대비가 라이트보다 커진다.
class CelebrationBadge extends StatelessWidget {
  const CelebrationBadge({
    super.key,
    required this.asset,
    required this.fallbackEmoji,
    required this.semanticLabel,
  });

  /// 그릴 도트아트. [DialogArt] 상수를 넘긴다 — 리터럴을 직접 적지 말 것
  /// (자산 검증 테스트가 상수 목록만 훑는다).
  final String asset;

  /// 자산 로드 실패 시 대체 표시.
  ///
  /// `docs/checklist.md`가 "자산 로드 실패 시 대체 표시(이모지)가 나온다"를 PASS
  /// 조건으로 요구한다. 각 호출부는 **정본이 그 자리에 그린 Material Symbol과 뜻이
  /// 같은** 이모지를 고른다 — 폴백이 다른 뜻을 말하면 대체가 아니라 오표시다.
  final String fallbackEmoji;

  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _badgeSize,
      height: _badgeSize,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: AppColors.primarySurface,
        shape: BoxShape.circle,
      ),
      child: PixelArt.emoji(
        asset: asset,
        emoji: fallbackEmoji,
        size: _artSize,
        semanticLabel: semanticLabel,
      ),
    );
  }
}

/// 배지 지름. 정본 실측 88.
const double _badgeSize = 88;

/// 배지 안 도트아트 한 변.
///
/// 정본의 아이콘 자리는 44×52지만 도트아트는 정사각이라 그대로 쓸 수 없다. **64**를
/// 고른 이유는 둘이다.
///
/// 1. 그림의 잉크가 캔버스의 약 81%(bbox 실측 208/256)라, 64 박스 안에서 실제로
///    보이는 높이가 약 52 — 정본 아이콘 높이와 같아진다.
/// 2. 자산의 논리 격자가 64×64(256px ÷ 4px 블록)라 **64dp면 논리 픽셀 1칸이 정확히
///    1dp**다. 그래서 배율 1×·2×·3× 어디서도 블록이 1·2·3 device px로 균일하게
///    떨어져 최근접 보간([FilterQuality.none])이 격자를 흐트러뜨리지 않는다.
///    (56 같은 값은 4px 블록이 0.875px로 쪼개져 칸 폭이 들쭉날쭉해진다.)
///
/// 88 − 64 = 사방 12 여백. 원 안에서 그림이 가장자리에 닿지 않는다.
const double _artSize = 64;
