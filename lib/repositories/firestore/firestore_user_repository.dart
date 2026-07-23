import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';
import '../../core/constants/growth_rules.dart';
import '../../core/constants/reward_rules.dart';
import '../../models/app_user.dart';
import '../user_repository.dart';
import 'firestore_codec.dart';

class FirestoreUserRepository implements UserRepository {
  FirestoreUserRepository([
    FirebaseFirestore? firestore,
    DateTime Function()? clock,
  ]) : _db = firestore ?? FirebaseFirestore.instance,
      _clock = clock ?? DateTime.now;

  final FirebaseFirestore _db;

  /// 현재 시각 공급자. 날짜 경계(KST) 판정을 테스트에서 고정하기 위해 주입 가능하다.
  ///
  /// 서버 시각(`FieldValue.serverTimestamp`)을 쓰지 않는 이유: 날짜 키는 **읽어서
  /// 비교해야** 하는 값인데 serverTimestamp는 커밋 전까지 값을 알 수 없어
  /// 트랜잭션 안에서 "오늘인가"를 판정할 수 없다.
  final DateTime Function() _clock;

  DocumentReference<Map<String, dynamic>> _doc(String uid) =>
      _db.doc(FirestorePaths.user(uid));

  @override
  Stream<AppUser> watchUser(String uid) {
    return guardStream(
      _doc(uid).snapshots().map((snapshot) {
        // 문서가 없으면 기본값을 흘린다 — 신규 사용자도 특수 분기 없이
        // Lv.1 / XP 0 / 코인 0으로 렌더된다.
        if (!snapshot.exists) return AppUser.initial(uid);
        return AppUser.fromJson(uid, decodeDoc(snapshot.data()));
      }),
    );
  }

  @override
  Future<AppUser> fetchUser(String uid) {
    return guard(() async {
      final snapshot = await _doc(uid).get();
      if (!snapshot.exists) return AppUser.initial(uid);
      return AppUser.fromJson(uid, decodeDoc(snapshot.data()));
    });
  }

  @override
  Future<EnsureUserResult> ensureUser(String uid) {
    return guard(() async {
      final ref = _doc(uid);

      // **트랜잭션이 필수다.** get → if(!exists) → set 을 그냥 이어 붙이면
      // 두 호출이 동시에 "문서 없음"을 보고 둘 다 생성 경로로 진입할 수 있고,
      // 그러면 나중 write가 {xp:0, level:1, coin:0}을 다시 써서
      // **이미 지급된 코인·XP를 0으로 되돌린다.**
      // 3주차의 트랜잭션 기반 보상 지급과 정면으로 충돌하는 경로라 여기서 막는다.
      return _db.runTransaction<EnsureUserResult>((transaction) async {
        final snapshot = await transaction.get(ref);

        if (snapshot.exists) {
          return (
            user: AppUser.fromJson(uid, decodeDoc(snapshot.data())),
            created: false,
          );
        }

        final user = AppUser.initial(uid);
        transaction.set(ref, {
          ...user.toJson(),
          'createdAt': FieldValue.serverTimestamp(),
        });
        // created=true는 signup 계측의 근거다. 로그는 이 트랜잭션 안에서 부르지
        // 않는다 — 계측 실패가 문서 생성을 롤백시키면 안 되기 때문이다. session
        // provider가 이 신호를 보고 트랜잭션 밖에서 로그를 남긴다.
        return (user: user, created: true);
      });
    });
  }

  /// 출석 기록 + 7일 보너스. **트랜잭션이 필수다** — 연속 일수와 보너스 지급 이력은
  /// 읽은 값에 기반해 갱신되므로(read-modify-write), 두 기기에서 동시에 앱을 열면
  /// 보너스가 두 번 나갈 수 있다. 트랜잭션 안에서 읽고 판단하면 한쪽만 커밋된다.
  ///
  /// 판정은 [applyAttendance] 한 곳에서만 한다(InMemory 구현과 같은 결과 보장).
  @override
  Future<AttendanceResult> recordAttendance(String uid) {
    return guard(() async {
      final ref = _doc(uid);

      return _db.runTransaction<AttendanceResult>((transaction) async {
        // read 먼저 (Firestore 트랜잭션 규칙).
        final snapshot = await transaction.get(ref);
        final current = snapshot.exists
            ? AppUser.fromJson(uid, decodeDoc(snapshot.data()))
            : AppUser.initial(uid);

        final result = applyAttendance(
          now: _clock(),
          lastDateKey: current.attendanceDate,
          streak: current.streak,
          lastBonusKey: current.streakBonusDate,
        );

        // 같은 날 재접속이면 쓰지 않는다 — 불필요한 쓰기이자, 보너스 재지급 경로다.
        if (!result.isNewDay) return result;

        final bonus = result.bonus;
        final next = applyXpGain(
          level: current.level,
          xp: current.xp,
          gained: bonus?.xp ?? 0,
        );

        transaction.set(ref, {
          'attendanceDate': result.dateKey,
          'streak': result.streak,
          // 보너스가 없으면 잔액·XP는 건드리지 않는다(0 증가를 쓰지 않는다).
          if (bonus != null) ...{
            // 상한을 거치지 않은 전액. dailyCoinEarned에도 더하지 않는다.
            'coin': FieldValue.increment(bonus.coin),
            'xp': next.xp,
            'level': next.level,
            'streakBonusDate': result.dateKey,
          },
        }, SetOptions(merge: true));

        return result;
      });
    });
  }

  @override
  Future<void> updateEquipped(String uid, Map<String, String> equipped) {
    return guard(() => _doc(uid).set({'equipped': equipped}, SetOptions(merge: true)));
  }
}
