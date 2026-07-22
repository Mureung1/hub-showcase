import '../../models/difficulty.dart';
import '../utils/kst_date.dart';

/// 난이도별 보상. 정본: `docs/plan.md` 기능 B.
///
/// 쉬움 코인3/XP5 · 보통 코인5/XP10 · 어려움 코인10/XP20
class Reward {
  const Reward({required this.coin, required this.xp});

  final int coin;
  final int xp;

  static const zero = Reward(coin: 0, xp: 0);

  Reward operator +(Reward other) =>
      Reward(coin: coin + other.coin, xp: xp + other.xp);

  @override
  bool operator ==(Object other) =>
      other is Reward && other.coin == coin && other.xp == xp;

  @override
  int get hashCode => Object.hash(coin, xp);

  @override
  String toString() => 'Reward(coin: $coin, xp: $xp)';
}

/// 난이도 → 기본 보상.
const Map<Difficulty, Reward> kBaseRewards = {
  Difficulty.easy: Reward(coin: 3, xp: 5),
  Difficulty.normal: Reward(coin: 5, xp: 10),
  Difficulty.hard: Reward(coin: 10, xp: 20),
};

/// 사진·메모 인증 시 추가 지급되는 보너스 (3주차).
const Reward kVerificationBonus = Reward(coin: 3, xp: 3);

/// 난이도별 기본 보상을 돌려준다.
///
/// [Difficulty]가 enum이라 알 수 없는 값이 여기까지 올 수 없다.
/// 문자열 단계에서의 방어는 [Difficulty.fromNameOrDefault]가 담당한다.
Reward rewardFor(Difficulty difficulty) =>
    kBaseRewards[difficulty] ?? Reward.zero;

/// 하루에 **퀘스트로** 얻을 수 있는 코인 상한 (3주차 보상 경제).
///
/// 상한의 목적은 코인 경제 보호다. 반복 보상 점감은 **구현하지 않는다** —
/// 반복 문제는 이 상한 하나로 막기로 사용자와 확정했다(2026-07-22).
const int kDailyCoinCap = 70;

/// 연속 출석 보너스가 나오는 주기(일).
const int kStreakBonusDays = 7;

/// 1주치 연속 출석 보너스 단위. 주차마다 이 값이 누적된다(15/25 → 30/50 → …).
const Reward kStreakBonusPerWeek = Reward(coin: 15, xp: 25);

/// 보너스가 더 이상 커지지 않는 주차(상한).
///
/// 상한을 두는 이유: 하루 코인 상한([kDailyCoinCap])의 목적이 코인 경제 보호인데,
/// 상한 **밖에서** 지급되는 스트릭 보너스가 무한히 자라면 그 장치가 무력해진다.
const int kMaxStreakBonusWeeks = 4;

/// 연속 일수 → 연속 출석 보너스. **하루 코인 상한과 무관하다** — 상한 카운터에
/// 더하지도, 상한에 걸려 깎이지도 않는다. 여러 주를 버틴 보상이 "오늘 이미 70을
/// 채웠다"는 이유로 사라지면 스트릭 자체가 무의미해진다.
///
/// 주차 = `streak ~/ kStreakBonusDays`, [kMaxStreakBonusWeeks]에서 상한.
/// 7의 배수가 아니면 보너스가 없다([Reward.zero]가 아니라 그 판정은
/// [applyAttendance]가 한다 — 여기서는 "그 날 받을 금액"만 계산한다).
///
/// **순수 함수로 유지한다.** 두 저장소(Firestore·InMemory)가 같은 결과를 내야
/// 한다 — [applyDailyCoinCap]과 같은 이유다.
Reward streakBonusFor(int streak) {
  if (streak < kStreakBonusDays) return Reward.zero;

  final weeks = streak ~/ kStreakBonusDays;
  final capped = weeks > kMaxStreakBonusWeeks ? kMaxStreakBonusWeeks : weeks;

  return Reward(
    coin: kStreakBonusPerWeek.coin * capped,
    xp: kStreakBonusPerWeek.xp * capped,
  );
}

/// 퀘스트 하나를 완료했을 때의 **절삭 전** 보상 (적용 순서 1 + 2).
///
/// 1. 난이도별 기본 보상([kBaseRewards])
/// 2. + 인증 보너스([kVerificationBonus], 메모 **또는** 사진이면 1회)
///
/// 이걸 함수로 뽑아 둔 이유: 두 저장소 구현과 **화면**이 같은 식을 쓴다.
/// 화면은 이 값과 실제 지급액을 비교해 "상한에 걸려 깎였는가"를 알아낸다 —
/// 각자 더하기를 반복하면 언젠가 한 곳만 낡는다.
Reward questReward(Difficulty difficulty, {required bool verified}) =>
    rewardFor(difficulty) + (verified ? kVerificationBonus : Reward.zero);

