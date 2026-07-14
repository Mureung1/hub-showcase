/// 앱 전체가 쓰는 실패 타입.
///
/// **저장소는 `FirebaseException`을 위로 흘려보내지 않는다.** 전부 [AppFailure]로
/// 정규화해서 던진다. 그래야 (a) UI가 Firebase를 몰라도 되고, (b) 테스트에서
/// 가짜 실패를 주입하기 쉬우며, (c) 2·3주차의 실패 경로 검증이 한 줄로 끝난다.
///
/// [message]는 그대로 사용자에게 보여줄 수 있는 한국어 문구다.
sealed class AppFailure implements Exception {
  const AppFailure(this.message, [this.cause]);

  /// 사용자에게 그대로 노출 가능한 문구.
  final String message;

  /// 원인 예외 (로깅·디버깅용, 사용자에게 보여주지 않는다).
  final Object? cause;

  @override
  String toString() => '$runtimeType: $message${cause == null ? '' : ' ($cause)'}';
}

/// 네트워크 없음 · 서버 도달 불가 · 타임아웃.
class NetworkFailure extends AppFailure {
  const NetworkFailure([Object? cause])
    : super('인터넷 연결을 확인해 주세요.', cause);
}

/// 권한 없음 (Firestore 보안 규칙 거부 · 로그인 만료).
class PermissionFailure extends AppFailure {
  const PermissionFailure([Object? cause])
    : super('접근 권한이 없어요. 다시 로그인해 주세요.', cause);
}

/// 문서·리소스 없음.
class NotFoundFailure extends AppFailure {
  const NotFoundFailure([Object? cause]) : super('찾을 수 없는 항목이에요.', cause);
}

/// 응답을 해석할 수 없음 (깨진 JSON · 스키마 불일치). 2주차 AI 응답 검증에서 쓴다.
class ParseFailure extends AppFailure {
  const ParseFailure([Object? cause]) : super('데이터를 읽을 수 없어요.', cause);
}

/// 분류되지 않은 실패.
class UnknownFailure extends AppFailure {
  const UnknownFailure([Object? cause])
    : super('알 수 없는 오류가 발생했어요.', cause);
}
