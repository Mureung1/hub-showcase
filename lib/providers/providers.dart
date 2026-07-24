import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants/reward_rules.dart';
import '../models/analytics_event.dart';
import '../models/app_user.dart';
import '../models/goal.dart';
import '../models/quest.dart';
import '../models/quest_group.dart';
import '../repositories/analytics_repository.dart';
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

/// 성공 지표 이벤트 로그 저장소. 나머지 저장소와 같은 "기본값은 던진다" 패턴.
///
/// **계측은 부가 기능**이라 로그 호출부는 이 provider 읽기 실패까지 삼킨다
/// (`core/analytics/analytics_logger.dart`). 그래서 화면 테스트가 이 provider를
/// 주입하지 않아도 로그만 조용히 유실될 뿐 동작은 그대로다.
final analyticsRepositoryProvider = Provider<AnalyticsRepository>(
  (ref) =>
      throw UnimplementedError('analyticsRepositoryProvider를 override 해야 한다'),
);

/// session/attendance provider 안에서 계측을 흘려보내는 내부 헬퍼.
///
/// 화면·notifier는 `analytics_logger.dart`의 `logEvent` 확장을 쓰지만, 이 파일은
/// 그 확장이 다시 import하는 대상이라(순환을 피하려고) 여기서는 같은 정책을 담은
/// 작은 헬퍼를 직접 둔다. **어떤 실패도 삼킨다** — 계측이 세션·출석을 막으면 안 된다.
void _logEvent(Ref ref, String uid, AnalyticsEvent event) {
  try {
    final future = ref.read(analyticsRepositoryProvider).log(uid, event);
    unawaited(future.catchError((Object _) {}));
  } catch (_) {
    // provider override 누락(테스트)·로그 저장 실패 등 무엇이든 무시한다.
  }
}

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
  final result = await users.ensureUser(uid);

  // 문서가 이번에 처음 만들어졌을 때만 signup 1회. 트랜잭션 밖에서, 성공한 뒤 남긴다
  // (계측 실패가 세션을 막지 않도록 _logEvent가 삼킨다).
  if (result.created) {
    _logEvent(ref, uid, AnalyticsEvent.signup(at: ref.read(clockProvider)()));
  }
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

/// 화면이 쓰는 현재 시각 공급자.
///
/// 하루 코인 상한은 **KST 날짜 경계**에 걸려 있어, 화면이 `DateTime.now()`를 직접
/// 부르면 "상한 도달 안내가 뜨는가"를 테스트할 방법이 사라진다(오늘 날짜로 사용자
/// 문서를 만들어야 하고, 자정 경계는 아예 재현이 불가능하다).
/// 저장소가 `clock`을 주입받는 것과 같은 이유다.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// 오늘의 출석 기록 (+ 7일 연속 보너스).
///
/// **세션과 분리한 이유**: 출석 기록이 네트워크 실패로 죽어도 로그인과 앱 사용은
/// 계속돼야 한다. [sessionProvider] 안에서 호출하면 출석 쓰기 실패가 곧 세션 실패가
/// 되어 홈·퀘스트가 통째로 오류 화면이 된다 — 스트릭은 부가 기능이지 앱의 전제가
/// 아니다. 실패는 이 provider 안에 갇히고, 구독자(홈)는 조용히 무시한다.
///
/// 한 번만 도는 [FutureProvider]라 앱 실행당 1회 호출된다. 같은 날 여러 번 불려도
/// 저장소가 멱등이라(날짜 키가 같으면 쓰지 않는다) 보너스가 두 번 나가지 않는다.
final attendanceProvider = FutureProvider<AttendanceResult>((ref) async {
  final uid = await ref.watch(sessionProvider.future);
  final result = await ref.watch(userRepositoryProvider).recordAttendance(uid);

  // 오늘 첫 접속일 때만 appOpen 1회. recordAttendance의 `isNewDay` 신호를 그대로
  // 재사용하므로(새 판정 로직을 만들지 않는다), 같은 날 재접속·앱 재실행은
  // isNewDay=false라 중복 로그가 생기지 않는다.
  if (result.isNewDay) {
    _logEvent(
      ref,
      uid,
      AnalyticsEvent.appOpen(at: ref.read(clockProvider)(), dateKey: result.dateKey),
    );
  }
  return result;
});

/// 퀘스트 목록.
final questListProvider = StreamProvider<List<Quest>>((ref) async* {
  final uid = await ref.watch(sessionProvider.future);
  yield* ref.watch(questRepositoryProvider).watchQuests(uid);
});

/// 보유 아이템 ID 집합 (4주차 상점의 "보유 중" 표시용).
///
/// [currentUserProvider]와 같은 형태 — 세션(uid)이 준비된 뒤 저장소 스트림을 잇는다.
/// 구매 트랜잭션이 커밋되면 이 스트림이 갱신돼 상점 버튼이 자동으로 "장착"으로 바뀐다.
final inventoryProvider = StreamProvider<Set<String>>((ref) async* {
  final uid = await ref.watch(sessionProvider.future);
  yield* ref.watch(userRepositoryProvider).watchInventory(uid);
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
