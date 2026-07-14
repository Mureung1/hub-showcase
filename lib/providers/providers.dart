import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_user.dart';
import '../models/quest.dart';
import '../repositories/auth_repository.dart';
import '../repositories/quest_repository.dart';
import '../repositories/user_repository.dart';

/// 저장소 3종. **기본값은 일부러 던진다.**
///
/// `main.dart`(Firestore 구현) 또는 테스트(InMemory 구현)에서 `ProviderScope`의
/// `overrides`로 반드시 주입해야 한다. 기본 구현을 넣어 두면 override를 깜빡했을 때
/// 조용히 엉뚱한 백엔드를 쓰게 되므로, 차라리 시끄럽게 죽는 쪽을 택했다.
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => throw UnimplementedError('authRepositoryProvider를 override 해야 한다'),
);

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => throw UnimplementedError('userRepositoryProvider를 override 해야 한다'),
);

final questRepositoryProvider = Provider<QuestRepository>(
  (ref) => throw UnimplementedError('questRepositoryProvider를 override 해야 한다'),
);

/// 현재 로그인된 사용자 ID.
final currentUidProvider = StreamProvider<String?>((ref) {
  return ref.watch(authRepositoryProvider).watchUid();
});

/// 앱 시작 시 익명 로그인 + `users/{uid}` 문서 자동 생성.
///
/// checklist: "신규 사용자 최초 접속 시 users 문서가 자동 생성된다"
final sessionProvider = FutureProvider<String>((ref) async {
  final auth = ref.watch(authRepositoryProvider);
  final users = ref.watch(userRepositoryProvider);

  final uid = auth.currentUid ?? await auth.signInAnonymously();
  await users.ensureUser(uid);
  return uid;
});

/// 현재 사용자. 세션이 준비된 뒤에만 흐른다.
///
/// 문서가 없으면 저장소가 [AppUser.initial]을 흘리므로, 신규 사용자도
/// 특수 분기 없이 Lv.1 / XP 0 / 코인 0으로 렌더된다.
final currentUserProvider = StreamProvider<AppUser>((ref) async* {
  final uid = await ref.watch(sessionProvider.future);
  yield* ref.watch(userRepositoryProvider).watchUser(uid);
});

/// 퀘스트 목록.
final questListProvider = StreamProvider<List<Quest>>((ref) async* {
  final uid = await ref.watch(sessionProvider.future);
  yield* ref.watch(questRepositoryProvider).watchQuests(uid);
});

/// 아직 완료하지 않은 퀘스트 (홈 화면 미리보기용).
final pendingQuestsProvider = Provider<AsyncValue<List<Quest>>>((ref) {
  return ref
      .watch(questListProvider)
      .whenData((quests) => quests.where((q) => !q.done).toList());
});
