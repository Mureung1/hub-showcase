import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/firebase/firebase_bootstrap.dart';
import 'features/error/firebase_error_screen.dart';
import 'providers/providers.dart';
import 'repositories/firestore/firebase_auth_repository.dart';
import 'repositories/firestore/firestore_quest_repository.dart';
import 'repositories/firestore/firestore_user_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(await _buildApp());
}

/// 초기화가 실패해도 크래시하지 않는다. 앱 대신 재시도 가능한 오류 화면을 띄운다.
///
/// 화면 코드는 한 글자도 바뀌지 않았다. 저장소가 인터페이스로 분리돼 있어서
/// 여기서 InMemory 구현을 Firestore 구현으로 갈아끼우기만 하면 된다.
Future<Widget> _buildApp() async {
  final result = await FirebaseBootstrap.initialize();

  return switch (result) {
    BootstrapError(:final message) => FirebaseErrorApp(
      message: message,
      onRetry: () async => runApp(await _buildApp()),
    ),
    BootstrapOk() => ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(FirebaseAuthRepository()),
        userRepositoryProvider.overrideWithValue(FirestoreUserRepository()),
        questRepositoryProvider.overrideWithValue(FirestoreQuestRepository()),
      ],
      child: const OneStepApp(),
    ),
  };
}
