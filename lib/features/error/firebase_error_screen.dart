import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/state_views.dart';

/// Firebase 초기화가 실패했을 때 앱 대신 뜨는 화면.
///
/// checklist 1주차: "Firebase.initializeApp()이 ... 실패 시 사용자에게 오류 화면을 보여준다".
/// 크래시(흰 화면 / 앱 종료)가 아니라 재시도 가능한 화면이어야 한다.
class FirebaseErrorApp extends StatelessWidget {
  const FirebaseErrorApp({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'One-Step',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: Scaffold(
        body: SafeArea(
          child: ErrorView(message: message, onRetry: onRetry),
        ),
      ),
    );
  }
}
