import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_radius.dart';
import 'app_spacing.dart';
import 'app_typography.dart';
import 'reward_colors.dart';

/// One-Step ThemeData.
///
/// `ColorScheme.fromSeed`를 쓰지 않고 **명시적으로 생성**한다. fromSeed는 `#006e2f`,
/// `#0058be` 같은 지정 색을 톤 근사값으로 뭉개는데, 디자인 정본과 체크리스트는
/// 리터럴 HEX가 그대로 살아 있기를 요구한다.
///
/// tertiary 계열에는 **노랑을 넣지 않는다.** 노랑은 [RewardTheme] 확장으로만 전달된다.
abstract final class AppTheme {
  static final light = _build(
    brightness: Brightness.light,
    scheme: const ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      primaryContainer: AppColors.primaryContainer,
      onPrimaryContainer: AppColors.onPrimaryContainer,
      inversePrimary: AppColors.inversePrimary,
      secondary: AppColors.secondary,
      onSecondary: AppColors.onSecondary,
      secondaryContainer: AppColors.secondaryContainer,
      onSecondaryContainer: AppColors.onSecondary,
      // tertiary = 블루 계열. 실수로 colorScheme.tertiary를 써도 노랑이 나오지 않는다.
      tertiary: AppColors.secondary,
      onTertiary: AppColors.onSecondary,
      tertiaryContainer: AppColors.surfaceContainerHigh,
      onTertiaryContainer: AppColors.onSurface,
      error: AppColors.error,
      onError: AppColors.onError,
      errorContainer: AppColors.errorContainer,
      onErrorContainer: AppColors.onErrorContainer,
      surface: AppColors.surface,
      onSurface: AppColors.onSurface,
      onSurfaceVariant: AppColors.onSurfaceVariant,
      surfaceContainerLowest: AppColors.surfaceContainerLowest,
      surfaceContainerLow: AppColors.surfaceContainerLow,
      surfaceContainer: AppColors.surfaceContainer,
      surfaceContainerHigh: AppColors.surfaceContainerHigh,
      surfaceContainerHighest: AppColors.surfaceContainerHigh,
      outline: AppColors.outline,
      outlineVariant: AppColors.outlineVariant,
    ),
    reward: RewardTheme.light,
  );

  static final dark = _build(
    brightness: Brightness.dark,
    scheme: const ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.inversePrimary,
      onPrimary: AppColors.onPrimaryContainer,
      primaryContainer: AppColors.primary,
      onPrimaryContainer: AppColors.onPrimary,
      inversePrimary: AppColors.primary,
      // 🔵 블루도 그린([inversePrimary])처럼 **밝은 쪽으로 뒤집는다.**
      // 예전에는 `secondaryContainer`(#2170e4)를 그대로 얹었는데, 다크의 어떤 면
      // 위에서도 AA에 못 미쳐(카드 3.28:1) 아웃라인·텍스트 버튼 전경과 AI 라벨이
      // 전역으로 읽히지 않았다. 자세한 근거는 [AppColors.darkSecondary].
      //
      // `secondaryContainer`는 **어두운 블루 그대로 둔다**(#0058be). 이 앱에서 블루
      // 컨테이너는 "채운 배지"(AI 아이콘 배지 · 출처 칩 · 알림 홀더) 자리이고,
      // 그 위에는 흰 글자가 얹혀야 한다 — 컨테이너까지 밝히면 그 배지들이 전부
      // 뒤집혀야 한다.
      secondary: AppColors.darkSecondary,
      onSecondary: AppColors.darkOnSecondary,
      secondaryContainer: AppColors.secondary,
      onSecondaryContainer: AppColors.onSecondary,
      tertiary: AppColors.secondaryContainer,
      onTertiary: AppColors.onSecondary,
      tertiaryContainer: AppColors.darkSurfaceContainerHigh,
      onTertiaryContainer: AppColors.darkOnSurface,
      error: AppColors.darkError,
      onError: AppColors.darkOnError,
      errorContainer: AppColors.darkErrorContainer,
      onErrorContainer: AppColors.darkOnErrorContainer,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkOnSurface,
      onSurfaceVariant: AppColors.darkOnSurfaceVariant,
      surfaceContainerLowest: AppColors.darkSurfaceContainerLowest,
      surfaceContainerLow: AppColors.darkSurfaceContainerLow,
      surfaceContainer: AppColors.darkSurfaceContainer,
      surfaceContainerHigh: AppColors.darkSurfaceContainerHigh,
      surfaceContainerHighest: AppColors.darkSurfaceContainerHigh,
      outline: AppColors.darkOutline,
      outlineVariant: AppColors.darkOutlineVariant,
    ),
    reward: RewardTheme.dark,
  );

  static ThemeData _build({
    required Brightness brightness,
    required ColorScheme scheme,
    required RewardTheme reward,
  }) {
    final textTheme = AppTypography.textTheme.apply(
      bodyColor: scheme.onSurface,
      displayColor: scheme.onSurface,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      fontFamily: AppTypography.family,
      textTheme: textTheme,
      extensions: [reward],

      iconTheme: IconThemeData(size: 24, color: scheme.onSurfaceVariant),

      // 정본 AppBar(Redesign `65:421` 홈 · `66:444` 퀘스트 목록 · `43:251` 상점 ·
      // `45:330` 보관함 · `47:406` MY · `50:440` AI 분해)는 **평평한 surface 한 겹**이다
      // — 배경 `surface`(#f8f9ff), 구분선·그림자·틴트 없음, 좌우 여백 20.
      //
      // Material 3 기본값은 `scrolledUnderElevation: 3`이라 목록을 스크롤하는 순간
      // AppBar에 `surfaceTint`(= primary 그린)가 얹혀 **바 색이 초록으로 물든다.**
      // 정본에는 그 상태가 없으므로 틴트와 스크롤 엘리베이션을 모두 끈다.
      //
      // `toolbarHeight`는 여기서 정하지 않는다 — 제목이 32(`ScreenTitle`, 사용자
      // 결정)라 화면들이 `ScreenTitle.appBarHeight`(64)를 직접 준다. 정본 실측
      // (60/52)과는 그만큼 어긋나며, 그건 알고 내린 결정이다.
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        // 정본 제목 x = 20(화면 좌우 여백과 같은 줄에 선다). Flutter 기본값은 16이라
        // AppBar 제목만 본문보다 4dp 안쪽으로 들어가 세로선이 어긋나 보였다.
        // ⚠️ leading(뒤로가기)이 있는 화면은 이 값이 leading **뒤에** 붙으므로
        //    화면 쪽에서 따로 좁힌다(`quest_split_screen` · `quest_create_screen`).
        titleSpacing: AppSpacing.screenH,
        iconTheme: IconThemeData(size: 24, color: scheme.onSurface),
        actionsIconTheme: IconThemeData(
          size: 24,
          color: scheme.onSurfaceVariant,
        ),
      ),

      cardTheme: CardThemeData(
        color: scheme.surfaceContainerLowest,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.mdAll,
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),

      // 정본 `03 · 다이얼로그`(Redesign `121:601`)의 다이얼로그 10종은 **전부 흰
      // 면**(`surfaceContainerLowest`)이다. 테마에 `dialogTheme`이 없으면 Material 3
      // 기본값 `surfaceContainerHigh`로 그려지는데, 이 앱의 그 슬롯은 `#DCE9FF`
      // **연파랑**이라 정본과 면색이 통째로 다르다.
      //
      // 개별 다이얼로그에 색을 박지 않고 여기 한 곳에서 정한다 — 지금 앱의 다이얼로그
      // 10개는 모두 `Dialog(...)`에 배경색을 주지 않으므로 이 값이 그대로 내려간다.
      //
      // 다크는 슬롯을 참조해 자동으로 따라온다(`#13263D`). 정본에 다크 사양이 없어
      // 값을 지어내지 않는다. 부수 효과로 다크 다이얼로그가 `cardTheme`과 같은 단
      // (Lowest)에 서서, 카드와 다이얼로그가 서로 다른 높이에 있던 어긋남이 사라진다.
      //
      // `surfaceTintColor`를 끄는 이유는 AppBar와 같다 — M3의 엘리베이션 틴트가
      // 얹히면 흰 면이 primary 그린 쪽으로 물든다.
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
      ),

      // 바텀시트도 같은 처리다. 정본 실측으로 확인했다 — 인증 메모 시트(`124:629`)와
      // 성취 상세 시트(`124:655`) 둘 다 면이 `surfaceContainerLowest`(`#ffffff`)이고,
      // 그 안의 입력 필드·메모/사진 플레이스홀더만 `surfaceContainerLow`(`#eff4ff`)로
      // 한 단 올라와 있다. M3 기본값은 시트 자체가 `surfaceContainerLow`라, 지금은
      // **시트 면과 그 안의 박스가 같은 색이 되어** 입력 필드가 보더로만 겨우 읽혔다.
      //
      // `modalBackgroundColor`를 함께 지정한다. `showModalBottomSheet`는 이 값이
      // 있으면 그쪽을 먼저 보므로, 하나만 두면 나중에 누가 다른 쪽을 건드릴 때
      // 모달·인라인 시트의 색이 갈라진다.
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surfaceContainerLowest,
        modalBackgroundColor: scheme.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        modalElevation: 0,
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: AppTypography.labelMedium,
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          foregroundColor: scheme.secondary,
          side: BorderSide(color: scheme.secondary, width: 1.5),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: AppTypography.labelMedium,
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.secondary,
          textStyle: AppTypography.labelMedium,
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainerLow,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: scheme.error),
        ),
        hintStyle: AppTypography.bodyMedium.copyWith(
          color: scheme.onSurfaceVariant,
        ),
        // 입력 카운터(`0/60`, `0/200`)는 숫자만 있는 수치라 Sora로 쓴다.
        // Flutter가 helperStyle 기본값 위에 이 스타일을 merge하므로(input_decorator
        // `_getHelperStyle(...).merge(counterStyle)`), **패밀리만** 얹어 크기·색은
        // Material 기본값 그대로 둔다.
        counterStyle: AppTypography.numericOverlay,
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        // 88 — 라벨이 두 줄로 접히지 않을 여유 + 하단 제스처 영역(Figma 리디자인).
        height: 88,
        indicatorColor: scheme.primary,
        // **full radius(스타디움)다 — 표준 12가 아니다.**
        //
        // 정본 `22:151`의 활성 탭 표시는 `rect w53.78 h32 rx16` — 높이의 절반이
        // 곧 반지름이라 양 끝이 완전한 반원인 알약이다. `tokens.md`도 "상태 pill·
        // 칩·진행바 캡은 full"이라 같은 편에 선다.
        //
        // (`components.md`가 리디자인 이전 스펙인 "라운드 12px · 흰 라벨"을
        //  적고 있었으나 2026-07-29에 정본에 맞춰 바로잡았다.)
        indicatorShape: const StadiumBorder(),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 24,
            color: selected ? scheme.onPrimary : scheme.onSurfaceVariant,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return AppTypography.labelSmall.copyWith(
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
          );
        }),
      ),

      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),

      chipTheme: ChipThemeData(
        shape: const StadiumBorder(),
        labelStyle: AppTypography.labelSmall,
        side: BorderSide(color: scheme.outlineVariant),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
        contentTextStyle: AppTypography.bodySmall.copyWith(
          color: scheme.surface,
        ),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: scheme.primary,
        linearTrackColor: scheme.primaryContainer.withValues(alpha: 0.15),
        linearMinHeight: 12,
      ),
    );
  }
}
