import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';
import '../../models/app_user.dart';
import '../user_repository.dart';
import 'firestore_codec.dart';

class FirestoreUserRepository implements UserRepository {
  FirestoreUserRepository([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

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
  Future<AppUser> ensureUser(String uid) {
    return guard(() async {
      final ref = _doc(uid);

      // **트랜잭션이 필수다.** get → if(!exists) → set 을 그냥 이어 붙이면
      // 두 호출이 동시에 "문서 없음"을 보고 둘 다 생성 경로로 진입할 수 있고,
      // 그러면 나중 write가 {xp:0, level:1, coin:0}을 다시 써서
      // **이미 지급된 코인·XP를 0으로 되돌린다.**
      // 3주차의 트랜잭션 기반 보상 지급과 정면으로 충돌하는 경로라 여기서 막는다.
      return _db.runTransaction<AppUser>((transaction) async {
        final snapshot = await transaction.get(ref);

        if (snapshot.exists) {
          return AppUser.fromJson(uid, decodeDoc(snapshot.data()));
        }

        final user = AppUser.initial(uid);
        transaction.set(ref, {
          ...user.toJson(),
          'createdAt': FieldValue.serverTimestamp(),
        });
        return user;
      });
    });
  }

  @override
  Future<void> updateEquipped(String uid, Map<String, String> equipped) {
    return guard(() => _doc(uid).set({'equipped': equipped}, SetOptions(merge: true)));
  }
}
