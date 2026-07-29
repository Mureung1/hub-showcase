import 'growth_rules.dart';

/// 환생 등급 액자(도트아트) 경로 — **화면과 테스트의 유일한 정의처.**
///
/// 왜 상수로 묶는가: 자산 경로는 컴파일러가 봐 주지 않는 문자열이고, [PixelArt]가
/// 로드 실패를 폴백으로 조용히 덮는다. 액자의 폴백은 **빈 위젯**이라 이모지조차
/// 뜨지 않는다 — 경로 한 글자를 틀리면 액자가 그냥 **사라진 채** 배포되고 아무
/// 테스트도 울지 않는다. 화면과 `pixel_asset_test`가 이 상수를 함께 보게 묶는다.
/// (`EmptyArt`·`DialogArt`와 같은 처방이다.)
///
/// 자산 3종은 모두 **1024×1024 RGBA · 중앙 투명 · 모서리 블록 256px**이고, 변
/// 중앙(256~767 구간)은 행·열이 완전히 균일한 단색 막대다. 그래서 9-slice로
/// 늘려도 변이 뭉개지지 않는다 — **이 균일성이 렌더 방식의 전제**이므로 자산을
/// 다시 그릴 때도 지켜야 한다. 팔레트는 바깥부터 `#006E2F`(외곽선) · `#22C55E` ·
/// `#E9F9EF`(안쪽 하이라이트) 각 16px이고, 앞의 둘은 앱 토큰과 같은 값이다.
abstract final class RebirthFrame {
  /// 환생 0~2 (새 계열) — 새싹 액자.
  static const String sprout = 'assets/frame/frame_01_sprout.png';

  /// 환생 3~5 (용 계열) — 비늘 액자.
  static const String scale = 'assets/frame/frame_02_scale.png';

  /// 환생 6+ (피닉스 계열) — 왕관 액자.
  static const String crown = 'assets/frame/frame_03_crown.png';
}

/// 환생 액자 전체 목록. 자산 검증 테스트가 이걸 훑는다.
///
/// `assets/frame/` 디렉터리 내용과 **정확히 일치해야 한다** — 파일만 추가하고
/// 여기 안 넣으면 검증 밖에 놓이고, 여기만 넣고 파일이 없으면 검증이 잡는다.
const List<String> kRebirthFrames = [
  RebirthFrame.sprout,
  RebirthFrame.scale,
  RebirthFrame.crown,
];

/// 환생 횟수 → 액자 경로.
///
/// **구간을 여기서 다시 정하지 않고 [characterFamily]에 얹는다.** 액자는 7단계인
/// `rebirthTitle`이 아니라 **계열이 열리는 시점**(환생 3·6)에 맞춘다 — 새 캐릭터
/// 계열과 새 액자가 같이 바뀌어야 사용자가 변화를 한 번에 인지한다. 임계(3·6)를
/// 여기 복제하면 계열 경계를 조정할 때 액자만 옛 구간에 남아 조용히 어긋난다.
String rebirthFrameAsset(int rebirth) => switch (characterFamily(rebirth)) {
  CharacterFamily.bird => RebirthFrame.sprout,
  CharacterFamily.dragon => RebirthFrame.scale,
  CharacterFamily.phoenix => RebirthFrame.crown,
};
