import 'package:flutter/material.dart';

/// One-Step 색상 토큰 — **노랑은 여기에 없다.**
///
/// 노랑(코인·보상 전용)은 [RewardColors]에만 존재하며 `ColorScheme`에도 넣지 않는다.
/// 노랑이 `colorScheme.tertiaryContainer` 같은 슬롯에 들어가면 어떤 위젯이든
/// `Theme.of(context)`로 노랑에 도달할 수 있어, "노랑은 코인·보상 전용" 규칙을
/// 코드 검색으로 증명할 수 없게 된다.
///
/// 값의 정본: `.claude/skills/one-step-design/tokens.md`
abstract final class AppColors {
  // 그린 — 성장 · 완료 · 주요 행동
  static const primary = Color(0xFF006E2F);
  static const primaryContainer = Color(0xFF22C55E);
  static const onPrimary = Color(0xFFFFFFFF);
  static const onPrimaryContainer = Color(0xFF00391A);
  static const inversePrimary = Color(0xFF4AE176);

  /// 그린 아주 옅은 틴트 — 레벨 pill 배경 · 성장 stat 아이콘 칩 배경.
  /// (Figma 홈 `#e9f9ef`. `primaryContainer`를 알파로 깎아 쓰면 배경색에 따라
  ///  값이 흔들리므로 불투명 토큰으로 못 박는다.)
  static const primarySurface = Color(0xFFE9F9EF);

  // 블루 — AI · 정보 · 링크 · 보조 행동
  static const secondary = Color(0xFF0058BE);
  static const secondaryContainer = Color(0xFF2170E4);
  static const onSecondary = Color(0xFFFFFFFF);

  /// 블루 아주 옅은 틴트 — **AI 진입점 카드 배경**(퀘스트 목록 상단 프로모) ·
  /// **안내 박스([NoticeBox]) 배경**.
  ///
  /// 정본 변수 `tint/aiSurface` = `#e6eef9`. 쓰이는 자리는 Redesign 페이지의
  /// `73:460`(Notice 컴포넌트)과 `66:451`(AI Promo)이다.
  /// [surfaceContainerLow](`#eff4ff`)보다 한 단 진해 같은 흰 화면 위에서 보더 없이도
  /// 경계가 읽힌다. [primarySurface]가 그린 쪽에서 하는 역할의 블루 짝이다.
  static const secondarySurface = Color(0xFFE6EEF9);

  /// [NoticeBox] 아이콘 홀더(32×32 흰 원)의 섀도.
  /// 정본 `73:453` 실측 `0 1px 2px rgba(0,0,0,0.05)`.
  ///
  /// ⚠️ 앱의 다른 섀도는 모두 **그린 틴트**([softShadow]·[cardShadow]·버튼 섀도)인데
  /// 이것만 검정 5%다. 안내 박스 자체가 이미 블루 틴트 면이라, 그 위에 얹힌 흰 원을
  /// 다시 그린으로 띄우면 색이 세 겹으로 겹친다 — 정본이 중립 섀도를 쓴 이유이고
  /// 여기서도 그대로 따른다. 값은 거의 보이지 않을 만큼 옅어(흰 원이 배경에 뚫린
  /// 구멍이 아니라 **얹힌 칩**으로 읽히는 정도) 색 역할 규칙과 충돌하지 않는다.
  static const List<BoxShadow> noticeIconShadow = [
    BoxShadow(
      color: Color(0x0D000000), // 검정 5%
      blurRadius: 2,
      offset: Offset(0, 1),
    ),
  ];

  // 에러 — 오류 · 어려움(Hard) 난이도
  static const error = Color(0xFFBA1A1A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFFFDAD6);
  static const onErrorContainer = Color(0xFF93000A);

