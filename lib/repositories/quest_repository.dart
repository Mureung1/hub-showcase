import 'package:characters/characters.dart';

import '../core/constants/growth_rules.dart';
import '../core/constants/proof_rules.dart';
import '../core/constants/reward_rules.dart';
import '../core/error/app_failure.dart';
import '../models/achievement.dart';
import '../models/difficulty.dart';
import '../models/quest.dart';
import '../models/quest_draft.dart';
import '../models/quest_source.dart';
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
  /// **재분해 자식 등록 (4주차 B-5).** [parentQuestId]를 주면 저장되는 퀘스트들이
  /// "그 원본 퀘스트를 더 작게 나눈 결과"로 기록된다.
  ///
  /// 원본은 지우지도 바꾸지도 않는다 — 성공 지표 「재분해 복귀율」은
  /// **분모 = 멈춘(stuck) 원본 · 분자 = `parentQuestId`가 달린 자식**이라,
  /// 원본을 자식으로 대체해 버리면 지표의 근거가 통째로 사라진다.
  /// 자식은 원본의 `goalId`를 그대로 [goalId]로 받아 **같은 목표 폴더에 남는다.**
  ///
  /// **출처 (회귀 A).** [source]는 저장되는 퀘스트가 AI 분해 결과인지 직접 등록인지를
  /// 문서에 명시한다. 카드의 출처 칩(`✨AI`/`✎직접`)이 이 값을 읽는다. 기본값
  /// [QuestSource.ai]는 이 경로의 주 사용처가 AI 분해(+재분해)이기 때문이며, 직접
  /// 등록은 [QuestSource.manual]을 넘긴다. goalId 유무로 출처를 추론하던 옛 방식은
  /// 직접 등록이 목표(폴더) 단위가 되며 깨졌다([Quest.source] 참고).
  ///
  /// 저장된 퀘스트(ID 부여됨)를 순서대로 돌려준다.
  Future<List<Quest>> createQuests(
    String uid,
    List<QuestDraft> drafts, {
    String? goalId,
    String? parentQuestId,
    QuestSource source = QuestSource.ai,
  });

  Future<void> updateQuest(String uid, Quest quest);

  Future<void> deleteQuest(String uid, String questId);

  /// 여러 퀘스트를 **한 번에 원자적으로** 삭제한다 (4주차 B-5b — 재분해 원본 삭제).
  ///
  /// 재분해 원본을 지울 때 그 하위 계보까지 함께 지우기 위한 경로다. 계보 계산은
  /// **화면**이 `descendantIds`로 하고(저장소는 트리를 모른다), 저장소는 "이 ID들을
  /// 원자적으로 지운다"만 책임진다 — 관심사가 섞이지 않게 [createQuests]와 대칭이다.
  ///
  /// 보장 두 가지:
  /// - **원자성**: 전부 지워지거나 전부 실패한다(부모만 지워져 자식이 고아로 남는
  ///   중간 상태가 없다). Firestore는 batch, InMemory는 스테이징 후 스트림 **1회** 방출.
  /// - **없는 ID는 무시한다.** 삭제는 멱등이라, 이미 지워졌거나 존재하지 않는 ID가
  ///   섞여 있어도 실패하지 않는다.
  ///
  /// ⚠️ **삭제는 지급된 코인·XP를 회수하지 않는다.** 퀘스트 문서의 `rewardedAt`은
  /// 함께 사라지지만, 이미 사용자 문서(`coin`·`xp`)에 반영된 값은 건드리지 않는다.
  /// 회수는 완료 트랜잭션의 역연산이라 별개 결정이고 이 범위가 아니다. 완료된 자식이
  /// 계보에 섞여 함께 지워질 때도 마찬가지다.
  Future<void> deleteQuests(String uid, List<String> questIds);

  /// 진행 상태 변경 (미완료 · 완료 · 멈춤).
  ///
  /// ⚠️ 상태만 바꾼다. 보상을 주고 싶으면 [completeQuest]를 써라
  /// (중복 완료 시 재지급 금지 요건 때문에 여기서 지급하면 안 된다).
  Future<void> setStatus(String uid, String questId, QuestStatus status);

  /// 여러 퀘스트를 **한 번에 원자적으로** 보관함으로 옮긴다(`archived = true`, 2단계).
  ///
  /// "완료 = 보관함으로 이동" 구조의 쓰기 경로다. 대상 집합은 **화면**이
  /// [resolveArchiveOnComplete]로 계산하고(저장소는 규칙을 모른다 — [deleteQuests]와
  /// 같은 관심사 분리), 저장소는 "이 ID들을 원자적으로 `archived: true`로 만든다"만
  /// 책임진다.
  ///
  /// ⚠️ **[completeQuest] 지급 경로를 절대 건드리지 않는다.** 완료·보상은 이미 커밋된
  /// 뒤, 화면이 **별도 쓰기**로 이 메서드를 부른다. 지급 트랜잭션에 보관 로직을 섞으면
  /// 보관 실패가 지급을 롤백하거나 그 반대가 된다 — 계측 로그를 트랜잭션 밖에 두는
  /// 것과 같은 원칙이다.
  ///
  /// 보장 두 가지:
  /// - **원자성**: 전부 보관되거나 전부 실패한다(목표 폴더가 "절반만 옮겨진" 중간
  ///   상태가 없다). Firestore는 batch, InMemory는 스테이징 후 스트림 **1회** 방출.
  /// - **없는 ID·빈 집합은 조용히 통과한다**(멱등 — [deleteQuests]와 같은 계약).
  Future<void> archiveQuests(String uid, Set<String> questIds);

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
  /// 반환: 이번 호출에서 **실제로 지급한** 보상과 그로 인한 성장을 담은
  /// [CompleteResult]. 이미 지급된 적 있으면 `null`(상태는 done으로 맞추되
  /// 보상은 주지 않는다 = 재완료).
  ///
  /// 왜 [Reward]가 아니라 [CompleteResult]인가: 화면이 완료 **직후**에 "레벨이
  /// 올랐나 · 진화했나"를 알아야 레벨업·진화 연출을 이어 띄운다. 지급액만
  /// 돌려주면 홈으로 돌아가 바뀐 숫자를 봐야만 성장을 눈치챌 수 있어, 가장 극적인
  /// 순간이 무반응이 된다. 그 판단에 필요한 값(지급 전·후 레벨/단계)은 어차피
  /// 이 트랜잭션 안에서 이미 계산되므로, 밖으로 실어 주기만 하면 된다.
  ///
  /// 퀘스트 문서가 없으면 `NotFoundFailure`, 그 밖의 실패는 다른 메서드와
  /// 동일하게 `AppFailure`로 정규화해 던진다.
  ///
  /// 지급 시 사용자의 현재 레벨/XP를 읽어 `applyXpGain`으로 레벨업까지 반영한다
  /// (4주차 캐릭터 성장). coin은 단순 누적, xp·level은 계산값으로 저장한다 —
  /// 그래서 `AppUser.xp`는 "누적 XP"가 아니라 "현재 레벨 내 잔여 XP"다.
  Future<CompleteResult?> completeQuest(
    String uid,
    String questId, {
    String? memo,
    String? photoBase64,
  });

  /// 성취 기록 스트림 (보관함 화면). **최신순**(completedAt 내림차순)으로 흐른다.
  ///
  /// 완료·인증마다 [completeQuest]가 남긴 `users/{uid}/achievements` 문서들을
  /// 읽는다. 목록 조회는 **관대하게** 파싱한다 — [Achievement.tryParse]로 깨진
  /// 기록 하나가 보관함 전체를 죽이지 않게 그 항목만 버린다([watchQuests]와 같은 계약).
  ///
  /// ⚠️ 이미지 바이트는 여기 실리지 않는다. proof 문서는 questId당 별도라
  /// 목록에서 N번 읽으면 비싸다(3주차에 문서를 분리한 이유). 보관함은 사진 유무
  /// 플래그([Achievement.hasPhoto])만 쓰고, 실제 사진 로딩은 이 스트림 밖의 몫이다.
  Stream<List<Achievement>> watchAchievements(String uid);

  /// 인증 사진 base64를 읽는다. 없으면 `null`.
  ///
  /// **사진 base64는 목록에선 읽지 않고 상세에서만 읽는다.** proof 문서는 questId당
  /// 별도라([completeQuest]가 `users/{uid}/proofs/{questId}`에 담는다) 목록에서
  /// N번 읽으면 비싸다(3주차에 문서를 분리한 이유). 보관함 카드 상세 시트를 열 때
  /// 그 퀘스트 **하나만** lazy 조회하는 경로다 — [watchAchievements]가 사진 유무
  /// 플래그만 흘리고 바이트는 뺀 것과 짝을 이룬다.
  ///
  /// 문서가 없으면(사진을 첨부하지 않고 완료한 퀘스트) `null`을 준다 — **에러가
  /// 아니다.** 그 밖의 실패는 다른 메서드와 동일하게 `AppFailure`로 정규화해 던진다.
  Future<String?> fetchProof(String uid, String questId);

  /// 인증 사진(proof)을 **독립적으로** 갱신한다 — 보관함 기록 편집(3단계-b).
  ///
  /// [photoBase64]가 값이면 **교체**(그 base64로 덮어씀), `null`이면 **제거**(삭제).
  /// 퀘스트당 사진 1장이라 questId 문서를 그대로 덮거나 지운다.
  ///
  /// ⚠️ **[completeQuest]와 완전히 별개인 경로다.** 완료·보상 트랜잭션이 proof를
  /// 지급 시점에만 쓰는 것과 달리, 이 메서드는 이미 완료·보관된 기록의 사진만
  /// 나중에 고치기 위한 것이다. `rewardedAt`·`coin`·`xp`·난이도·성취 기록을 **전혀
  /// 건드리지 않는다** — 보상 경제 밖의 순수 부가 정보 쓰기다.
  ///
  /// ※ 정책 구분: 완료 퀘스트의 **제목·난이도** 수정은 B-5b가 막았다(재완료 보상
  /// 유효화 차단). 그건 **오늘의 퀘스트 목록**의 이야기이고, 여기는 **보관함 기록**의
  /// 메모·사진이라 보상 등급에 영향이 없어 별개로 허용된다.
  ///
  /// **크기 상한.** [photoBase64]는 [completeQuest]와 같은 [ensureProofWithinLimit]로
  /// 입구에서 검사한다. 넘으면 쓰기 전에 [AppFailure](초과 시 문서 리밋에 걸린다).
  /// 그 밖의 실패도 다른 메서드와 동일하게 `AppFailure`로 정규화해 던진다.
  Future<void> updateProof(String uid, String questId, String? photoBase64);
}