/// 하루 코인 상한을 적용한다 (적용 순서 3).
///
/// - **부분 지급한다.** 68코인 쌓인 상태에서 어려움(10코인)을 완료하면 2코인을
///   준다(0이 아니다). 남은 여유만큼은 반드시 지급한다.
/// - **코인만 절삭한다. XP는 상한이 없다.** XP까지 막으면 성장이 멈춰
///   "오늘은 더 해도 소용없다"가 된다 — 상한의 목적은 코인 경제 보호이지
///   사용자를 멈추게 하는 것이 아니다.
///
/// [earnedToday]는 **오늘(KST) 퀘스트로 이미 받은 코인**이다. 날짜가 바뀌었으면
/// 호출부가 0을 넘긴다([AppUser.coinEarnedToday]가 그 판정을 한다).
///
/// 반환: `paid`(실제 지급액) · `dailyCoin`(절삭 후 오늘 누적) ·
/// `capped`(상한 때문에 깎였는가).
({Reward paid, int dailyCoin, bool capped}) applyDailyCoinCap({
  required Reward reward,
  required int earnedToday,
}) {
  // 저장된 값이 음수거나 상한을 넘겨 오염돼 있어도 계산이 폭주하지 않게 방어한다.
  final already = earnedToday.clamp(0, kDailyCoinCap);
  final room = kDailyCoinCap - already;
  final wanted = reward.coin < 0 ? 0 : reward.coin;
  final paidCoin = wanted < room ? wanted : room;

  return (
    // XP는 그대로 통과시킨다.
    paid: Reward(coin: paidCoin, xp: reward.xp),
    dailyCoin: already + paidCoin,
    capped: paidCoin < reward.coin,
  );
}

/// 출석 기록 1회의 결과.
class AttendanceResult {
  const AttendanceResult({
    required this.streak,
    required this.dateKey,
    required this.isNewDay,
    this.bonus,
  });

  /// 오늘 기준 연속 출석 일수. **끊긴 날은 0이 아니라 1이다** — 오늘은 출석했다.
  final int streak;

  /// 오늘의 KST 날짜 키.
  final String dateKey;

  /// 오늘 **첫** 출석이었는가. false면 같은 날 재접속이라 저장할 것이 없다.
  final bool isNewDay;

  /// 이번 호출에서 지급된 연속 출석 보너스. 없으면 null.
  final Reward? bonus;

  @override
  bool operator ==(Object other) =>
      other is AttendanceResult &&
      other.streak == streak &&
      other.dateKey == dateKey &&
      other.isNewDay == isNewDay &&
      other.bonus == bonus;

  @override
  int get hashCode => Object.hash(streak, dateKey, isNewDay, bonus);

  @override
  String toString() =>
      'AttendanceResult($dateKey, streak $streak, new $isNewDay, bonus $bonus)';
}

/// 출석 1회를 반영한 결과를 계산한다 (적용 순서 4 — 상한 **밖**).
///
/// 판정 기준은 전부 KST 날짜 키다:
/// - 같은 날 재접속([lastDateKey]가 오늘) → 아무것도 바뀌지 않고 보너스도 없다.
///   앱을 다시 켤 때마다 스트릭이 늘거나 보너스가 또 나가면 안 된다.
/// - 어제 출석했다(간격 1일) → 연속 +1.
/// - 그 외(처음 · 하루 이상 건너뜀 · 시계가 거꾸로 감) → **1로 초기화**한다.
///   0이 아니다. 오늘은 출석했으니 오늘부터 1일째다.
///
/// 보너스는 연속 일수가 [kStreakBonusDays]의 배수일 때 나가고(7·14·21…),
/// 금액은 [streakBonusFor]가 주차에 따라 정한다.
/// 여기에 [lastBonusKey] 가드를 하나 더 둔다 — 같은 날 두 경로에서 출석이
/// 기록되더라도 하루에 보너스가 두 번 나갈 수 없게 한다.
AttendanceResult applyAttendance({
  required DateTime now,
  required String? lastDateKey,
  required int streak,
  String? lastBonusKey,
}) {
  final todayKey = kstDateKey(now);

  // 같은 날 재접속 — 상태를 그대로 돌려준다(쓰기도 보너스도 없다).
  if (lastDateKey == todayKey) {
    return AttendanceResult(
      streak: streak < 1 ? 1 : streak,
      dateKey: todayKey,
      isNewDay: false,
    );
  }

  final today = kstDayNumber(now);
  final last = kstDayNumberOfKey(lastDateKey);
  // 어제 출석했을 때만 이어진다. 그 밖은 전부 새로 시작(1일째).
  final continued = last != null && today - last == 1;
  final nextStreak = continued ? (streak < 1 ? 1 : streak) + 1 : 1;

  final reached = nextStreak % kStreakBonusDays == 0;
  // 하루 1회 가드: 오늘 이미 보너스를 받았다면 다시 주지 않는다.
  final grant = reached && lastBonusKey != todayKey;

  return AttendanceResult(
    streak: nextStreak,
    dateKey: todayKey,
    isNewDay: true,
    bonus: grant ? streakBonusFor(nextStreak) : null,
  );
}