  // 표면 · 중립 (라이트)
  static const background = Color(0xFFF8F9FF);
  static const surface = Color(0xFFF8F9FF);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFEFF4FF);
  static const surfaceContainer = Color(0xFFE5EEFF);
  static const surfaceContainerHigh = Color(0xFFDCE9FF);
  static const onSurface = Color(0xFF0B1C30);
  static const onSurfaceVariant = Color(0xFF3D4A3D);
  static const outline = Color(0xFF6D7B6C);
  static const outlineVariant = Color(0xFFBCCBB9);

  /// 다크 전용 밝은 블루 — 어두운 면 **위에 얹는** AI·정보·링크 전경.
  ///
  /// **왜 필요했나.** 다크 스킴은 그린을 밝게 뒤집었지만([inversePrimary])
  /// 블루에는 대응하는 밝은 단이 없어 `secondary`가 `#2170e4`(L\* 48.9)에 머물렀다.
  /// 그 값은 다크의 어떤 면 위에서도 AA에 못 미친다 — 화면 `#0b1c30` 3.68:1 ·
  /// 카드 `#13263d` 3.28:1 · `surfaceContainer` 2.75:1 · `surfaceContainerHigh`
  /// 2.47:1. 아웃라인/텍스트 버튼 전경까지 전역으로 걸려 있던 결함이다.
  ///
  /// 값은 [secondary](`#0058be`) 색상의 M3 tone-80이다(새 색을 지어낸 것이 아니라
  /// 같은 hue를 다크용 밝기로 올린 것). 대비: 카드 9.01:1 · `surfaceContainerHigh`
  /// 6.79:1 · 화면 10.11:1.
  ///
  /// ⚠️ **라이트에는 쓰지 않는다.** 라이트 `secondary`는 정본 `#0058be` 그대로다.
  static const darkSecondary = Color(0xFF9FCAFF);

  /// [darkSecondary]로 꽉 채운 면 위에 얹는 글자(tone-20). 대비 7.77:1.
  ///
  /// 지금 앱에는 "밝은 블루로 채운 면"이 없어 실사용처가 없지만, 슬롯을 흰색으로
  /// 남겨 두면 나중에 `secondary` 채움을 만든 사람이 **흰 글자 on 밝은 블루**
  /// (1.70:1)를 얻는다. 쌍은 항상 같이 뒤집는다.
  ///
  /// ⚠️ 이 값은 `secondaryContainer`(다크에서도 어두운 `#0058be`) 위에 쓰면 안
  /// 된다 — 1.97:1이다. 채운 배지의 글리프는 `onSecondaryContainer`(흰색, 6.69:1)다.
  static const darkOnSecondary = Color(0xFF003060);

  // 표면 · 중립 (다크)
  static const darkSurface = Color(0xFF0B1C30);
  static const darkSurfaceContainerLowest = Color(0xFF13263D);
  static const darkSurfaceContainerLow = Color(0xFF172C46);
  static const darkSurfaceContainer = Color(0xFF1C3350);
  static const darkSurfaceContainerHigh = Color(0xFF213A5B);
  static const darkOnSurface = Color(0xFFE6EDF5);
  static const darkOnSurfaceVariant = Color(0xFFBFCBD8);
  static const darkOutline = Color(0xFF8A9AAB);
  static const darkOutlineVariant = Color(0xFF33475E);
  static const darkError = Color(0xFFFFB4AB);
  static const darkOnError = Color(0xFF690005);
  static const darkErrorContainer = Color(0xFF93000A);
  static const darkOnErrorContainer = Color(0xFFFFDAD6);

  /// L2 엘리베이션 — 검은 그림자 대신 그린 틴트 소프트 섀도.
  static const List<BoxShadow> softShadow = [
    BoxShadow(
      color: Color(0x1A22C55E), // primaryContainer 10%
      blurRadius: 15,
      offset: Offset(0, 10),
      spreadRadius: -3,
    ),
  ];

  /// 넓게 퍼지는 카드 섀도 — AI 분해 카드처럼 **화면에서 먼저 읽혀야 하는 카드**.
  /// Figma: `0 8px 20px -6px rgba(34,197,94,.14)` — [primaryContainer] 14%.
  ///
  /// [softShadow]와 나눈 이유: 저쪽은 목록 안에 여러 장 반복되는 카드(stat·퀘스트)의
  /// 은은한 L2고, 이쪽은 화면에 한 장뿐인 주인공 카드라 번짐이 더 넓다.
  static const List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Color(0x2422C55E),
      blurRadius: 20,
      offset: Offset(0, 8),
      spreadRadius: -6,
    ),
  ];

  /// 그라디언트 주 버튼이 띄워진 느낌을 내는 드롭섀도.
  /// Figma: `drop-shadow(0 8px 5px rgba(34,197,94,.2))` — [primaryContainer] 20%.
  static const List<BoxShadow> primaryButtonShadow = [
    BoxShadow(
      color: Color(0x3322C55E),
      blurRadius: 5,
      offset: Offset(0, 8),
    ),
  ];

  /// AI(블루) 그라디언트 버튼의 드롭섀도.
  /// Figma: `drop-shadow(0 8px 5px rgba(33,112,228,.24))` — [secondaryContainer] 24%.
  static const List<BoxShadow> secondaryButtonShadow = [
    BoxShadow(
      color: Color(0x3D2170E4),
      blurRadius: 5,
      offset: Offset(0, 8),
    ),
  ];
}

