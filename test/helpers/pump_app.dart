import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/core/theme/app_theme.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/providers/providers.dart';
import 'package:one_step/repositories/memory/fake_auth_repository.dart';
import 'package:one_step/repositories/memory/in_memory_goal_repository.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

/// 화면 하나를 실제 테마·Provider와 함께 띄운다.
///
/// InMemory 저장소가 `lib/`에 있어서 mock 라이브러리 없이 실패 경로까지 테스트할 수 있다.
/// [failWith]를 주면 저장소가 그 실패를 던지므로 오류 화면 검증이 한 줄로 끝난다.
Future<InMemoryQuestRepository> pumpScreen(
  WidgetTester tester,
  Widget screen, {
  List<Quest> quests = const [],
  AppUser? user,
  AppFailure? failWith,
  List<Override> extraOverrides = const [],
}) async {
  const uid = 'test-uid';

  final userRepo = InMemoryUserRepository(
    seed: user ?? AppUser.initial(uid),
    failWith: failWith,
  );
  // 퀘스트 완료(completeQuest)는 사용자 문서의 coin·xp까지 올린다. 사용자 저장소를
  // 주입해야 화면 테스트에서 "완료 → 잔액 증가"를 끝까지 확인할 수 있다.
  // 주입된 인스턴스는 `questRepo.users`로 다시 꺼내 검증할 수 있다.
  final questRepo = InMemoryQuestRepository(
    seed: quests,
    failWith: failWith,
    users: userRepo,
  );

  addTearDown(questRepo.dispose);
  addTearDown(userRepo.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(initialUid: uid),
        ),
        userRepositoryProvider.overrideWithValue(userRepo),
        questRepositoryProvider.overrideWithValue(questRepo),
        // 대부분의 화면 테스트는 goalRepository를 읽지 않지만, 등록 흐름을 타는
        // 화면(분해 결과 등록)은 필요하다. 기본 InMemory를 깔아 두고, 실패 경로
        // 테스트는 extraOverrides로 실패하는 goalRepo를 덮어쓴다.
        goalRepositoryProvider.overrideWithValue(InMemoryGoalRepository()),
        ...extraOverrides,
      ],
      child: MaterialApp(theme: AppTheme.light, home: screen),
    ),
  );

  return questRepo;
}

/// 영원히 로딩 상태에 머무는 override.
///
/// InMemory 저장소는 즉시 응답하기 때문에 로딩 프레임을 관찰할 수 없다.
/// 절대 완료되지 않는 Future를 스트림으로 바꿔 주입하면 로딩 UI만 따로 검증할 수 있다.
///
/// StreamController를 쓰지 않는 이유: teardown에서 컨트롤러를 닫으면 riverpod 리스너가
/// 테스트 종료 후에 깨어나 flutter_test 바인딩의 `!inTest` assertion을 건드린다.
/// 완료되지 않는 Future는 정리할 것이 없어 그 문제가 없다.
List<Override> loadingForever() {
  Stream<T> never<T>() => Completer<T>().future.asStream();

  return [
    questListProvider.overrideWith((ref) => never<List<Quest>>()),
    currentUserProvider.overrideWith((ref) => never<AppUser>()),
  ];
}
