import 'dart:async';

import '../../core/error/app_failure.dart';
import '../../models/app_user.dart';
import '../user_repository.dart';

/// Firebase 없이 도는 사용자 저장소.
class InMemoryUserRepository implements UserRepository {
  InMemoryUserRepository({this.failWith, AppUser? seed}) {
    if (seed != null) _users[seed.uid] = seed;
  }

  /// 지정하면 모든 호출이 이 실패를 던진다. 실패 경로 테스트용.
  final AppFailure? failWith;

  final Map<String, AppUser> _users = {};
  final _controller = StreamController<String>.broadcast();

  void _check() {
    if (failWith != null) throw failWith!;
  }

  @override
  Stream<AppUser> watchUser(String uid) async* {
    _check();
    yield _users[uid] ?? AppUser.initial(uid);
    await for (final changed in _controller.stream) {
      if (changed == uid) yield _users[uid] ?? AppUser.initial(uid);
    }
  }

  @override
  Future<AppUser> fetchUser(String uid) async {
    _check();
    return _users[uid] ?? AppUser.initial(uid);
  }

  @override
  Future<AppUser> ensureUser(String uid) async {
    _check();
    final existing = _users[uid];
    if (existing != null) return existing;

    final created = AppUser.initial(uid).copyWith(createdAt: DateTime.now());
    _users[uid] = created;
    _controller.add(uid);
    return created;
  }

  @override
  Future<void> updateEquipped(String uid, Map<String, String> equipped) async {
    _check();
    final current = _users[uid] ?? AppUser.initial(uid);
    _users[uid] = current.copyWith(equipped: equipped);
    _controller.add(uid);
  }

  /// 테스트·데모용 직접 주입.
  void put(AppUser user) {
    _users[user.uid] = user;
    _controller.add(user.uid);
  }

  void dispose() => _controller.close();
}