/// 라이트·다크에서 **다른 슬롯을 가리켜야 하는 색 역할**.
///
/// `ColorScheme`의 슬롯 하나로는 표현되지 않지만, 위젯마다 `brightness`를 물어
/// 분기하면 같은 판단이 여러 파일로 복제된다(복제하면 반드시 어긋난다). 역할을
/// 여기 한 곳에 두고 위젯은 이름만 부른다.
extension AppSurfaceRoles on ColorScheme {
  /// 카드·다이얼로그·시트 **면 위에 얹히는 보더 없는 안쪽 박스**의 채움.
  ///
  /// 정본(라이트)은 흰 면(`surfaceContainerLowest`) 위 `surfaceContainerLow`
  /// (`#eff4ff`)다 — 두 값의 L\* 차가 3.6이라 보더 없이도 박스가 읽힌다.
  ///
  /// ⚠️ 다크는 같은 슬롯 쌍의 L\* 차가 **2.8**(`#13263D` ↔ `#172C46`)뿐이라 박스가
  /// 면에 붙어 사라진다. 그래서 다크에서만 한 단 더 올린다(`#213A5B`, L\* 차 9.3).
  /// 라이트 렌더는 바뀌지 않는다.
  ///
  /// 보더를 두르는 대신 채움을 올리는 이유: 라이트 정본이 "보더 없는 틴트 박스"라
  /// 다크에만 선이 생기면 두 테마의 형태가 갈린다. 색만 바꾸면 형태는 같다.
  Color get insetSurface => brightness == Brightness.dark
      ? surfaceContainerHigh
      : surfaceContainerLow;

  /// 본문 위에 얹히는 **옅은 틴트 패널**(안내 박스 · AI 진입점 카드)의 채움.
  ///
  /// 라이트는 정본 변수 `tint/aiSurface`([AppColors.secondarySurface] `#e6eef9`)다.
  /// 다크에는 정본이 없다 — 그 라이트 전용 값을 그대로 쓰면 어두운 화면에 흰 판이
  /// 뜨고, 그 위의 `onSurface`(다크=밝음) 본문이 **대비 1.01:1**로 사라진다.
  /// 새 HEX를 짓지 않고 중립 램프의 가장 높은 단을 쓴다(`#213A5B`): 화면
  /// (`surface` `#0B1C30`)과 L\* 14.1, 카드(`surfaceContainerLowest` `#13263D`)와
  /// L\* 9.3 떨어져 셋이 서로 구분되고 본문 대비는 9.77:1이 된다.
  Color get tintPanelSurface =>
      brightness == Brightness.dark
      ? surfaceContainerHigh
      : AppColors.secondarySurface;
}
