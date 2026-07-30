import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'core/widgets/web_phone_shell.dart';
import 'models/theme_preference.dart';
import 'providers/providers.dart';
import 'router.dart';

/// 앱 루트. 라이트·다크 [ThemeData]를 걸고, **어느 쪽을 쓸지**는 사용자 문서의
/// `themePreference`가 정한다(MY 탭에서 고른다).
///
/// `ConsumerWidget`인 이유: 테마 선택은 기기 로컬이 아니라 `users/{uid}` 문서에
/// 저장돼 있어서, 그 스트림을 여기서 읽어야 [MaterialApp.themeMode]에 닿는다.
/// [ThemePreference]는 순수 Dart라 `ThemeMode`를 모른다 — 변환은 이 파일이 한다.
class OneStepApp extends ConsumerWidget {
  const OneStepApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // `select`로 **테마 값만** 구독한다. `currentUserProvider`를 통째로 watch하면
    // 코인·XP가 바뀔 때마다 앱 루트가 리빌드된다(퀘스트 하나 완료할 때마다다).
    final preference = ref.watch(
      currentUserProvider.select((user) => user.valueOrNull?.themePreference),
    );

    return MaterialApp.router(
      title: 'One-Step',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: _themeModeOf(preference),
      routerConfig: router,
      // 웹 데모에서만 앱을 폰 목업 틀로 감싼다(실단말은 [WebPhoneShell]이 그대로
      // 통과시킨다). `builder`에 두는 이유: 여기의 `child`가 라우터라서 화면과
      // 다이얼로그·바텀시트가 **같이** 틀 안에 들어간다.
      builder: (context, child) =>
          WebPhoneShell(child: child ?? const SizedBox.shrink()),
    );
  }
}

/// 도메인 값 → Flutter의 [ThemeMode].
///
/// **null(사용자 문서를 아직/끝내 못 읽음)은 [ThemeMode.system]이다.**
/// `currentUserProvider`는 익명 로그인 → 문서 구독을 거치는 비동기라, 첫 프레임에는
/// 값이 없다. 그래서 "라이트/다크를 골라 둔 사용자"는 시작 직후 시스템 테마로 한
/// 프레임 그려졌다가 문서가 도착하며 자기 선택으로 바뀌는 것이 보일 수 있다 —
/// **알고 받아들인 트레이드오프다**(사용자 결정). 없애려면 선택값을 기기 로컬에도
/// 캐시해야 하는데, 그건 "설정의 정본은 Firestore 문서 하나"라는 이 앱의 계약에
/// 두 번째 진실 공급원을 만드는 일이라 하지 않는다.
ThemeMode _themeModeOf(ThemePreference? preference) => switch (preference) {
  null || ThemePreference.system => ThemeMode.system,
  ThemePreference.light => ThemeMode.light,
  ThemePreference.dark => ThemeMode.dark,
};
