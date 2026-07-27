import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest.dart';
import 'package:one_step/repositories/memory/in_memory_quest_repository.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

/// 하루 코인 상한이 **실제 지급 경로**(completeQuest)에서 동작하는지 본다.
///
/// 순수 함수 검증은 `test/core/reward_economy_test.dart`에 있다. 여기서는
/// 저장소가 그 함수를 제대로 물려 쓰는지 — 카운터가 사용자 문서에 남고, 날짜가
/// 바뀌면 만료되고, 반환값이 실지급액과 같은지 — 를 확인한다.
void main() {
  const uid = 'u1';

  /// 고정 시각을 쓰는 저장소 한 쌍. 실제 시계를 쓰면 자정 경계를 재현할 수 없다.
  ({InMemoryQuestRepository quests, InMemoryUserRepository users}) build({
    required DateTime Function() clock,
    required List<Quest> seed,
    AppUser? user,
  }) {
    final users = InMemoryUserRepository(
      seed: user ?? AppUser.initial(uid),
      clock: clock,
    );
    final quests = InMemoryQuestRepository(
      seed: seed,
      users: users,
      clock: clock,
    );
    addTearDown(users.dispose);
    addTearDown(quests.dispose);
    return (quests: quests, users: users);
  }

  Quest quest(String id, Difficulty difficulty) =>
      Quest(id: id, title: '퀘스트 $id', difficulty: difficulty);

  // KST 2026-07-21 정오.
  final day1 = DateTime.utc(2026, 7, 21, 3);

  test('상한 아래에서는 평소대로 지급되고 카운터가 쌓인다', () async {
    final repo = build(clock: () => day1, seed: [quest('q1', Difficulty.hard)]);

    final reward = await repo.quests.completeQuest(uid, 'q1');

    expect(reward!.reward, const Reward(coin: 10, xp: 20));
    final user = await repo.users.fetchUser(uid);
    expect(user.coin, 10);
    expect(user.dailyCoinEarned, 10);
    expect(user.dailyCoinDate, '2026-07-21');
  });

  test('68코인 쌓인 상태에서 어려움(10) 완료 → **2코인만** 지급된다', () async {
    final repo = build(
      clock: () => day1,
      seed: [quest('q1', Difficulty.hard)],
      user: AppUser(
        uid: uid,
        coin: 68,
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: 68,
      ),
    );

    final reward = await repo.quests.completeQuest(uid, 'q1');

    // 0이 아니라 2다 — 남은 여유만큼은 지급한다.
    expect(reward!.coin, 2);
    final user = await repo.users.fetchUser(uid);
    expect(user.coin, 70);
    expect(user.dailyCoinEarned, kDailyCoinCap);
  });

  test('상한에 걸려 코인이 0이어도 XP는 온전히 들어간다', () async {
    final repo = build(
      clock: () => day1,
      seed: [quest('q1', Difficulty.hard)],
      user: AppUser(
        uid: uid,
        coin: 70,
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: kDailyCoinCap,
      ),
    );

    final reward = await repo.quests.completeQuest(uid, 'q1');

    expect(reward!.coin, 0);
    expect(reward.xp, 20); // 성장은 멈추지 않는다

    final user = await repo.users.fetchUser(uid);
    expect(user.coin, 70); // 코인은 그대로
    // Lv.1(알, 5XP/레벨)에서 20XP → 4레벨 상승.
    expect(user.level, 5);
  });

  test('성취 기록에는 **실지급액**이 남는다 (기록 합계 = 잔액)', () async {
    final repo = build(
      clock: () => day1,
      seed: [quest('q1', Difficulty.hard)],
      user: AppUser(
        uid: uid,
        coin: 68,
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: 68,
      ),
    );

    await repo.quests.completeQuest(uid, 'q1');

    final achievement = repo.quests.achievementsOf(uid).single;
    expect(achievement.coin, 2); // 10이 아니다
    expect(achievement.xp, 20);
  });

  test('날짜(KST)가 바뀌면 카운터가 0에서 다시 시작한다', () async {
    var now = day1;
    final repo = build(
      clock: () => now,
      seed: [quest('q1', Difficulty.hard), quest('q2', Difficulty.hard)],
      user: AppUser(
        uid: uid,
        coin: 70,
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: kDailyCoinCap,
      ),
    );

    // 오늘은 상한에 걸린다.
    expect((await repo.quests.completeQuest(uid, 'q1'))!.coin, 0);

    // KST 다음날 00:30 (= UTC 7/21 15:30). **UTC로는 아직 같은 날이다** —
    // UTC 기준으로 구현했다면 여기서도 상한에 걸려 이 테스트가 실패한다.
    now = DateTime.utc(2026, 7, 21, 15, 30);
    expect((await repo.quests.completeQuest(uid, 'q2'))!.coin, 10);

    final user = await repo.users.fetchUser(uid);
    expect(user.dailyCoinDate, '2026-07-22');
    expect(user.dailyCoinEarned, 10); // 어제 70이 이월되지 않는다
  });

  test('UTC 자정을 넘겨도 KST로 같은 날이면 카운터가 유지된다', () async {
    var now = DateTime.utc(2026, 7, 21, 20); // KST 7/22 05:00
    final repo = build(
      clock: () => now,
      seed: [quest('q1', Difficulty.hard), quest('q2', Difficulty.hard)],
      user: AppUser(
        uid: uid,
        coin: 65,
        dailyCoinDate: '2026-07-22',
        dailyCoinEarned: 65,
      ),
    );

    // 5코인 남았으므로 절삭된다.
    expect((await repo.quests.completeQuest(uid, 'q1'))!.coin, 5);

    // UTC 날짜만 바뀐 시각(7/22 02:00 = KST 7/22 11:00). 여전히 같은 KST 날짜다.
    now = DateTime.utc(2026, 7, 22, 2);
    expect((await repo.quests.completeQuest(uid, 'q2'))!.coin, 0);
  });

  test('인증 보너스까지 합산한 뒤에 절삭한다 (적용 순서 1→2→3)', () async {
    final repo = build(
      clock: () => day1,
      seed: [quest('q1', Difficulty.normal)],
      user: AppUser(
        uid: uid,
        coin: 64,
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: 64,
      ),
    );

    // 보통(5) + 인증 보너스(3) = 8 → 여유 6 → 6코인 지급.
    final reward = await repo.quests.completeQuest(uid, 'q1', memo: '했어요');

    expect(reward!.coin, 6);
    expect(reward.xp, 13); // 10 + 3, 절삭 없음
  });

  test('재완료는 상한과 무관하게 여전히 재지급되지 않는다', () async {
    final repo = build(clock: () => day1, seed: [quest('q1', Difficulty.easy)]);

    expect(await repo.quests.completeQuest(uid, 'q1'), isNotNull);
    expect(await repo.quests.completeQuest(uid, 'q1'), isNull);

    final user = await repo.users.fetchUser(uid);
    expect(user.coin, 3);
    expect(user.dailyCoinEarned, 3); // 카운터도 한 번만 쌓인다
  });

  test('AppUser: 날짜가 다르면 오늘 획득분은 0으로 읽힌다', () {
    const user = AppUser(
      uid: uid,
      dailyCoinDate: '2026-07-20',
      dailyCoinEarned: 70,
    );

    expect(user.coinEarnedToday(day1), 0);
    expect(user.remainingDailyCoin(day1), kDailyCoinCap);
    expect(user.isDailyCoinCapped(day1), isFalse);
  });

  test('AppUser: 같은 날이면 상한 도달이 그대로 보인다', () {
    const user = AppUser(
      uid: uid,
      dailyCoinDate: '2026-07-21',
      dailyCoinEarned: kDailyCoinCap,
    );

    expect(user.coinEarnedToday(day1), kDailyCoinCap);
    expect(user.remainingDailyCoin(day1), 0);
    expect(user.isDailyCoinCapped(day1), isTrue);
  });

  test('사용자 문서 라운드트립: 카운터·스트릭 필드가 재실행 후에도 살아남는다', () {
    const user = AppUser(
      uid: uid,
      dailyCoinDate: '2026-07-21',
      dailyCoinEarned: 42,
      attendanceDate: '2026-07-21',
      streak: 7,
      streakBonusDate: '2026-07-21',
    );

    final restored = AppUser.fromJson(uid, user.toJson());

    expect(restored.dailyCoinEarned, 42);
    expect(restored.dailyCoinDate, '2026-07-21');
    expect(restored.attendanceDate, '2026-07-21');
    expect(restored.streak, 7);
    expect(restored.streakBonusDate, '2026-07-21');
  });

  test('문서에 필드가 없어도(구버전) 기본값으로 안전하게 읽힌다', () {
    final restored = AppUser.fromJson(uid, {'coin': 10});

    expect(restored.dailyCoinDate, isNull);
    expect(restored.dailyCoinEarned, 0);
    expect(restored.streak, 0);
    expect(restored.isDailyCoinCapped(day1), isFalse);
  });
}
