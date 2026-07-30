import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'core/widgets/web_phone_shell.dart';
import 'router.dart';

class OneStepApp extends StatelessWidget {
  const OneStepApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'One-Step',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
      // 웹 데모에서만 앱을 폰 목업 틀로 감싼다(실단말은 [WebPhoneShell]이 그대로
      // 통과시킨다). `builder`에 두는 이유: 여기의 `child`가 라우터라서 화면과
      // 다이얼로그·바텀시트가 **같이** 틀 안에 들어간다.
      builder: (context, child) =>
          WebPhoneShell(child: child ?? const SizedBox.shrink()),
    );
  }
}
