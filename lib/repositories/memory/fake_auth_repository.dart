import 'dart:async';

import '../../core/error/app_failure.dart';
import '../auth_repository.dart';

/// Firebase 없이 도는 인증.
///
/// `lib/`에 두는 이유: (a) 테스트가 mock 라이브러리 없이 바로 쓰고,
/// (b) Firebase 설정 전에도 앱 전체를 실행·데모할 수 있다.
class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.failWith, String? initialUid}) : _uid = initialUid {
    _controller.add(_uid);
  }

  /// 지정하면 모든 호출이 이 실패를 던진다. 실패 경로 테스트용.
  final AppFailure? failWith;

  final _controller = StreamController<String?>.broadcast();
  String? _uid;

  @override
  String? get currentUid => _uid;

  @override
  Stream<String?> watchUid() async* {
    yield _uid;
    yield* _controller.stream;
  }

  @override
  Future<String> signInAnonymously() async {
    if (failWith != null) throw failWith!;
    _uid ??= 'fake-uid';
    _controller.add(_uid);
    return _uid!;
  }

  @override
  Future<void> signOut() async {
    _uid = null;
    _controller.add(null);
  }

  void dispose() => _controller.close();
}
