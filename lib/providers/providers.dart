import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_user.dart';
import '../models/goal.dart';
import '../models/quest.dart';
import '../models/quest_group.dart';
import '../repositories/auth_repository.dart';
import '../repositories/goal_repository.dart';
import '../repositories/quest_decomposer.dart';
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

/// 큰 목표(Goal) 저장소. 나머지 저장소와 동일한 "기본값은 던진다" 패턴.
///
/// 분해 결과를 등록할 때 원본 목표를 함께 저장하고, 그 goalId를 퀘스트에 심는다.
/// 개별 항목 재분해가 원본 목표 맥락을 다시 읽을 수 있게 하기 위해서다
/// (`goal_repository.dart` 참고).
final goalRepositoryProvider = Provider<GoalRepository>(
  (ref) => throw UnimplementedError('goalRepositoryProvider를 override 해야 한다'),
);

/// AI 분해 엔진. 저장소 3종과 같은 패턴 — 기본값은 던지고, main(Fake/Remote)이나
/// 테스트에서 override로 주입한다. decomposeNotifierProvider는 이 provider에만 말을 건다.
final questDecomposerProvider = Provider<QuestDecomposer>(
  (ref) => throw UnimplementedError('questDecomposerProvider를 override 해야 한다'),
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

/// 큰 목표 목록. 퀘스트 목록의 **폴더 라벨**을 그리는 데 쓴다.
///
/// [questListProvider]와 같은 형태 — 세션(uid)이 준비된 뒤 저장소 스트림을 잇는다.
final goalListProvider = StreamProvider<List<Goal>>((ref) async* {
  final uid = await ref.watch(sessionProvider.future);
  yield* ref.watch(goalRepositoryProvider).watchGoals(uid);
});

/// 퀘스트를 큰 목표 단위로 묶은 목록 (퀘스트 목록 화면).
///
/// **목표 스트림의 실패·로딩을 화면으로 전파하지 않는다.** goal 문서는 라벨을
/// 만들기 위한 부가 정보일 뿐이라, 그것 때문에 퀘스트 목록 전체가 오류 화면으로
/// 바뀌면 사용자는 퀘스트를 잃은 걸로 본다. 목표를 못 읽으면 빈 맵을 넘겨
/// 폴백 라벨([kUnknownGoalLabel])로 그리고, 퀘스트는 그대로 보여 준다.
///
/// 반대로 **퀘스트 스트림의 로딩·오류는 그대로 통과시킨다** — 화면의 스켈레톤과
/// `ErrorView`가 지금처럼 동작해야 한다.
final questGroupsProvider = Provider<AsyncValue<List<QuestGroup>>>((ref) {
  // valueOrNull: 로딩 중이거나 실패했으면 null → 빈 목록으로 떨어진다.
  final goals = ref.watch(goalListProvider).valueOrNull ?? const <Goal>[];
  final goalTexts = {for (final goal in goals) goal.id: goal.text};

  return ref
      .watch(questListProvider)
      .whenData((quests) => groupQuestsByGoal(quests, goalTexts));
});

/// 아직 완료하지 않은 퀘스트를 **최신 등록순**으로 (홈 화면 미리보기용).
///
/// 목록 화면과 정렬 기준이 다르다. 목록은 `order`(= AI가 짠 **실행 경로 순서**)를
/// 따르지만, 홈 미리보기는 "방금 만든 걸 지금 보여 준다"가 목적이라 **등록 시각**
/// 내림차순이다. AI로 목표를 막 분해하고 홈에 돌아왔는데 방금 만든 퀘스트가
/// 안 보이면 분해가 실패한 것처럼 읽힌다.
///
/// ⚠️ **`createdAt`이 null인 퀘스트는 맨 앞에 둔다.** Firestore `serverTimestamp`는
/// 서버가 확정하기 전까지 로컬 캐시에서 null이므로, **null = 방금 만든 것**이다
/// (`firestore_quest_repository.dart`의 `_parse` 주석 참고).
/// 그 `_parse`는 null을 뒤로 보내는데 모순이 아니다 — 거기는 실행 경로 순서의
/// 2차 키라 확정되지 않은 항목을 끝에 미뤄 두는 게 맞고, 여기는 등록 시각 순서라
/// 확정되지 않은 항목이 곧 가장 최신이다.
///
/// **개수는 자르지 않는다.** 홈이 3개만 쓴다고 여기서 잘라 버리면, 다른 화면이
/// 이 provider를 재사용할 때 이유 없이 3개만 받는다. 자르는 건 화면의 몫이다.
final pendingQuestsProvider = Provider<AsyncValue<List<Quest>>>((ref) {
  return ref.watch(questListProvider).whenData((quests) {
    final pending = quests.where((q) => !q.done).toList();

    pending.sort((a, b) {
      final at = a.createdAt;
      final bt = b.createdAt;
      if (at == null) return bt == null ? 0 : -1;
      if (bt == null) return 1;
      return bt.compareTo(at); // 내림차순 = 최신 먼저
    });

    return pending;
  });
});
