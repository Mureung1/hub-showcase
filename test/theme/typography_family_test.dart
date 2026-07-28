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

  group('수치 스타일은 Sora이고, 스케일은 기본 서체 쌍둥이와 완전히 같다', () {
    // 패밀리만 갈린다 — 크기·굵기·행간·자간이 하나라도 달라지면 레이아웃이 흔들린다.
    final pairs = <String, (TextStyle, TextStyle)>{
      'headlineMedium': (
        AppTypography.headlineMedium,
        AppTypography.numericHeadlineMedium,
      ),
      'titleLarge': (
        AppTypography.titleLarge,
        AppTypography.numericTitleLarge,
      ),
      'bodySmall': (AppTypography.bodySmall, AppTypography.numericBodySmall),
      'labelMedium': (
        AppTypography.labelMedium,
        AppTypography.numericLabelMedium,
      ),
      'labelSmall': (
        AppTypography.labelSmall,
        AppTypography.numericLabelSmall,
      ),
    };

    for (final entry in pairs.entries) {
      test(entry.key, () {
        final (base, numeric) = entry.value;
        expect(numeric.fontFamily, AppTypography.numericFamily);
        // 한글이 섞여 들어와도 시스템 폰트가 아니라 앱 서체로 받아낸다.
        expect(numeric.fontFamilyFallback, [AppTypography.family]);
        expect(numeric.fontSize, base.fontSize);
        expect(numeric.fontWeight, base.fontWeight);
        expect(numeric.fontVariations, base.fontVariations);
        expect(numeric.height, base.height);
        expect(numeric.letterSpacing, base.letterSpacing);
      });
    }
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
