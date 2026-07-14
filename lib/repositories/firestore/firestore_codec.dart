// Firestore ↔ 모델 경계의 변환·오류 정규화.
//
// 두 가지를 여기서 막는다:
// 1. `Timestamp`가 `models/`로 새는 것 — 모델은 순수 Dart로 남아야 테스트가 가볍다.
// 2. `FirebaseException`이 UI로 새는 것 — 화면은 Firebase를 몰라야 한다.

// FirebaseException은 cloud_firestore가 재수출한다(별도 firebase_core import 불필요).
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/error/app_failure.dart';

/// Firestore 문서의 `Timestamp`를 `DateTime`으로 바꿔 모델에 넘긴다.
Map<String, dynamic> decodeDoc(Map<String, dynamic>? data) {
  if (data == null) return {};
  return data.map((key, value) {
    if (value is Timestamp) return MapEntry(key, value.toDate());
    return MapEntry(key, value);
  });
}

/// Firebase 예외를 앱 공통 실패 타입으로 정규화한다.
///
/// **저장소 밖으로 FirebaseException을 내보내지 않는다.**
AppFailure mapFirebaseError(Object error, [StackTrace? stack]) {
  if (error is AppFailure) return error;

  if (error is FirebaseException) {
    return switch (error.code) {
      'unavailable' ||
      'network-request-failed' ||
      'deadline-exceeded' => NetworkFailure(error),
      'permission-denied' ||
      'unauthenticated' ||
      'user-disabled' => PermissionFailure(error),
      'not-found' => NotFoundFailure(error),
      _ => UnknownFailure(error),
    };
  }

  if (error is FormatException) return ParseFailure(error);

  return UnknownFailure(error);
}

/// Future를 감싸 실패를 [AppFailure]로 바꾼다.
Future<T> guard<T>(Future<T> Function() action) async {
  try {
    return await action();
  } catch (error, stack) {
    throw mapFirebaseError(error, stack);
  }
}

/// Stream을 감싸 실패를 [AppFailure]로 바꾼다.
Stream<T> guardStream<T>(Stream<T> source) {
  // FirebaseAuthException도 FirebaseException의 하위 타입이라 함께 정규화된다.
  return source.handleError((Object error, StackTrace stack) {
    throw mapFirebaseError(error, stack);
  });
}
