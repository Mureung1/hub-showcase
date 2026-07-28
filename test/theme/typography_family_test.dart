import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/core/theme/app_typography.dart';

/// 서체 역할 분리 계약 — **한글은 Pretendard, 수치는 Sora.**
///
/// 왜 테스트로 못 박나: Sora에는 **한글 글리프가 없다**(cmap 조회 결과 U+AC00 등이
/// 전부 glyph 0). 기본 서체가 실수로 Sora로 되돌아가면 앱의 모든 한글이 시스템
/// 폴백 폰트로 렌더되는데, **위젯 테스트는 스텁 폰트로 그리므로 그 사고를 절대
/// 잡지 못한다.** 그래서 "어느 스타일이 어느 패밀리를 쓰는가"를 값으로 검증한다.
///
/// 반대 방향도 함께 건다 — 수치 스타일이 Pretendard로 흘러가면 Sora 숫자꼴이라는
/// 게임 UI 정체성이 조용히 사라진다.
///
/// **굵기는 더 이상 두 서체가 같지 않다**(Figma 리디자인). 한글이 같은 wght에서
/// 얇아 보여 제목·라벨급 한글만 700으로 올리고 Sora는 600에 뒀다. 계약이 "완전
/// 동일"에서 "크기·행간·자간은 동일, 굵기는 표대로"로 바뀌었을 뿐, **수치 스타일이
/// Sora라는 핵심은 그대로다.**
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('기본 서체는 Pretendard, 수치 서체는 Sora다', () {
    expect(AppTypography.family, 'Pretendard');
    expect(AppTypography.numericFamily, 'Sora');
  });

  test('TextTheme 전 스타일이 기본 서체(Pretendard)다 — 한글이 여기로 나간다', () {
    final theme = AppTypography.textTheme;
    final styles = <String, TextStyle?>{
      'displayLarge': theme.displayLarge,
      'displayMedium': theme.displayMedium,
      'headlineLarge': theme.headlineLarge,
      'headlineMedium': theme.headlineMedium,
      'titleLarge': theme.titleLarge,
      'bodyLarge': theme.bodyLarge,
      'bodyMedium': theme.bodyMedium,
      'bodySmall': theme.bodySmall,
      'labelLarge': theme.labelLarge,
      'labelMedium': theme.labelMedium,
      'labelSmall': theme.labelSmall,
    };

    for (final entry in styles.entries) {
      expect(
        entry.value?.fontFamily,
        AppTypography.family,
        reason: '${entry.key}가 Pretendard가 아니다 — 한글이 시스템 폰트로 폴백된다',
      );
    }
  });

  test('ThemeData(라이트·다크)의 기본 패밀리도 Pretendard다', () {
    for (final theme in [AppTheme.light, AppTheme.dark]) {
      expect(theme.textTheme.bodyMedium?.fontFamily, AppTypography.family);
      // 테마가 만들어 주는 스타일(버튼·칩 등)도 같은 서체여야 한다.
      expect(theme.chipTheme.labelStyle?.fontFamily, AppTypography.family);
    }
  });

  group('수치 스타일은 Sora이고, 크기·행간·자간은 기본 서체 쌍둥이와 같다', () {
    // **굵기만 의도적으로 갈린다.** 한글은 같은 wght에서 라틴보다 가늘어 보이므로
    // 제목·라벨급 한글을 700으로 올리고 짝이 되는 Sora 수치는 600에 둔다
    // (Figma 리디자인). 본문급(400)·캡션급(500)은 보정이 필요 없어 양쪽이 같다.
    //
    // 굵기를 "그냥 다르기만 하면 통과"로 두지 않고 **양쪽 값을 표로 못 박는다** —
    // 한쪽만 손대면(예: 한글을 다시 600으로 내리거나 Sora를 700으로 올리면)
    // 짝이 어긋난 채 조용히 통과하는 일이 없어야 한다.
    //
    // 크기·행간·자간이 갈리면 두 서체가 섞인 줄에서 베이스라인·줄높이가 흔들리므로
    // 그쪽은 계속 완전 일치를 요구한다.
    final pairs = <String, (TextStyle, TextStyle, int, int)>{
      // 이름: (Pretendard, Sora, Pretendard wght, Sora wght)
      'headlineMedium': (
        AppTypography.headlineMedium,
        AppTypography.numericHeadlineMedium,
        700,
        600,
      ),
      'titleLarge': (
        AppTypography.titleLarge,
        AppTypography.numericTitleLarge,
        700,
        600,
      ),
      'bodySmall': (
        AppTypography.bodySmall,
        AppTypography.numericBodySmall,
        400,
        400,
      ),
      'labelMedium': (
        AppTypography.labelMedium,
        AppTypography.numericLabelMedium,
        700,
        600,
      ),
      'labelSmall': (
        AppTypography.labelSmall,
        AppTypography.numericLabelSmall,
        500,
        500,
      ),
    };

    /// 가변축(wght)에 실제로 실린 값. `fontWeight`는 논리값일 뿐이라 둘 다 본다.
    double axis(TextStyle style) => style.fontVariations!
        .firstWhere((v) => v.axis == 'wght')
        .value;

    for (final entry in pairs.entries) {
      test(entry.key, () {
        final (base, numeric, baseWeight, numericWeight) = entry.value;

        expect(numeric.fontFamily, AppTypography.numericFamily);
        // 한글이 섞여 들어와도 시스템 폰트가 아니라 앱 서체로 받아낸다.
        expect(numeric.fontFamilyFallback, [AppTypography.family]);
        expect(base.fontFamily, AppTypography.family);

        // 크기·행간·자간은 완전 일치.
        expect(numeric.fontSize, base.fontSize);
        expect(numeric.height, base.height);
        expect(numeric.letterSpacing, base.letterSpacing);

        // 굵기는 표에 적힌 값 그대로.
        expect(axis(base), baseWeight.toDouble(), reason: '한글 굵기가 어긋났다');
        expect(axis(numeric), numericWeight.toDouble(), reason: '수치 굵기가 어긋났다');
        expect(base.fontWeight, FontWeight.values[(baseWeight ~/ 100) - 1]);
        expect(
          numeric.fontWeight,
          FontWeight.values[(numericWeight ~/ 100) - 1],
        );

        // 수치가 한글보다 굵어지는 일은 없다(보정 방향이 뒤집히면 잡는다).
        expect(axis(numeric), lessThanOrEqualTo(axis(base)));
      });
    }

    test('numericLabelSmallStrong — 쌍둥이가 없는 수치 스타일(12/600)', () {
      // 홈 XP 수치 자리. 한글이 올 자리가 아니라 Pretendard 짝을 두지 않았다.
      final style = AppTypography.numericLabelSmallStrong;
      expect(style.fontFamily, AppTypography.numericFamily);
      expect(style.fontFamilyFallback, [AppTypography.family]);
      expect(style.fontSize, 12);
      expect(axis(style), 600);
    });
  });

  test('입력 카운터는 패밀리만 Sora로 얹는다(크기·색은 Material 기본값 유지)', () {
    final overlay = AppTheme.light.inputDecorationTheme.counterStyle;
    expect(overlay?.fontFamily, AppTypography.numericFamily);
    // 크기·색을 지정하면 Flutter의 helperStyle 기본값을 덮어쓴다 — 얹지 않는다.
    expect(overlay?.fontSize, isNull);
    expect(overlay?.color, isNull);
  });

  test('두 폰트 파일이 디스크에 있다', () {
    for (final path in const [
      'assets/fonts/PretendardVariable.ttf',
      'assets/fonts/Sora-Variable.ttf',
    ]) {
      expect(
        File(path).existsSync(),
        isTrue,
        reason: '$path 가 없다 — pubspec fonts 선언과 어긋난다',
      );
    }
  });

  test('pubspec에 두 패밀리가 모두 선언돼 있다', () {
    // 선언이 빠지면 해당 서체는 런타임에 통째로 폴백된다(테스트로는 안 보인다).
    final pubspec = File('pubspec.yaml').readAsStringSync();
    expect(pubspec, contains('family: ${AppTypography.family}'));
    expect(pubspec, contains('assets/fonts/PretendardVariable.ttf'));
    expect(pubspec, contains('family: ${AppTypography.numericFamily}'));
    expect(pubspec, contains('assets/fonts/Sora-Variable.ttf'));
  });
}
