import '../core/constants/growth_rules.dart';
import '../core/constants/reward_rules.dart';
import '../models/app_user.dart';

/// [UserRepository.ensureUser]의 결과.
///
/// 사용자 문서를 돌려주면서 **이번 호출에서 처음 만들어졌는지**([created])를 함께
/// 알린다. 이게 필요한 이유는 성공 지표 `signup` 이벤트가 "문서 최초 생성 시 1회"
/// 라서다 — `AppUser`만 보면 신규인지 기존인지 구분할 수 없다(기존 신규 사용자도
/// 값이 초기값과 같을 수 있다). `AttendanceResult.isNewDay`가 접속 이벤트의
/// 첫날 판정을 넘겨주는 것과 같은 자리다. 로그 자체는 트랜잭션 밖(session provider)
/// 에서 이 신호를 보고 부른다.
typedef EnsureUserResult = ({AppUser user, bool created});

/// 코인이 부족해 구매할 수 없을 때 사용자에게 보여줄 문구.
///
/// [UserRepository.purchaseItem]이 잔액 부족을 [AppFailure]로 알릴 때 쓴다.
/// 화면(상점)도 미리 이 조건을 걸러 버튼을 비활성화하지만, `purchaseItem`이
/// public API라 저장소가 마지막 방어선으로 한 번 더 막는다.
const String kInsufficientCoinMessage = '코인이 부족해요.';

/// 환생 조건(Lv.50)을 아직 못 채웠을 때 사용자에게 보여줄 문구.
///
/// [UserRepository.rebirth]가 가드에서 [AppFailure]로 알릴 때 쓴다. 화면도 미리
/// `canRebirth`로 버튼을 비활성화하지만, `rebirth`가 public API라 저장소가 마지막
/// 방어선으로 한 번 더 막는다(purchaseItem의 잔액 가드와 같은 정신).
const String kCannotRebirthMessage = 'Lv.$kMaxLevel에 도달해야 환생할 수 있어요.';

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
  ///
  /// 반환의 [EnsureUserResult.created]는 **이번 호출이 문서를 만들었는지**다
  /// (`signup` 계측의 근거). 이미 있던 문서면 false.
  Future<EnsureUserResult> ensureUser(String uid);

  /// 오늘의 출석을 기록하고, 7일 연속이면 보너스를 **같은 트랜잭션에서** 지급한다.
  ///
  /// **기준은 "앱을 열었다"이지 "퀘스트를 완료했다"가 아니다.** 퀘스트를 하나도
  /// 하지 않은 날도 출석으로 친다 — 스트릭은 리텐션 지표이지 성과 지표가 아니다.
  /// 그래서 호출 지점은 세션 준비 직후([sessionProvider] 경로)다.
  ///
  /// **[ensureUser]에 합치지 않은 이유**: `ensureUser`는 "문서가 없으면 만든다"는
  /// **멱등** 계약이고, 여러 번 불려도 기존 값을 밀어내지 않는 것이 그 존재 이유다
  /// (트랜잭션인 것도 동시 호출이 지급된 코인을 0으로 되돌리는 걸 막기 위해서다).
  /// 출석은 반대로 **날짜가 바뀔 때마다 문서를 바꾸는 쓰기**라, 합치면 그 멱등성이
  /// 깨진다. 왕복이 하나 늘지만 계약을 섞는 것보다 낫다.
  ///
  /// 같은 날 다시 불려도 안전하다(멱등) — 날짜 키가 같으면 아무것도 쓰지 않고
  /// 보너스도 지급하지 않는다. 앱 재실행·탭 전환으로 여러 번 불릴 수 있기 때문에
  /// 이 성질이 필수다.
  ///
  /// 보너스 코인은 **하루 코인 상한([kDailyCoinCap])을 무시하고** 전액 지급되며,
  /// 하루 카운터(`dailyCoinEarned`)에도 더하지 않는다.
  Future<AttendanceResult> recordAttendance(String uid);

  /// 환생(프레스티지). **Lv.50 도달 시에만 성립한다.**
  ///
  /// **레벨/XP만 Lv.1로 리셋하고 `rebirth`를 1 올린다.** 코인·`equipped`·보관함·
  /// 출석/스트릭 카운터(`dailyCoin*`·`attendance*`·`streak*`)는 **전혀 건드리지
  /// 않는다** — 기획서의 "손해가 아닌 훈장" 원칙이다. 환생을 3·6회 넘기면 계열이
  /// 새 → 용 → 피닉스로 해금되는데, 그 판정은 저장이 아니라 읽는 쪽([characterFamily])
  /// 이 `rebirth` 값으로 한다.
  ///
  /// **원자적 트랜잭션이다.** user 문서를 읽어 `level >= kMaxLevel`을 확인하고,
  /// 통과하면 같은 트랜잭션에서 `{level:1, xp:0, rebirth: rebirth+1}`만 쓴다
  /// (read-before-write). Lv.50 미만이면 **write 없이** [AppFailure]를 던진다
  /// ([kCannotRebirthMessage]).
  ///
  /// ⚠️ **[completeQuest]·보상 경로와 완전히 분리된 별도 메서드다.** `rewardedAt`·
  /// `coin`·`xp` 지급 로직을 절대 건드리지 않는다(보관 쓰기를 지급 트랜잭션 밖에
  /// 두는 것과 같은 원칙).
  Future<void> rebirth(String uid);

  /// 장착 아이템 변경 (4주차 상점).
  Future<void> updateEquipped(String uid, Map<String, String> equipped);

  /// 보유 아이템 ID 집합 스트림 (4주차 상점의 "보유 중" 표시용).
  ///
  /// `users/{uid}/inventory` 하위 컬렉션의 문서 ID들을 흘린다. 문서가 없으면 빈
  /// 집합이다 — 신규 사용자도 특수 분기 없이 "아무것도 보유하지 않음"으로 렌더된다.
  Stream<Set<String>> watchInventory(String uid);

  /// 아이템 구매. **원자적 트랜잭션이다.**
  ///
  /// 사용자 문서를 읽어 `coin >= price`를 확인하고, 통과하면 **한 트랜잭션에서**
  /// `coin`을 [price]만큼 차감하면서 `inventory/{itemId}` 문서를 만든다. "코인만
  /// 빠지고 아이템은 없는" 중간 상태는 존재할 수 없다.
  ///
  /// 계약 두 가지(두 구현이 **같은 판정**을 내야 한다):
  /// - **잔액 부족이면 [AppFailure]를 던진다**([kInsufficientCoinMessage]).
  ///   코인을 한 푼도 차감하지 않고, inventory 문서도 만들지 않는다.
  /// - **이미 보유한 아이템이면 아무 일도 하지 않는다**(멱등). 코인을 다시 차감하지
  ///   않는다 — `completeQuest`의 `rewardedAt` 재지급 금지와 같은 정신이다. 두 기기가
  ///   같은 아이템을 동시에 사도 한 번만 결제된다(트랜잭션 안에서 보유 여부를 읽는다).
  Future<void> purchaseItem(String uid, String itemId, int price);
}
