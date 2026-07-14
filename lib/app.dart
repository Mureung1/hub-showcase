import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
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
    );
  }
}
