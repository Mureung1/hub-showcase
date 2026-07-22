import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/reward_rules.dart';
import 'package:one_step/models/difficulty.dart';

/// 보상 경제의 **순수 함수** 검증 (하루 코인 상한 · 출석 스트릭).
///
/// 저장소를 거치지 않고 규칙 자체를 못 박는다. 두 저장소(Firestore·InMemory)가
/// 이 함수들만 쓰므로, 여기서 통과하면 구현이 갈라질 여지가 없다.
void main() {
  group('questReward — 적용 순서 1+2 (기본 + 인증 보너스)', () {
    test('인증이 없으면 난이도별 기본 보상 그대로', () {
      expect(questReward(Difficulty.easy, verified: false), kBaseRewards[Difficulty.easy]);
      expect(questReward(Difficulty.normal, verified: false), const Reward(coin: 5, xp: 10));
      expect(questReward(Difficulty.hard, verified: false), const Reward(coin: 10, xp: 20));
    });

    test('인증이 성립하면 보너스가 1회 합산된다 (보통 5/10 → 8/13)', () {
      expect(questReward(Difficulty.normal, verified: true), const Reward(coin: 8, xp: 13));
    });
  });

  group('streakBonusFor — 주차별 점증(4주 상한)', () {
    test('주차 × 15코인 / 25XP로 자란다', () {
      expect(streakBonusFor(7), const Reward(coin: 15, xp: 25));
      expect(streakBonusFor(14), const Reward(coin: 30, xp: 50));
      expect(streakBonusFor(21), const Reward(coin: 45, xp: 75));
      expect(streakBonusFor(28), const Reward(coin: 60, xp: 100));
    });

    test('4주에서 상한이라 그 뒤로는 60/100 고정이다', () {
      // 상한 밖에서 지급되는 보너스가 무한히 자라면 하루 코인 상한이 무력해진다.
      expect(streakBonusFor(35), const Reward(coin: 60, xp: 100));
      expect(streakBonusFor(70), const Reward(coin: 60, xp: 100));
      expect(streakBonusFor(365), const Reward(coin: 60, xp: 100));
    });

    test('상한 주차는 상수로 노출되고 그 값이 실제 금액과 맞는다', () {
      expect(kMaxStreakBonusWeeks, 4);
      expect(kStreakBonusPerWeek, const Reward(coin: 15, xp: 25));
      // 기대값을 같은 상수에서 도출하면 항등식이라 아무것도 막지 못한다.
      // 정책 표(docs/plan.md)의 리터럴로 앵커를 박는다.
      expect(
        streakBonusFor(kStreakBonusDays * kMaxStreakBonusWeeks),
        const Reward(coin: 60, xp: 100),
      );
    });

    test('첫 주가 차기 전(0·6일)에는 0이다', () {
      expect(streakBonusFor(0), Reward.zero);
      expect(streakBonusFor(6), Reward.zero);
      expect(streakBonusFor(-3), Reward.zero);
    });
  });

  group('applyDailyCoinCap — 하루 코인 상한 70', () {
    test('여유가 충분하면 그대로 지급되고 카운터가 쌓인다', () {
      final result = applyDailyCoinCap(
        reward: const Reward(coin: 10, xp: 20),
        earnedToday: 30,
      );

      expect(result.paid, const Reward(coin: 10, xp: 20));
      expect(result.dailyCoin, 40);
      expect(result.capped, isFalse);
    });

    test('경계에서 **부분 지급**한다 — 68 + 어려움(10) → 2코인', () {
      final result = applyDailyCoinCap(
        reward: const Reward(coin: 10, xp: 20),
        earnedToday: 68,
      );

      // 0이 아니다. 남은 여유(2)만큼은 반드시 준다.
      expect(result.paid.coin, 2);
      expect(result.dailyCoin, kDailyCoinCap);
      expect(result.capped, isTrue);
    });

    test('상한에 걸려도 **XP는 온전히** 들어간다', () {
      final result = applyDailyCoinCap(
        reward: const Reward(coin: 10, xp: 20),
        earnedToday: kDailyCoinCap,
      );

      expect(result.paid.coin, 0); // 코인은 0
      expect(result.paid.xp, 20); // XP는 그대로 — 성장은 멈추지 않는다
    });

    test('이미 상한을 채웠으면 카운터가 더 늘지 않는다', () {
      final result = applyDailyCoinCap(
        reward: const Reward(coin: 5, xp: 10),
        earnedToday: kDailyCoinCap,
      );

      expect(result.dailyCoin, kDailyCoinCap);
      expect(result.capped, isTrue);
    });

    test('정확히 상한을 채우는 지급은 절삭이 아니다', () {
      final result = applyDailyCoinCap(
        reward: const Reward(coin: 5, xp: 10),
        earnedToday: kDailyCoinCap - 5,
      );

      expect(result.paid.coin, 5);
      expect(result.dailyCoin, kDailyCoinCap);
      expect(result.capped, isFalse);
    });

    test('저장된 카운터가 오염돼도(음수·초과) 계산이 무너지지 않는다', () {
      final negative = applyDailyCoinCap(
        reward: const Reward(coin: 5, xp: 10),
        earnedToday: -100,
      );
      expect(negative.paid.coin, 5);
      expect(negative.dailyCoin, 5);

      final overflowed = applyDailyCoinCap(
        reward: const Reward(coin: 5, xp: 10),
        earnedToday: 9999,
      );
      expect(overflowed.paid.coin, 0);
      expect(overflowed.dailyCoin, kDailyCoinCap);
    });
  });

  group('applyAttendance — 출석 · 연속 일수', () {
    // KST 21일 정오에 해당하는 UTC 시각.
    DateTime kstNoon(int day) => DateTime.utc(2026, 7, day, 3);

    test('첫 출석이면 연속 1일', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: null,
        streak: 0,
      );

      expect(result.streak, 1);
      expect(result.dateKey, '2026-07-21');
      expect(result.isNewDay, isTrue);
      expect(result.bonus, isNull);
    });

    test('어제 출석했으면 연속 +1', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-20',
        streak: 3,
      );

      expect(result.streak, 4);
      expect(result.isNewDay, isTrue);
    });

    test('같은 날 재접속은 아무것도 바꾸지 않는다 (앱 재실행 포함)', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-21',
        streak: 5,
      );

      expect(result.streak, 5); // 늘지 않는다
      expect(result.isNewDay, isFalse); // 저장할 것이 없다
      expect(result.bonus, isNull);
    });

    test('하루 걸러 접속하면 연속은 **1로 초기화**된다 (0이 아니다)', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-19', // 이틀 전
        streak: 6,
      );

      // 오늘은 출석했으니 오늘부터 1일째다.
      expect(result.streak, 1);
      expect(result.bonus, isNull);
    });

    test('시계가 거꾸로 가도(미래 날짜 기록) 폭주하지 않고 1로 시작한다', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-08-01',
        streak: 9,
      );

      expect(result.streak, 1);
    });

    test('7일째에 보너스(코인15·XP25)가 나온다', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-20',
        streak: 6,
      );

      expect(result.streak, 7);
      expect(result.bonus, const Reward(coin: 15, xp: 25));
    });

    test('14일째에는 2주치(코인30·XP50)가 나온다', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-20',
        streak: 13,
      );

      expect(result.streak, 14);
      expect(result.bonus, const Reward(coin: 30, xp: 50));
    });

    test('같은 날 다시 불려도 보너스는 두 번 나가지 않는다', () {
      // 7일 보너스를 이미 받은 뒤 앱을 재실행한 상태.
      final again = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-21',
        streak: 7,
        lastBonusKey: '2026-07-21',
      );

      expect(again.isNewDay, isFalse);
      expect(again.bonus, isNull);
    });

    test('오늘 이미 보너스를 받은 문서면 출석일이 어제여도 재지급하지 않는다', () {
      // attendanceDate(어제)와 streakBonusDate(오늘)가 어긋난 문서 —
      // 저장소가 두 필드를 한 트랜잭션에 쓰므로 정상 경로에선 안 생기지만,
      // 수동 수정·부분 마이그레이션으로 들어오면 상한 밖 지급이 두 번 나간다.
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-20',
        streak: 6,
        lastBonusKey: '2026-07-21',
      );

      expect(result.streak, 7); // 출석 자체는 정상 기록된다
      expect(result.isNewDay, isTrue);
      expect(result.bonus, isNull); // 보너스만 막힌다
    });

    test('어제 받은 보너스 키는 오늘 지급을 막지 않는다', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '2026-07-20',
        streak: 6,
        lastBonusKey: '2026-07-20',
      );

      expect(result.bonus, const Reward(coin: 15, xp: 25));
    });

    test('7의 배수가 아닌 날에는 보너스가 없다 (6일·8일 경계)', () {
      // 6일째 — 아직 첫 주가 안 찼다.
      expect(
        applyAttendance(now: kstNoon(21), lastDateKey: '2026-07-20', streak: 5).bonus,
        isNull,
      );
      // 8일째 — 이미 받은 주를 지나쳤다.
      expect(
        applyAttendance(now: kstNoon(21), lastDateKey: '2026-07-20', streak: 7).bonus,
        isNull,
      );
    });

    test('KST 자정 직후(UTC 15:00)는 새 날로 친다', () {
      // UTC로는 아직 7/21이지만 KST로는 7/22 00:00이다.
      final result = applyAttendance(
        now: DateTime.utc(2026, 7, 21, 15),
        lastDateKey: '2026-07-21',
        streak: 2,
      );

      expect(result.dateKey, '2026-07-22');
      expect(result.isNewDay, isTrue);
      expect(result.streak, 3);
    });

    test('저장된 날짜 키가 깨져 있으면 새로 시작한다', () {
      final result = applyAttendance(
        now: kstNoon(21),
        lastDateKey: '어제',
        streak: 4,
      );

      expect(result.streak, 1);
    });

    // 「스트릭 보너스는 하루 코인 상한과 무관하다」는 명제는 **여기서 검증할 수 없다.**
    // applyAttendance는 상한을 입력받지도, 카운터를 반환하지도 않기 때문에 어떤
    // 구현으로 바꿔도 이 파일의 단언은 통과한다 — 실질 검증은 지급 경로가 있는
    // `test/repositories/attendance_streak_test.dart`
    // ("7일 연속이면 보너스가 **상한과 무관하게** 지급된다")에 있다.
    // 상한을 채운 사용자에게 보너스를 지급하고 잔액·카운터를 함께 확인하므로
    // 보너스를 절삭하거나 카운터에 더하는 순간 빨간불이 된다.
  });
}
