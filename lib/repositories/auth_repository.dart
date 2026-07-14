/// 인증. 1주차 범위는 익명 로그인 + 세션 유지뿐이다.
///
/// 구현체는 실패 시 반드시 `AppFailure`를 던진다(`FirebaseAuthException` 금지).
abstract interface class AuthRepository {
  /// 현재 로그인된 사용자 ID. 로그인 전이면 `null`.
  String? get currentUid;

  /// 로그인 상태 변화 스트림. 앱 시작 시 캐시된 세션이 있으면 곧바로 uid를 흘린다.
  Stream<String?> watchUid();

  /// 익명 로그인. 이미 로그인돼 있으면 기존 uid를 그대로 돌려준다.
  Future<String> signInAnonymously();

  Future<void> signOut();
}
