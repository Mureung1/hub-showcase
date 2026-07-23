import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/firebase/firebase_bootstrap.dart';
import 'features/error/firebase_error_screen.dart';
import 'providers/providers.dart';
import 'repositories/decompose/fake_quest_decomposer.dart';
import 'repositories/decompose/remote_quest_decomposer.dart';
import 'repositories/firestore/firebase_auth_repository.dart';
import 'repositories/firestore/firestore_analytics_repository.dart';
import 'repositories/firestore/firestore_goal_repository.dart';
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
/// Gemini API 키. **빌드 시** `--dart-define`으로 주입한다(소스/ git에 넣지 않음).
///
/// ```
/// flutter run --dart-define=GEMINI_API_KEY=<키>
/// ```
///
/// 키가 없으면 빈 문자열이라, 아래에서 자동으로 [FakeQuestDecomposer](데모 모드)로
/// 떨어진다 — 키 없이도 앱이 그럴듯한 한글 퀘스트로 돌아간다.
const String _geminiApiKey = String.fromEnvironment('GEMINI_API_KEY');

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
        goalRepositoryProvider.overrideWithValue(FirestoreGoalRepository()),
        analyticsRepositoryProvider.overrideWithValue(
          FirestoreAnalyticsRepository(),
        ),
        // 키가 있으면 실제 Gemini Flash 분해, 없으면 데모 모드(가짜 AI가 그럴듯한
        // 한글 퀘스트를 낸다). 키는 --dart-define=GEMINI_API_KEY=... 로 주입한다.
        questDecomposerProvider.overrideWithValue(
          _geminiApiKey.isEmpty
              ? FakeQuestDecomposer()
              : RemoteQuestDecomposer(apiKey: _geminiApiKey),
        ),
      ],
      child: const OneStepApp(),
    ),
  };
}
