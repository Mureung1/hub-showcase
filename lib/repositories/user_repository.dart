import '../models/app_user.dart';

/// 사용자 문서 읽기·쓰기.
///
/// 구현체는 실패 시 반드시 `AppFailure`를 던진다.
abstract interface class UserRepository {
  /// 사용자 변화 스트림.
  ///
  /// 문서가 아직 없으면 [AppUser.initial]을 흘린다 — 신규 사용자도 특수 분기 없이
  /// 정상 경로로 Lv.1 / XP 0 / 코인 0이 렌더된다.
  Stream<AppUser> watchUser(String uid);

  Future<AppUser> fetchUser(String uid);

  /// 문서가 없으면 만든다. 여러 번 불러도 안전하다(멱등).
  /// 최초 접속 시 `users/{uid}` 자동 생성이 이걸로 이뤄진다.
  Future<AppUser> ensureUser(String uid);

  /// 장착 아이템 변경 (4주차 상점).
  Future<void> updateEquipped(String uid, Map<String, String> equipped);
}
