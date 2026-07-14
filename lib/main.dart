import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

/// 프로젝트 스캐폴딩 확인용 임시 앱.
/// 테마·화면·라우팅은 이후 커밋에서 들어온다.
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'One-Step',
      home: Scaffold(
        body: Center(child: Text('One-Step')),
      ),
    );
  }
}
