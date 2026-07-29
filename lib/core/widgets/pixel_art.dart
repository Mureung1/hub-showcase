import 'package:flutter/material.dart';

/// 도트아트 자산 한 장을 그리고, **로드에 실패하면 [fallback]으로 떨어진다.**
///
/// 왜 위젯 하나로 모으는가: `docs/checklist.md`의 캐릭터 렌더 PASS 조건이
/// "자산 로드 실패 시 대체 표시(이모지)가 나온다"이다. 폴백을 화면마다 따로 쓰면
/// 한 곳만 빠져도 그 조건이 조용히 깨진다. 캐릭터·오라·배경·빈 화면이 전부 이
/// 위젯을 지나가므로 폴백 보장 지점이 하나뿐이다.
///
/// [fallback]이 `String`이 아니라 `Widget`인 이유: 이모지가 항상 옳은 대체가
/// 아니다. 캐릭터·오라·빈 화면은 이모지로 떨어지는 게 맞지만, **배경**은 이모지가
/// 아니라 원래의 틴트 채움으로 떨어져야 카드 레이아웃이 흔들리지 않는다.
class PixelArt extends StatelessWidget {
  const PixelArt({
    super.key,
    required this.asset,
    required this.fallback,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.filterQuality = FilterQuality.none,
    this.semanticLabel,
    this.scale,
    this.centerSlice,
  }) : assert(
         centerSlice == null || scale != null,
         'centerSlice는 논리 좌표라 scale 없이는 의미가 정해지지 않는다',
       ),
       assert(
         centerSlice == null || (fit != BoxFit.none && fit != BoxFit.cover),
         'centerSlice는 그림 전체가 보이는 fit에서만 성립한다 (BoxFit.fill을 쓸 것)',
       );

  /// 이모지로 떨어지는 정사각 배치 — 캐릭터·오라·빈 화면용 축약.
  ///
  /// [width]·[height]를 둘 다 [size]로 주므로 **레이아웃 박스는 원본 종횡비와
  /// 무관하게 언제나 [size]×[size]**다. 종횡비는 박스 안에서 [BoxFit.contain]이
  /// 흡수하므로 코드에 박아 둘 필요가 없다.
  ///
  /// 캐릭터 자산은 투명 여백을 사방 8px만 남기고 잘라낸 상태라 캔버스가 파일마다
  /// 다르다(74×85 ~ 268×241, 종횡비 0.80~1.20). 그래서 "세로가 항상 제한 축"이라던
  /// 옛 전제(원본이 전부 260×280이던 시절)는 더 이상 성립하지 않는다 — 가로가 긴
  /// 용 계열은 **가로가 제한 축**이라 박스 안에서 위아래에 여백이 남는다.
  /// 박스 크기 자체는 고정이라 레이아웃은 그래도 흔들리지 않는다.
  ///
  /// 폴백 이모지는 `fontSize: size`의 맨 `Text`다 — 자산 도입 전 렌더와 같은
  /// 형태라 큰 글꼴 배율에서 새 오버플로가 생기지 않는다.
  PixelArt.emoji({
    Key? key,
    required String asset,
    required String emoji,
    required double size,
    FilterQuality filterQuality = FilterQuality.none,
    String? semanticLabel,
  }) : this(
         key: key,
         asset: asset,
         fallback: Text(emoji, style: TextStyle(fontSize: size)),
         width: size,
         height: size,
         filterQuality: filterQuality,
         semanticLabel: semanticLabel,
       );

  /// 자산 경로. 테스트는 이 값으로 "무엇이 그려졌는지"를 식별한다.
  final String asset;

  /// 로드 실패 시 대신 그릴 위젯.
  final Widget fallback;

  final double? width;
  final double? height;
  final BoxFit fit;

  /// 도트아트라 기본이 [FilterQuality.none](최근접 보간)이다. 원본 크기 근처나
  /// 확대에서 픽셀 격자가 살아 있어야 하고, 보간을 걸면 뭉개진다.
  ///
  /// **크게 축소하는 자산만 예외로 올린다.** 최근접은 축소할 때 픽셀 행·열을
  /// 통째로 버리므로 배율이 낮으면 그림이 깨진다. 현재 예외는 둘이다 —
  /// 빈 화면 일러스트(512→96 = 0.19배)와 상점 배경 미리보기(1024→약 140 = 0.14배).
  final FilterQuality filterQuality;

  final String? semanticLabel;

  /// 자산의 **논리 배율** — 원본 픽셀 ÷ 이 값 = 논리 크기(dp).
  ///
  /// null이면 번들 배율(1.0)이라 원본 1px = 1dp다. 자산이 실제로 그릴 크기보다
  /// 훨씬 큰 캔버스로 그려졌을 때만 준다. [centerSlice]와 짝이다 — 9-slice는
  /// 모서리를 **늘리지 않고 원본 크기 그대로** 찍으므로, 배율이 없으면 1024px
  /// 자산의 256px 모서리가 256dp로 그려져 화면을 통째로 뒤덮는다.
  final double? scale;

  /// 9-slice(나인패치) 중앙 영역. 주면 이 사각형 **안쪽만** 늘어나고 네 모서리는
  /// 원본 비율을 지킨다 — 테두리 장식이 늘어나 뭉개지는 것을 막는다.
  ///
  /// ⚠️ **좌표는 원본 픽셀이 아니라 논리 좌표(원본 픽셀 ÷ [scale])다.**
  /// Flutter는 `sliceBorder = inputSize / scale - centerSlice.size`로 테두리를
  /// 계산한 뒤 그릴 때만 `centerSlice * scale`로 되돌린다
  /// (`painting/decoration_image.dart`의 `paintImage`). 원본 픽셀 좌표를 그대로
  /// 넣으면 sliceBorder가 음수가 되어 소스 사각형이 이미지 밖을 가리킨다.
  final Rect? centerSlice;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      asset,
      width: width,
      height: height,
      fit: fit,
      filterQuality: filterQuality,
      semanticLabel: semanticLabel,
      scale: scale,
      centerSlice: centerSlice,
      // errorBuilder를 주는 순간 Image는 로드 예외를 다시 던지지 않는다. 이게
      // 없으면 자산 하나가 빠졌을 때 화면 전체가 붉은 오류 박스로 죽는다.
      errorBuilder: (_, _, _) => fallback,
    );
  }
}
