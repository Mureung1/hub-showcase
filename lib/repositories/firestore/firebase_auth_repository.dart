import 'package:firebase_auth/firebase_auth.dart';

import '../../core/error/app_failure.dart';
import '../auth_repository.dart';
import 'firestore_codec.dart';

/// Firebase 익명 인증.
///
/// 오프라인 동작이 중요하다: 앱을 껐다 켜면 `currentUser`가 캐시에서 즉시 복원되므로
/// 네트워크가 없어도 기존 세션으로 계속 쓸 수 있다.
/// 네트워크가 없는 **첫 실행**만 로그인이 불가능하고, 그때도 크래시가 아니라
/// 재시도 가능한 오류 상태를 보여준다.
class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository([FirebaseAuth? auth])
    : _auth = auth ?? FirebaseAuth.instance;

  final FirebaseAuth _auth;

  @override
  String? get currentUid => _auth.currentUser?.uid;

  @override
  Stream<String?> watchUid() =>
      guardStream(_auth.authStateChanges().map((user) => user?.uid));

  @override
  Future<String> signInAnonymously() async {
    // 이미 로그인돼 있으면(= 캐시된 세션) 네트워크를 건드리지 않는다.
    final existing = _auth.currentUser;
    if (existing != null) return existing.uid;

    return guard(() async {
      final credential = await _auth.signInAnonymously();
      final uid = credential.user?.uid;
      if (uid == null) throw const UnknownFailure('익명 로그인이 uid를 반환하지 않음');
      return uid;
    });
  }

  @override
  Future<void> signOut() => guard(() => _auth.signOut());
}
