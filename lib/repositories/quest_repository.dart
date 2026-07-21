import 'package:characters/characters.dart';

import '../core/constants/proof_rules.dart';
import '../core/constants/reward_rules.dart';
import '../core/error/app_failure.dart';
import '../models/difficulty.dart';
import '../models/quest.dart';
import '../models/quest_draft.dart';
import '../models/quest_status.dart';

/// 인증 메모 최대 길이(문자 수). **UI와 저장소가 공유하는 단일 진실원.**
///
/// 값이 두 곳에 흩어지면(UI `maxLength`와 저장소 절단) 언젠가 갈려서 한쪽만 낡는다.
/// `quest_memo_sheet.dart`의 TextField도 이 상수를 인용한다.
const int kMaxMemoLength = 200;

/// 퀘스트 CRUD.
///
/// 구현체는 실패 시 반드시 `AppFailure`를 던진다.
/// 목록 조회는 문서 하나가 깨져 있어도 스트림 전체를 죽이지 않고 그 항목만 버린다.
abstract interface class QuestRepository {
  /// 퀘스트 목록 스트림. `order` → `createdAt` 순으로 정렬된다.
  Stream<List<Quest>> watchQuests(String uid);

  Future<List<Quest>> fetchQuests(String uid);

  /// 퀘스트 하나 등록. 생성된(ID가 부여된) 퀘스트를 돌려준다.
  Future<Quest> createQuest(
    String uid, {
    required String title,
    required Difficulty difficulty,
    DateTime? deadline,
  });

  /// AI 분해 결과 일괄 등록 (2주차).
  ///
  /// 두 가지를 보장한다:
  /// - **원자성**: 전부 저장되거나 전부 실패한다. 부분 저장으로 인한 불일치가 없다.
  /// - **순서**: 기존 퀘스트 뒤에 이어 붙는다(`order`에 기존 개수만큼 오프셋을 더한다).
  ///   이걸 안 하면 AI가 뱉은 0..4와 기존 퀘스트의 0..2가 겹쳐 목록 순서가 뒤엉킨다.
  ///   마이크로 퀘스트는 순서가 곧 실행 경로라 순서가 섞이면 분해의 의미가 사라진다.
  ///
  /// 저장된 퀘스트(ID 부여됨)를 순서대로 돌려준다.
  Future<List<Quest>> createQuests(
    String uid,
    List<QuestDraft> drafts, {
    String? goalId,
  });

  Future<void> updateQuest(String uid, Quest quest);

  Future<void> deleteQuest(String uid, String questId);

  /// 진행 상태 변경 (미완료 · 완료 · 멈춤).
  ///
  /// ⚠️ 상태만 바꾼다. 보상을 주고 싶으면 [completeQuest]를 써라
  /// (중복 완료 시 재지급 금지 요건 때문에 여기서 지급하면 안 된다).
  Future<void> setStatus(String uid, String questId, QuestStatus status);

