import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';

/// 출석 기록이 **저장소 경로**에서 동작하는지 본다.
/// 판정 규칙 자체는 `test/core/reward_economy_test.dart`(applyAttendance)에 있다.
void main() {
  const uid = 'u1';

  InMemoryUserRepository build(DateTime Function() clock, {AppUser? seed}) {
    final repo = InMemoryUserRepository(seed: seed, clock: clock);
    addTearDown(repo.dispose);
    return repo;
  }

  /// KST 해당 일자 정오에 대응하는 UTC 시각.
  DateTime kstNoon(int day) => DateTime.utc(2026, 7, day, 3);

  test('첫 실행이면 연속 1일이 기록된다', () async {
    var now = kstNoon(21);
    final repo = build(() => now);

    final result = await repo.recordAttendance(uid);

    expect(result.streak, 1);
    expect(result.bonus, isNull);
    expect((await repo.fetchUser(uid)).attendanceDate, '2026-07-21');
  });

  test('같은 날 다시 불러도 연속 일수가 늘지 않는다 (앱 재실행·탭 전환)', () async {
    var now = kstNoon(21);
    final repo = build(() => now);

    await repo.recordAttendance(uid);
    now = DateTime.utc(2026, 7, 21, 10); // 같은 KST 날짜의 다른 시각
    final again = await repo.recordAttendance(uid);

    expect(again.streak, 1);
    expect(again.isNewDay, isFalse);
    expect((await repo.fetchUser(uid)).streak, 1);
  });

  test('7일 연속이면 보너스(코인15·XP25)가 **상한과 무관하게** 지급된다', () async {
    var now = kstNoon(21);
    final repo = build(
      () => now,
      seed: AppUser(
        uid: uid,
        coin: 100,
        attendanceDate: '2026-07-20',
        streak: 6,
        // 오늘 이미 퀘스트로 상한을 다 채운 상태.
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: kDailyCoinCap,
      ),
    );

    final result = await repo.recordAttendance(uid);

    expect(result.streak, 7);
    expect(result.bonus, const Reward(coin: 15, xp: 25));

    final user = await repo.fetchUser(uid);
    // 상한을 채웠어도 보너스 15코인이 전액 들어온다.
    expect(user.coin, 115);
    // 그리고 하루 카운터는 늘지 않는다 — 퀘스트 보상만 여기 쌓인다.
    expect(user.dailyCoinEarned, kDailyCoinCap);
    expect(user.streakBonusDate, '2026-07-21');
  });

  test('14일 연속이면 2주치(코인30·XP50)가 상한 밖에서 전액 지급된다', () async {
    var now = kstNoon(21);
    final repo = build(
      () => now,
      seed: AppUser(
        uid: uid,
        coin: 100,
        attendanceDate: '2026-07-20',
        streak: 13,
        // 오늘 이미 퀘스트로 상한을 다 채운 상태.
        dailyCoinDate: '2026-07-21',
        dailyCoinEarned: kDailyCoinCap,
      ),
    );

    final result = await repo.recordAttendance(uid);

    expect(result.streak, 14);
    expect(result.bonus, const Reward(coin: 30, xp: 50));

    final user = await repo.fetchUser(uid);
    // 점증한 뒤에도 "상한 밖 전액 지급" 규칙은 그대로다.
    expect(user.coin, 130);
    // 가장 큰 회귀 위험 — 늘어난 보너스가 하루 코인 카운터를 밀어 올리면 안 된다.
    expect(user.dailyCoinEarned, kDailyCoinCap);
    expect(user.streakBonusDate, '2026-07-21');
  });

  test('28일 연속은 4주 상한(코인60·XP100)이고 35일도 같다', () async {
    Future<Reward?> bonusAt(int previousStreak) async {
      final now = kstNoon(21);
      final repo = build(
        () => now,
        seed: AppUser(
          uid: uid,
          attendanceDate: '2026-07-20',
          streak: previousStreak,
        ),
      );
      return (await repo.recordAttendance(uid)).bonus;
    }

    expect(await bonusAt(27), const Reward(coin: 60, xp: 100));
    expect(await bonusAt(34), const Reward(coin: 60, xp: 100));
  });

  test('보너스 XP는 레벨업에 반영된다', () async {
    var now = kstNoon(21);
    final repo = build(
      () => now,
      seed: AppUser(uid: uid, attendanceDate: '2026-07-20', streak: 6),
    );

    await repo.recordAttendance(uid);

    // Lv.1(알, 5XP/레벨)에서 25XP → 5레벨 상승.
    expect((await repo.fetchUser(uid)).level, 6);
  });

  test('7일 보너스는 같은 날 다시 접속해도 1회만 나간다', () async {
    var now = kstNoon(21);
    final repo = build(
      () => now,
      seed: AppUser(uid: uid, attendanceDate: '2026-07-20', streak: 6),
    );

    final first = await repo.recordAttendance(uid);
    now = DateTime.utc(2026, 7, 21, 12);
    final second = await repo.recordAttendance(uid);

    expect(first.bonus, isNotNull);
    expect(second.bonus, isNull);
    expect((await repo.fetchUser(uid)).coin, 15); // 15, 30이 아니다
  });

  test('하루 걸러 접속하면 연속이 1로 초기화된다', () async {
    var now = kstNoon(21);
    final repo = build(() => now);

    await repo.recordAttendance(uid); // 7/21 → 1일차
    now = kstNoon(22);
    expect((await repo.recordAttendance(uid)).streak, 2);

    // 7/23을 건너뛰고 7/24에 접속.
    now = kstNoon(24);
    final result = await repo.recordAttendance(uid);

    expect(result.streak, 1); // 0이 아니다 — 오늘은 출석했다
  });

  test('KST 자정을 넘기면(UTC로는 같은 날) 새 출석으로 잡힌다', () async {
    var now = DateTime.utc(2026, 7, 21, 14); // KST 7/21 23:00
    final repo = build(() => now);

    expect((await repo.recordAttendance(uid)).streak, 1);

    now = DateTime.utc(2026, 7, 21, 15, 30); // KST 7/22 00:30 (UTC는 여전히 7/21)
    final next = await repo.recordAttendance(uid);

    expect(next.dateKey, '2026-07-22');
    expect(next.streak, 2);
  });

  test('연속 7일을 하루씩 밟으면 7일째에 정확히 한 번 보너스가 나온다', () async {
    var now = kstNoon(15);
    final repo = build(() => now);

    final bonuses = <Reward?>[];
    for (var day = 15; day <= 21; day++) {
      now = kstNoon(day);
      bonuses.add((await repo.recordAttendance(uid)).bonus);
    }

    expect(bonuses.whereType<Reward>().length, 1);
    expect(bonuses.last, const Reward(coin: 15, xp: 25));
    expect((await repo.fetchUser(uid)).streak, 7);
  });

  test('실패 주입 시 AppFailure를 던진다 (오류 경로)', () async {
    final repo = InMemoryUserRepository(failWith: const NetworkFailure());
    addTearDown(repo.dispose);

    expect(
      () => repo.recordAttendance(uid),
      throwsA(isA<NetworkFailure>()),
    );
  });
}