/// 완료+지급이 **실제로 일어났을 때**의 결과. 재완료·미지급은 이 객체가 아니라
/// `null`로 표현한다([QuestRepository.completeQuest]).
///
/// 왜 [Reward]만으로 부족한가: 화면이 완료 직후에 "레벨이 올랐나 · 진화했나"를
/// 알아야 레벨업·진화 연출을 이어 띄운다. 예전엔 지급액만 돌려줘서, 홈으로 돌아가
/// 바뀐 숫자를 봐야 성장을 눈치챌 수 있었다 — 가장 극적인 순간이 무반응이었다.
///
/// 여기 담긴 값은 전부 **저장소가 트랜잭션 안에서 이미 아는 것**이다(지급 전 레벨·
/// 단계 vs `applyXpGain` 이후). 화면이 다시 계산하지 않는다 — 실지급액을 난이도로
/// 재계산하지 않는 것과 같은 원칙이다.
class CompleteResult {
  const CompleteResult({
    required this.reward,
    required this.cutCoin,
    required this.fromLevel,
    required this.toLevel,
    required this.fromStage,
    required this.toStage,
  });

  /// 이번 완료로 **실제 지급된** 보상(인증 보너스 합산·하루 상한 절삭 반영).
  final Reward reward;

  /// 하루 코인 상한 때문에 깎인 코인. 0이면 절삭 없음.
  /// 절삭 전 총액과 실지급액의 차이를 **저장소가** 계산해 실어 준다(화면 재계산 금지).
  final int cutCoin;

