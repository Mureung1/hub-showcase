import 'package:flutter/material.dart';

/// 두 가변 서체를 **역할로 나눠** 쓴다.
///
/// - **Pretendard** (`assets/fonts/PretendardVariable.ttf`) — 앱 기본. 제목·본문·라벨 등
///   글자가 들어가는 모든 자리. **한글 글리프를 갖춘 유일한 서체다.**
/// - **Sora** (`assets/fonts/Sora-Variable.ttf`) — **수치 전용.** 코인 잔액, `+5`,
///   `XP 12 / 100`, 입력 카운터처럼 **숫자(+라틴 문자)만** 있는 문자열.
///
/// 왜 나누나: 한글은 Pretendard가 훨씬 잘 읽히고(Sora에는 한글 글리프 자체가 없어
/// 지금까지 시스템 폰트로 폴백돼 왔다), 수치는 Sora의 기하학적 숫자꼴이 게임 UI의
/// 정체성이다. **크기·행간·자간 스케일은 두 서체가 완전히 같다.**
///
/// **굵기만 의도적으로 갈린다(Figma 리디자인).** 한글은 같은 wght에서 라틴보다 획이
/// 가늘어 보여, 제목·라벨급([headlineMedium]·[titleLarge]·[labelMedium])의 한글은
/// **700**으로 올리고 짝이 되는 Sora 수치는 **600**에 둔다. 나란히 놓았을 때 두
/// 서체의 시각 무게가 맞는 짝이다. 본문급(400)·캡션급(500)은 원래 굵기가 낮아
/// 보정이 필요 없으므로 양쪽이 같다.
/// (`test/theme/typography_family_test.dart`가 이 짝을 값으로 못 박는다.)
///
/// ⚠️ **`numeric*` 스타일에 한글을 넣지 말 것.** Sora에 한글 글리프가 없다.
/// 실수로 섞여도 `fontFamilyFallback`이 Pretendard로 받아내지만(글자가 깨지지는
/// 않는다) 한 줄 안에서 서체가 갈려 보이므로, 한글이 섞인 문자열은 처음부터
/// 기본(Pretendard) 스타일을 쓴다. 예: `'5일 연속'`, `'Level 3 · 참새'`.
///
/// 가변폰트라 굵기는 `fontWeight`만으로는 축이 확실히 적용되지 않을 수 있어
/// `fontVariations`로 wght 축을 명시한다. 둘 다 지정하면 어느 렌더러에서도 안전하다.
/// (Pretendard Variable의 wght 축은 45~930, Sora는 100~800 — 아래 400/500/600/700을
/// 둘 다 커버한다.)
///
/// `google_fonts` 패키지를 쓰지 않는 이유: 런타임에 폰트를 HTTP로 내려받으므로
/// 오프라인 첫 실행이 깨진다(checklist: 네트워크 없이도 크래시 없어야 함).
/// 두 서체 모두 `pubspec.yaml`에 번들로 선언한다.
abstract final class AppTypography {
  /// 앱 기본 서체. `ThemeData.fontFamily`도 이 값이다.
  static const String family = 'Pretendard';

  /// 수치 전용 서체. **한글 글리프가 없다.**
  static const String numericFamily = 'Sora';

  static TextStyle _style({
    required String fontFamily,
    required double size,
    required int weight,
    required double height,
    double? letterSpacing,
  }) {
    return TextStyle(
      fontFamily: fontFamily,
      // 수치 서체에 한글이 섞였을 때 시스템 폰트가 아니라 앱 서체로 받아낸다.
      // (기본 서체에는 불필요하므로 수치일 때만 단다.)
      fontFamilyFallback: fontFamily == numericFamily ? const [family] : null,
      fontSize: size,
      // 논리적 굵기(폴백·시맨틱용)와 실제 가변축 값을 함께 지정한다.
      fontWeight: FontWeight.values[(weight ~/ 100) - 1],
      fontVariations: [FontVariation('wght', weight.toDouble())],
      height: height / size,
      letterSpacing: letterSpacing,
    );
  }

  /// 기본(Pretendard) 스타일 — 한글 포함 모든 문장.
  static TextStyle _pretendard({
    required double size,
    required int weight,
    required double height,
    double? letterSpacing,
  }) => _style(
    fontFamily: family,
    size: size,
    weight: weight,
    height: height,
    letterSpacing: letterSpacing,
  );

  /// 수치(Sora) 스타일 — 숫자·라틴 문자만.
  static TextStyle _sora({
    required double size,
    required int weight,
    required double height,
    double? letterSpacing,
  }) => _style(
    fontFamily: numericFamily,
    size: size,
    weight: weight,
    height: height,
    letterSpacing: letterSpacing,
  );

  /// 48/700/56 — 대형 히어로 수치(모바일에서는 [displayMobile] 사용).
  static final displayLarge = _pretendard(
    size: 48,
    weight: 700,
    height: 56,
    letterSpacing: -0.96, // -0.02em
  );

  /// 32/700/40 — 모바일 히어로.
  static final displayMobile = _pretendard(
    size: 32,
    weight: 700,
    height: 40,
    letterSpacing: -0.64,
  );

