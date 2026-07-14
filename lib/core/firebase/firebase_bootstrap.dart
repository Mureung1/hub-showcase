import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';

import '../../firebase_options.dart';

/// Firebase 초기화 결과. **[FirebaseBootstrap.initialize]는 절대 throw하지 않는다.**
sealed class BootstrapResult {
  const BootstrapResult();

  bool get isOk => this is BootstrapOk;
}

class BootstrapOk extends BootstrapResult {
  const BootstrapOk();
}

class BootstrapError extends BootstrapResult {
  const BootstrapError(this.message, this.cause);

  /// 사용자에게 그대로 보여줄 문구.
  final String message;
  final Object cause;
}

abstract final class FirebaseBootstrap {
  /// 앱 시작 시 한 번 호출한다. 실패해도 예외를 던지지 않고 [BootstrapError]를 돌려준다.
  ///
  /// 오프라인 동작에 대해:
  /// `Firebase.initializeApp()` 자체는 네트워크가 필요 없다(로컬 설정만 읽는다).
  /// 실제로 오프라인에서 터지는 건 (a) 최초 익명 로그인과 (b) 캐시에 없는 Firestore 읽기다.
  /// 그래서 오프라인 안전성은 여기 한 곳이 아니라 세 곳에서 확보한다:
  ///   1. 여기 — 초기화 실패 시 크래시 대신 오류 화면
  ///   2. Firestore 로컬 캐시 활성화 (아래) — 캐시된 데이터로 계속 렌더
  ///   3. FirebaseAuthRepository — 캐시된 세션이 있으면 네트워크를 건드리지 않는다
  static Future<BootstrapResult> initialize() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        ).timeout(const Duration(seconds: 15));
      }

      // 오프라인에서도 캐시된 데이터를 읽고, 쓰기는 큐에 쌓였다가 나중에 동기화된다.
      FirebaseFirestore.instance.settings = const Settings(
        persistenceEnabled: true,
        cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
      );

      _warmUpServices();

      return const BootstrapOk();
    } catch (error, stack) {
      debugPrint('Firebase 초기화 실패: $error\n$stack');
      return BootstrapError('앱을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.', error);
    }
  }

  /// Auth · Firestore · FCM · Storage 4개 서비스를 실제로 붙인다.
  ///
  /// FCM 토큰 조회는 **await하지 않는다.** 첫 프레임을 막으면 안 되고,
  /// APNs 키가 없는 개발 환경에서 실패하는 것이 정상이기 때문이다.
  ///
  /// 알림 **권한 요청은 여기서 하지 않는다.** Android 13+ / iOS에서는 시스템
  /// 다이얼로그가 뜨는데, 앱을 켜자마자 아무 맥락 없이 푸시 권한을 묻는 것은
  /// 거절률만 높인다. 실제로 알림이 필요한 시점(퀘스트 리마인더 설정 등)에
  /// [requestNotificationPermission]을 호출한다.
  static void _warmUpServices() {
    FirebaseAuth.instance;
    FirebaseFirestore.instance;
    FirebaseStorage.instance;

    final messaging = FirebaseMessaging.instance;
    () async {
      try {
        final token = await messaging.getToken();
        debugPrint('FCM token: ${token == null ? '(없음)' : '발급됨'}');
      } catch (error) {
        // 푸시가 안 붙어도 앱은 정상 동작해야 한다.
        debugPrint('FCM 초기화 건너뜀: $error');
      }
    }();
  }

  /// 알림 권한 요청. 사용자가 알림을 켜려는 맥락에서만 호출한다.
  static Future<bool> requestNotificationPermission() async {
    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      return settings.authorizationStatus == AuthorizationStatus.authorized;
    } catch (error) {
      debugPrint('알림 권한 요청 실패: $error');
      return false;
    }
  }
}
