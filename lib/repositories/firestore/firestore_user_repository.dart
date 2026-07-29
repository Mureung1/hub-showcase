import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';
import '../../core/constants/growth_rules.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
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

  /// 환생 = 레벨/XP만 리셋 + rebirth+1. **트랜잭션이 필수다** — Lv.50 확인이
  /// 읽은 값에 기반하고(read-modify-write), 두 기기에서 동시에 눌러도 rebirth가
  /// 두 번 오르면 안 된다. 트랜잭션 안에서 읽고 판단하면 한쪽만 커밋된다.
  ///
  /// coin·equipped·dailyCoin·streak은 **쓰기 맵에 넣지 않는다** — merge:true라
  /// 명시하지 않은 필드는 그대로 보존된다("손해가 아닌 훈장"). completeQuest·
  /// rewardedAt 경로와 무관한 별도 쓰기다.
  @override
  Future<void> rebirth(String uid) {
    return guard(() async {
      final ref = _doc(uid);

      await _db.runTransaction((transaction) async {
        final snapshot = await transaction.get(ref);
        final current = snapshot.exists
            ? AppUser.fromJson(uid, decodeDoc(snapshot.data()))
            : AppUser.initial(uid);

        // 가드 — throw가 트랜잭션을 중단시켜 어떤 write도 커밋되지 않는다.
        if (current.level < kMaxLevel) {
          throw const UnknownFailure(null, kCannotRebirthMessage);
        }

        // 레벨/XP만 리셋 + rebirth+1. coin·equipped 등은 건드리지 않는다.
        transaction.set(ref, {
          'level': 1,
          'xp': 0,
          'rebirth': current.rebirth + 1,
        }, SetOptions(merge: true));
      });
    });
  }

  /// 장착 슬롯 맵을 **통째로 교체**한다(장착·해제 공용).
  ///
  /// ⚠️ **`SetOptions(merge: true)`를 쓰면 안 된다.** merge는 맵 필드를 **깊게 병합**
  /// 하므로 새 맵에 없는 키를 서버에서 지우지 않는다. 상점의 「해제」는 로컬 맵에서
  /// 슬롯 키를 **빼고** 이 메서드를 부르는데, merge:true에서는 그 삭제가 서버에
  /// 도달하지 못한다 — 앱을 다시 켜면 벗은 아이템이 그대로 장착돼 있었다(키를
  /// **더하는** 장착만 우연히 동작했다).
  ///
  /// `mergeFields: ['equipped']`는 그 필드 하나만 **통째로 덮어쓰고** `coin`·`level`·
  /// `streak` 등 문서의 나머지 필드는 건드리지 않는다. "merge가 더 안전해 보인다"며
  /// 되돌리지 말 것 — 되돌리는 순간 해제가 다시 서버에 반영되지 않는다.
  ///
  /// 이 결함은 `InMemoryUserRepository`로는 재현되지 않는다(저쪽은
  /// `copyWith(equipped:)`로 통째 교체라 정상 동작한다). **저장소 구현 간 의미 차이**다.
  @override
  Future<void> updateEquipped(String uid, Map<String, String> equipped) {
    return guard(
      () => _doc(
        uid,
      ).set({'equipped': equipped}, SetOptions(mergeFields: ['equipped'])),
    );
  }

  @override
  Stream<Set<String>> watchInventory(String uid) {
    return guardStream(
      _db
          .collection(FirestorePaths.inventory(uid))
          .snapshots()
          .map((snap) => snap.docs.map((doc) => doc.id).toSet()),
    );
  }

  /// 구매 = 코인 차감 + inventory 문서 생성을 **한 트랜잭션으로** (4주차 상점).
  ///
  /// 트랜잭션인 이유: 두 문서(user·inventory item)를 함께 바꾸기 때문이다. 따로
  /// 커밋되면 "코인은 빠졌는데 아이템이 없는" 상태가 남는다.
  ///
  /// 재구매 차단의 근거는 **읽어 온 inventory 문서의 존재 여부**다(문서 ID = itemId).
  /// 트랜잭션 안에서 읽고 판단하므로, 같은 아이템을 두 기기에서 동시에 사도 한쪽만
  /// 커밋된다(다른 쪽은 문서가 생긴 걸 감지해 재시도 → 이때는 이미 존재하니 결제하지
  /// 않는다). 잔액 부족이면 write 없이 [AppFailure]를 던져 트랜잭션 전체가 중단된다.
  @override
  Future<void> purchaseItem(String uid, String itemId, int price) {
    return guard(() async {
      final userRef = _doc(uid);
      final itemRef = _db.doc(FirestorePaths.inventoryItem(uid, itemId));

      await _db.runTransaction((transaction) async {
        // ⚠️ Firestore 규칙: 모든 read가 모든 write보다 앞서야 한다.
        final itemSnap = await transaction.get(itemRef);
        final userSnap = await transaction.get(userRef);

        // 이미 보유 — 재결제 없이 반환(멱등). completeQuest의 rewardedAt 가드와 대칭.
        if (itemSnap.exists) return;

        final current = userSnap.exists
            ? AppUser.fromJson(uid, decodeDoc(userSnap.data()))
            : AppUser.initial(uid);

        // 잔액 부족 — throw가 트랜잭션을 중단시켜 어떤 write도 커밋되지 않는다.
        if (current.coin < price) {
          throw const UnknownFailure(null, kInsufficientCoinMessage);
        }

        // coin은 현재 잔액을 다시 계산하지 않고 감산만 하면 되므로 increment 유지.
        // merge:true라 사용자 문서가 아직 없어도 안전하다.
        transaction.set(userRef, {
          'coin': FieldValue.increment(-price),
        }, SetOptions(merge: true));
        transaction.set(itemRef, {
          'itemId': itemId,
          'acquiredAt': FieldValue.serverTimestamp(),
        });
      });
    });
  }
}
