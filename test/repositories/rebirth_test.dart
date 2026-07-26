import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';
import 'package:one_step/repositories/user_repository.dart';

/// 환생 실행 경로의 계약. Firestore 트랜잭션은 자동 테스트가 없어(fake 미도입)
/// **같은 판정**을 내는 InMemory 구현으로 규칙을 고정한다(purchaseItem과 같은 방식).
void main() {
  const uid = 'reborn';

  test('Lv.50이면 레벨1·xp0·rebirth+1로 환생한다', () async {
    final repo = InMemoryUserRepository(
      seed: const AppUser(uid: uid, level: kMaxLevel, xp: 0, rebirth: 0),
    );
    addTearDown(repo.dispose);

    await repo.rebirth(uid);

    final after = await repo.fetchUser(uid);
    expect(after.level, 1);
    expect(after.xp, 0);
    expect(after.rebirth, 1);
  });

  test('환생해도 코인·장착·스트릭은 그대로 유지된다 ("손해가 아닌 훈장")', () async {
    final repo = InMemoryUserRepository(
      seed: const AppUser(
        uid: uid,
        level: kMaxLevel,
        xp: 40,
        coin: 999,
        rebirth: 2,
        equipped: {'background': 'bg_forest'},
        streak: 7,
        dailyCoinDate: '2026-07-26',
        dailyCoinEarned: 30,
      ),
    );
    addTearDown(repo.dispose);

    await repo.rebirth(uid);

    final after = await repo.fetchUser(uid);
    // 리셋되는 것.
    expect(after.level, 1);
    expect(after.xp, 0);
    expect(after.rebirth, 3);
    // 유지되는 것 — 하나라도 초기화되면 실패한다.
    expect(after.coin, 999, reason: '코인은 환생으로 초기화되지 않는다');
    expect(after.equipped, {'background': 'bg_forest'});
    expect(after.streak, 7);
    expect(after.dailyCoinDate, '2026-07-26');
    expect(after.dailyCoinEarned, 30);
  });

  test('Lv.50 미만이면 AppFailure이고 아무것도 바뀌지 않는다 (가드)', () async {
    final repo = InMemoryUserRepository(
      seed: const AppUser(uid: uid, level: 49, xp: 10, coin: 100, rebirth: 1),
    );
    addTearDown(repo.dispose);

    await expectLater(repo.rebirth(uid), throwsA(isA<AppFailure>()));

    // 레벨·xp·rebirth·coin 모두 그대로 — 리셋도 증가도 없다.
    final after = await repo.fetchUser(uid);
    expect(after.level, 49);
    expect(after.xp, 10);
    expect(after.rebirth, 1);
    expect(after.coin, 100);
  });

  test('가드 메시지는 사용자용 문구다', () async {
    final repo = InMemoryUserRepository(
      seed: const AppUser(uid: uid, level: 10),
    );
    addTearDown(repo.dispose);

    try {
      await repo.rebirth(uid);
      fail('실패했어야 한다');
    } on AppFailure catch (e) {
      expect(e.message, kCannotRebirthMessage);
    }
  });

  test('용 계열 임계(3회) 도달 — 환생 후 계열이 용으로 바뀐다', () async {
    // rebirth 2 → 새, 환생 1회로 3이 되어 용 계열이 열린다.
    final repo = InMemoryUserRepository(
      seed: const AppUser(uid: uid, level: kMaxLevel, rebirth: 2),
    );
    addTearDown(repo.dispose);

    // 환생 전에는 아직 새 계열.
    expect(characterFamily((await repo.fetchUser(uid)).rebirth), CharacterFamily.bird);

    await repo.rebirth(uid);

    final after = await repo.fetchUser(uid);
    expect(after.rebirth, kDragonRebirth);
    expect(characterFamily(after.rebirth), CharacterFamily.dragon);
    // Lv.1로 리셋됐으니 '용의 알'로 보인다.
    expect(after.stage.name, '용의 알');
  });

  test('환생 결과는 스트림·재조회로 유지된다 (영속 구조)', () async {
    final repo = InMemoryUserRepository(
      seed: const AppUser(uid: uid, level: kMaxLevel, rebirth: 0),
    );
    addTearDown(repo.dispose);

    await repo.rebirth(uid);

    // 스트림으로 다시 읽어도 살아 있다.
    final streamed = await repo.watchUser(uid).first;
    expect(streamed.rebirth, 1);
    expect(streamed.level, 1);
  });

  test('연속 환생 — Lv.50을 다시 채우면 또 오른다', () async {
    final repo = InMemoryUserRepository(
      seed: const AppUser(uid: uid, level: kMaxLevel, rebirth: 0),
    );
    addTearDown(repo.dispose);

    await repo.rebirth(uid);
    // 다시 Lv.50으로(테스트 주입).
    repo.put((await repo.fetchUser(uid)).copyWith(level: kMaxLevel));
    await repo.rebirth(uid);

    expect((await repo.fetchUser(uid)).rebirth, 2);
  });
}
