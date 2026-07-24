import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/app_user.dart';
import 'package:one_step/repositories/memory/in_memory_user_repository.dart';
import 'package:one_step/repositories/user_repository.dart';

/// 구매 트랜잭션의 계약. Firestore 트랜잭션은 자동 테스트가 없어(fake 미도입)
/// **같은 판정**을 내는 InMemory 구현으로 규칙을 고정한다.
void main() {
  const uid = 'buyer';

  InMemoryUserRepository repoWith(int coin) => InMemoryUserRepository(
    seed: AppUser(uid: uid, coin: coin),
  );

  test('정상 구매 — 코인 차감 + inventory 추가', () async {
    final repo = repoWith(100);
    addTearDown(repo.dispose);

    await repo.purchaseItem(uid, 'bg_forest', 30);

    expect((await repo.fetchUser(uid)).coin, 70);
    expect(await repo.watchInventory(uid).first, {'bg_forest'});
  });

  test('잔액 부족 — AppFailure + 코인 불변 + inventory 미추가', () async {
    final repo = repoWith(20);
    addTearDown(repo.dispose);

    await expectLater(
      repo.purchaseItem(uid, 'bg_night', 50),
      throwsA(isA<AppFailure>()),
    );

    // 코인이 한 푼도 빠지지 않았고 보유 목록도 그대로여야 한다
    // ("코인만 빠지고 아이템 없는" 상태 불가).
    expect((await repo.fetchUser(uid)).coin, 20);
    expect(await repo.watchInventory(uid).first, isEmpty);
  });

  test('잔액 부족 메시지는 사용자용 문구다', () async {
    final repo = repoWith(0);
    addTearDown(repo.dispose);

    try {
      await repo.purchaseItem(uid, 'aura_leaf', 60);
      fail('실패했어야 한다');
    } on AppFailure catch (e) {
      expect(e.message, kInsufficientCoinMessage);
    }
  });

  test('정확히 가격만큼 있으면 살 수 있다 (경계)', () async {
    final repo = repoWith(50);
    addTearDown(repo.dispose);

    await repo.purchaseItem(uid, 'bg_night', 50);

    expect((await repo.fetchUser(uid)).coin, 0);
    expect(await repo.watchInventory(uid).first, contains('bg_night'));
  });

  test('중복 구매 — 코인 재차감 없음, 보유 1개 유지', () async {
    final repo = repoWith(100);
    addTearDown(repo.dispose);

    await repo.purchaseItem(uid, 'bg_forest', 30);
    final afterFirst = (await repo.fetchUser(uid)).coin;

    // 같은 아이템을 다시 사도 코인이 또 빠지면 안 된다(rewardedAt 가드와 같은 정신).
    await repo.purchaseItem(uid, 'bg_forest', 30);
    final afterSecond = (await repo.fetchUser(uid)).coin;

    expect(afterFirst, 70);
    expect(afterSecond, 70, reason: '중복 구매가 코인을 재차감하면 안 된다');
    expect(await repo.watchInventory(uid).first, {'bg_forest'});
  });

  test('구매는 inventory 스트림을 1회만 갱신 방출한다 (원자성)', () async {
    final repo = repoWith(100);
    addTearDown(repo.dispose);

    // take(2)가 두 번째 방출 뒤 스스로 구독을 끊어 future를 완결한다.
    final future = repo.watchInventory(uid).take(2).toList();
    // 초기 방출(빈 집합)이 흐른 뒤 구매하도록 한 틱 양보.
    await Future<void>.delayed(Duration.zero);

    await repo.purchaseItem(uid, 'bg_ocean', 30);

    // 초기 1회 + 구매 1회 = 2회. 구매가 잔액·보유를 나눠 쓰면 방출이 더 늘어난다.
    expect(await future, [<String>{}, {'bg_ocean'}]);
  });

  test('watchInventory는 신규 사용자에게 빈 집합을 흘린다', () async {
    final repo = InMemoryUserRepository();
    addTearDown(repo.dispose);

    expect(await repo.watchInventory('nobody').first, isEmpty);
  });

  test('updateEquipped가 equipped에 반영되고 재조회 시 유지된다', () async {
    final repo = repoWith(0);
    addTearDown(repo.dispose);

    await repo.updateEquipped(uid, {'background': 'bg_forest'});

    expect((await repo.fetchUser(uid)).equipped, {'background': 'bg_forest'});
    // 스트림으로 다시 읽어도 살아 있다(영속 구조).
    expect((await repo.watchUser(uid).first).equipped, {'background': 'bg_forest'});
  });
}