  /// 완료 처리 + 보상 지급을 **한 트랜잭션으로** 수행한다 (3주차).
  ///
  /// 완료는 문서 두 개를 건드린다 — 퀘스트(`status`·`completedAt`·`rewardedAt`)와
  /// 사용자(`coin`·`xp`). 둘을 한 트랜잭션에 묶어야 "퀘스트는 완료됐는데 코인은
  /// 안 들어온" 부분 반영이 생기지 않는다.
  ///
  /// **재지급은 영구히 막는다.** 보상 지급 여부의 근거는 상태도, `completedAt`도
  /// 아니라 [Quest.rewardedAt]이다 — `rewardedAt`이 null일 때만 지급한다.
  /// `completedAt`은 "언제 완료했나"라 완료를 해제하면 지워지지만(그래서 가드로
  /// 쓸 수 없다), `rewardedAt`은 한번 찍히면 절대 지워지지 않는다. 덕분에 상태가
  /// done ↔ todo로 얼마든지 토글돼도 보상은 퀘스트당 **평생 1회**다
  /// (체크를 껐다 켰다 반복하는 코인 파밍 차단).
  ///
  /// **인증 보너스 (3주차-B·사진).** 인증은 **메모 또는 사진** 중 하나만 성립해도
  /// 된다. [memo]가 공백이 아니거나 [photoBase64]가 있으면 기본 보상에
  /// [kVerificationBonus]를 **합산**해 지급한다(예: 보통 5/10 → 8/13). 둘 다 줘도
  /// 보너스는 **1회**다(중복이 아니다). 메모는 퀘스트 문서에도 함께 저장된다.
  ///
  /// 인증 정보를 완료와 **한 트랜잭션에서** 받는 이유: 완료 후에 따로 받으면 보너스가
  /// 두 번째 트랜잭션이 되고, 그 트랜잭션에도 별도의 중복 지급 가드가 필요해진다.
  /// 지금처럼 "인증 유무가 지급액을 바꾸는" 구조면 가드가 [Quest.rewardedAt] 하나로
  /// 끝난다 — 보너스도 같은 가드 아래라 **퀘스트당 평생 1회**다.
  ///
  /// **사진 저장.** [photoBase64]는 압축 썸네일의 base64다. quest·achievement 문서를
  /// 비대하게 만들지 않도록 `users/{uid}/proofs/{questId}`의 **별도 문서**에 담고,
  /// 성취 기록에는 사진 유무 플래그(`hasPhoto`)만 남긴다. 사진은 보상이 실제
  /// 지급되는 경로에서만 저장된다(재완료는 저장하지 않는다).
  ///
  /// **크기 상한.** [photoBase64]는 Firestore 1 MiB 문서 리밋 때문에
  /// [kMaxProofBase64Bytes]를 넘으면 저장할 수 없다. 화면이 첨부 단계에서 이미
  /// 막지만, 이 메서드가 public API라 저장소도 [ensureProofWithinLimit]로 한 번 더
  /// 막는다(초과 시 트랜잭션 전에 [AppFailure] — normalizeMemo와 같은 이중 방어).
  ///
  /// **성취 기록.** 보상이 실제 지급될 때만 `users/{uid}/achievements`에 기록 1건을
  /// 같은 트랜잭션으로 남긴다(재완료는 남기지 않는다). 같은 트랜잭션이라 "보상은
  /// 줬는데 기록이 없는" 불일치가 생기지 않는다.
  ///
  /// 반환: 이번 호출에서 **실제로 지급한** [Reward](보너스 포함).
  /// 이미 지급된 적 있으면 `null`(상태는 done으로 맞추되 보상은 주지 않는다).
  ///
  /// 퀘스트 문서가 없으면 `NotFoundFailure`, 그 밖의 실패는 다른 메서드와
  /// 동일하게 `AppFailure`로 정규화해 던진다.
  ///
  /// ⚠️ 레벨업 계산은 여기서 하지 않는다(4주차 경계). 잔액만 누적한다.
  Future<Reward?> completeQuest(
    String uid,
    String questId, {
    String? memo,
    String? photoBase64,
  });
}

/// 인증 메모를 정규화한다. 공백만 있으면 `null`(= 인증 불성립).
///
/// **"인증이 성립하는가"의 단일 정의처다.** 두 저장소 구현이 각자 판단하면
/// InMemory에선 보너스가 나오는데 Firestore에선 안 나오는 식으로 갈라진다 —
/// 그런 차이는 테스트가 InMemory만 보기 때문에 실기기에서야 발견된다.
String? normalizeMemo(String? memo) {
  final trimmed = memo?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;

  // UI(quest_memo_sheet)가 maxLength로 이미 막지만, completeQuest가 public API라
  // 다른 호출부가 생기면 UI를 거치지 않은 긴 문자열이 그대로 저장소로 들어온다.
  // 저장소 입구에서 한 번 더 막는다(방어).
  //
  // substring(코드유닛 기준)이 아니라 characters(문자 그래프임 기준)로 자른다.
  // 이모지·한글 결합문자는 여러 코드유닛으로 이뤄져, 코드유닛 경계에서 자르면
  // 문자가 반토막 나 깨진 글자가 저장된다. 사용자 눈에 보이는 "글자 수"로 센다.
  final chars = trimmed.characters;
  if (chars.length <= kMaxMemoLength) return trimmed;
  return chars.take(kMaxMemoLength).toString();
}

/// 인증 사진 base64가 저장 가능한 크기인지 검사한다. 넘으면 [AppFailure]를 던진다.
///
/// **"저장 가능한 크기인가"의 단일 정의처다.** normalizeMemo가 "인증이 성립하는가"를
/// 한곳에서 정하듯, 크기 판정도 두 저장소가 각자 하면 갈라진다 — InMemory에선
/// 통과하는데 Firestore에선 1 MiB 문서 리밋에 걸려 쓰기가 통째로 실패하는 식이다.
///
/// 화면(quest_memo_sheet)이 첨부 단계에서 이미 막지만, completeQuest가 public API라
/// UI를 거치지 않은 호출이 생기면 상한 없는 문자열이 그대로 들어온다. 저장소 입구에서
/// 한 번 더 막는다(normalizeMemo 절단과 같은 이중 방어).
///
/// 실패 타입: 크기 초과에 딱 맞는 기존 타입이 없어 [UnknownFailure]에 사용자용
/// 문구([kProofTooLargeMessage])를 실어 던진다(전용 타입을 새로 늘리지 않는다).
void ensureProofWithinLimit(String? photoBase64) {
  if (photoBase64 == null) return;
  // base64는 ASCII라 문자열 길이 == 바이트 수.
  if (photoBase64.length > kMaxProofBase64Bytes) {
    throw const UnknownFailure(null, kProofTooLargeMessage);
  }
}