  /// 지급 **전** 레벨.
  final int fromLevel;

  /// 지급 **후** 레벨. 한 번에 여러 칸 오를 수 있다(다단계 상승).
  final int toLevel;

  /// 지급 전 진화 단계.
  final CharacterStage fromStage;

  /// 지급 후 진화 단계.
  final CharacterStage toStage;

  /// 편의 접근자 — 실제 지급된 코인/XP. [reward]를 그대로 위임한다
  /// (지급액을 다시 계산하는 것이 아니라 같은 값을 가리킨다).
  int get coin => reward.coin;
  int get xp => reward.xp;

  /// 레벨이 올랐는가(다단계 상승 포함).
  bool get leveledUp => toLevel > fromLevel;

  /// 진화 단계가 바뀌었는가. 단계 동일성은 [CharacterStage]의 == 기준이다 —
  /// 독수리 → 이펙트 독수리처럼 이모지가 같아도 이름·임계가 다르면 진화로 친다.
  bool get evolved => fromStage != toStage;

  @override
  bool operator ==(Object other) =>
      other is CompleteResult &&
      other.reward == reward &&
      other.cutCoin == cutCoin &&
      other.fromLevel == fromLevel &&
      other.toLevel == toLevel &&
      other.fromStage == fromStage &&
      other.toStage == toStage;

  @override
  int get hashCode =>
      Object.hash(reward, cutCoin, fromLevel, toLevel, fromStage, toStage);

  @override
  String toString() =>
      'CompleteResult($reward, cut $cutCoin, Lv$fromLevel→$toLevel, '
      '${fromStage.name}→${toStage.name})';
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
