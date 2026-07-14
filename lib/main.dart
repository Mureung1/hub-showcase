import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'providers/providers.dart';
import 'repositories/memory/fake_auth_repository.dart';
import 'repositories/memory/in_memory_quest_repository.dart';
import 'repositories/memory/in_memory_user_repository.dart';

/// ⚠️ 아직 **InMemory 저장소**로 동작한다. 앱을 끄면 데이터가 사라진다.
///
/// Firebase 연동은 다음 단계에서 붙인다. UI를 Firebase 콘솔 세팅에 묶어 두지 않기 위한
/// 의도적 순서다 — 콘솔 작업은 외부 의존(브라우저·요금제)이 있어 가장 지연되기 쉽다.
/// 저장소가 인터페이스로 분리돼 있어서, 그때 이 override 세 줄만 갈아끼우면 된다.
void main() {
  runApp(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
        userRepositoryProvider.overrideWithValue(InMemoryUserRepository()),
        questRepositoryProvider.overrideWithValue(InMemoryQuestRepository()),
      ],
      child: const OneStepApp(),
    ),
  );
}
