import 'dart:async';

import '../../core/constants/growth_rules.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../models/app_user.dart';
import '../user_repository.dart';

/// Firebase 없이 도는 사용자 저장소.
class InMemoryUserRepository implements UserRepository {
  InMemoryUserRepository({
    this.failWith,
    AppUser? seed,
    DateTime Function()? clock,
  }) : _clock = clock ?? DateTime.now {
    if (seed != null) _users[seed.uid] = seed;
  }

  /// 지정하면 모든 호출이 이 실패를 던진다. 실패 경로 테스트용.
  final AppFailure? failWith;

  /// 현재 시각 공급자. **테스트가 실제 시계를 쓰면 안 되기 때문에** 주입 가능하다
  /// (날짜 경계·스트릭은 시각에 의존하는 로직이라 실제 시계로는 검증이 불가능하다).
  final DateTime Function() _clock;

  final Map<String, AppUser> _users = {};

  /// 사용자별 보유 아이템 ID. Firestore의 `users/{uid}/inventory`에 대응한다.
  final Map<String, Set<String>> _inventory = {};

  final _controller = StreamController<String>.broadcast();

  void _check() {
    if (failWith != null) throw failWith!;
  }

  @override
  Stream<AppUser> watchUser(String uid) async* {
    _check();
    yield _users[uid] ?? AppUser.initial(uid);
    await for (final changed in _controller.stream) {
      if (changed == uid) yield _users[uid] ?? AppUser.initial(uid);
    }
  }

  @override
  Future<AppUser> fetchUser(String uid) async {
    _check();
    return _users[uid] ?? AppUser.initial(uid);
  }

  @override
  Future<EnsureUserResult> ensureUser(String uid) async {
    _check();
    final existing = _users[uid];
    if (existing != null) return (user: existing, created: false);

    final user = AppUser.initial(uid).copyWith(createdAt: _clock());
    _users[uid] = user;
    _controller.add(uid);
    // created=true = 이번 호출이 문서를 만들었다(signup 계측 신호).
    return (user: user, created: true);
  }

  /// Firestore 트랜잭션과 **같은 의미**의 출석 기록.
  ///
  /// 판정은 전부 [applyAttendance] 한 곳에서 하고, 여기서는 그 결과를 저장만 한다.
  /// 보너스 코인은 상한을 거치지 않고 그대로 더하며 `dailyCoinEarned`에도 넣지
  /// 않는다(퀘스트 보상만 카운터에 쌓인다).
  @override
  Future<AttendanceResult> recordAttendance(String uid) async {
    _check();
    final current = _users[uid] ?? AppUser.initial(uid);

    final result = applyAttendance(
      now: _clock(),
      lastDateKey: current.attendanceDate,
      streak: current.streak,
      lastBonusKey: current.streakBonusDate,
    );

    // 같은 날 재접속이면 저장할 것이 없다(멱등).
    if (!result.isNewDay) return result;

    final bonus = result.bonus;
    final next = applyXpGain(
      level: current.level,
      xp: current.xp,
      gained: bonus?.xp ?? 0,
    );

    _users[uid] = current.copyWith(
      attendanceDate: result.dateKey,
      streak: result.streak,
      coin: current.coin + (bonus?.coin ?? 0),
      xp: next.xp,
      level: next.level,
      streakBonusDate: bonus != null ? result.dateKey : null,
    );
    _controller.add(uid);
    return result;
  }

  @override
  Future<void> updateEquipped(String uid, Map<String, String> equipped) async {
    _check();
    final current = _users[uid] ?? AppUser.initial(uid);
    _users[uid] = current.copyWith(equipped: equipped);
    _controller.add(uid);
  }

  @override
  Stream<Set<String>> watchInventory(String uid) async* {
    _check();
    yield {...?_inventory[uid]};
    await for (final changed in _controller.stream) {
      if (changed == uid) yield {...?_inventory[uid]};
    }
  }

  /// Firestore 트랜잭션과 **같은 판정**의 구매.
  ///
  /// 단일 스레드 + await 없는 상태 변경이라 별도 잠금 없이 원자적이다. 중요한 건
  /// Firestore 구현과 순서·가드를 맞추는 것이다: ① 이미 보유면 코인을 건드리지
  /// 않고 조용히 반환(멱등), ② 잔액 부족이면 차감·추가 없이 실패. 둘 다 통과할
  /// 때만 잔액을 깎고 inventory에 추가하며, 방출은 **한 번**이다(잔액·보유가 같은
  /// 프레임에 반영돼 화면이 중간 상태를 보지 않는다).
  @override
  Future<void> purchaseItem(String uid, String itemId, int price) async {
    _check();
    final current = _users[uid] ?? AppUser.initial(uid);
    final owned = _inventory[uid] ?? const <String>{};

    // 이미 보유 — 코인 재차감 없이 조용히 통과(멱등).
    if (owned.contains(itemId)) return;

    // 잔액 부족 — 차감하지 않고 실패한다(코인만 빠지는 상태 불가).
    if (current.coin < price) {
      throw const UnknownFailure(null, kInsufficientCoinMessage);
    }

    _users[uid] = current.copyWith(coin: current.coin - price);
    (_inventory[uid] ??= <String>{}).add(itemId);
    _controller.add(uid);
  }

  /// 테스트·데모용 직접 주입.
  void put(AppUser user) {
    _users[user.uid] = user;
    _controller.add(user.uid);
  }

  /// 테스트·데모용 보유 아이템 직접 주입.
  void putInventory(String uid, Set<String> itemIds) {
    _inventory[uid] = {...itemIds};
    _controller.add(uid);
  }

  void dispose() => _controller.close();
}