  /// 32/600/40 — 페이지 타이틀(모바일 24 → [headlineMedium] 사용).
  static final headlineLarge = _pretendard(size: 32, weight: 600, height: 40);

  /// 24/**700**/32 — 카드 제목 · 캐릭터 이름. 짝: [numericHeadlineMedium](600).
  static final headlineMedium = _pretendard(size: 24, weight: 700, height: 32);

  /// 20/**700**/28 — 섹션 제목 · AppBar 제목. 짝: [numericTitleLarge](600).
  static final titleLarge = _pretendard(size: 20, weight: 700, height: 28);

  /// 18/400/28 — 설명문 · 퀘스트 제목.
  static final bodyLarge = _pretendard(size: 18, weight: 400, height: 28);

  /// 16/400/24 — 본문.
  static final bodyMedium = _pretendard(size: 16, weight: 400, height: 24);

  /// 14/400/20 — 보조 본문.
  static final bodySmall = _pretendard(size: 14, weight: 400, height: 20);

  /// 16/**700**/24 — **풍경 위에 얹히는 이름표.** 홈 히어로 우하단 오버레이 전용.
  ///
  /// [bodyMedium]과 크기·행간이 같고 굵기만 700이다. 새 스케일 단을 만들지 않으려고
  /// 기존 16/24 단에 굵기만 올렸다 — 도트아트 풍경 위에서는 400이 뭉개져 읽힌다.
  ///
  /// [headlineMedium](24/700)의 축소판이다. 이름표가 히어로 **밖**에 있던 시절에는
  /// 24였지만, 안으로 들어오면서 캐릭터와 겹치게 돼 폭·높이를 함께 줄였다.
  ///
  /// `textTheme`에 넣지 않는다. 이 자리 하나에만 쓰는 값이라 슬롯으로 공개하면
  /// 다른 화면이 의미 없이 집어 쓰게 된다.
  static final heroName = _pretendard(size: 16, weight: 700, height: 24);

  /// 14/**700**/20 — 뱃지 · 버튼 · 링크. 짝: [numericLabelMedium](600).
  static final labelMedium = _pretendard(
    size: 14,
    weight: 700,
    height: 20,
    letterSpacing: 0.14, // 0.01em
  );

  /// 12/500/16 — 캡션 · pill.
  static final labelSmall = _pretendard(size: 12, weight: 500, height: 16);

  // ── 수치 전용(Sora). 크기·행간·자간은 위 스케일과 1:1이고, 굵기는 한글 보정분
  //    (제목·라벨급 700 ↔ 수치 600)만큼 낮다. 파일 상단 주석 참고. ──

  /// 24/600/32 — 큰 통계 수치(보관함 완료 수 · 연속 일수).
  static final numericHeadlineMedium = _sora(
    size: 24,
    weight: 600,
    height: 32,
  );

  /// 20/600/28 — 완료 연출의 확대 보상 수치.
  static final numericTitleLarge = _sora(size: 20, weight: 600, height: 28);

  /// 14/400/20 — 입력 카운터(`0/60`).
  static final numericBodySmall = _sora(size: 14, weight: 400, height: 20);

  /// 14/600/20 — 코인 잔액 · XP 수치.
  static final numericLabelMedium = _sora(
    size: 14,
    weight: 600,
    height: 20,
    letterSpacing: 0.14,
  );

  /// 12/500/16 — pill 안의 작은 수치(축소 코인 · 보상 칩).
  static final numericLabelSmall = _sora(size: 12, weight: 500, height: 16);

  /// 12/600/16 — 진행 수치(홈 XP `4 / 10 XP`).
  ///
  /// [numericLabelSmall]과 크기는 같고 한 단 굵다. 라벨('경험치', Pretendard 14/400)
  /// 과 같은 줄에 놓여 **수치 쪽이 먼저 읽혀야** 하는 자리라 Figma가 600을 지정했다.
  /// Pretendard 쌍둥이가 없는 유일한 수치 스타일이다(한글이 올 자리가 아니다).
  static final numericLabelSmallStrong = _sora(
    size: 12,
    weight: 600,
    height: 16,
  );

  /// **패밀리만** 수치용으로 바꾸는 오버레이.
  ///
  /// 이미 크기·색이 정해진 스타일(예: Flutter가 만드는 입력 카운터)에 얹어
  /// 서체만 Sora로 돌릴 때 쓴다. 크기·굵기·색을 건드리지 않는 것이 핵심이다.
  static const TextStyle numericOverlay = TextStyle(
    fontFamily: numericFamily,
    fontFamilyFallback: [family],
  );

  static TextTheme get textTheme => TextTheme(
    displayLarge: displayLarge,
    displayMedium: displayMobile,
    headlineLarge: headlineLarge,
    headlineMedium: headlineMedium,
    titleLarge: titleLarge,
    bodyLarge: bodyLarge,
    bodyMedium: bodyMedium,
    bodySmall: bodySmall,
    labelLarge: labelMedium,
    labelMedium: labelMedium,
    labelSmall: labelSmall,
  );
}
