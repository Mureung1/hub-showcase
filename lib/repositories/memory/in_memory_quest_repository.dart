import 'dart:async';

import '../../core/constants/growth_rules.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../core/utils/kst_date.dart';
import '../../models/achievement.dart';
import '../../models/difficulty.dart';
import '../../models/quest.dart';
import '../../models/quest_draft.dart';
import '../../models/quest_status.dart';
import '../quest_repository.dart';
import 'in_memory_user_repository.dart';

/// Firebase 없이 도는 퀘스트 저장소.
///
/// [failWith]를 주면 모든 호출이 그 실패를 던진다 —
/// "네트워크 오류 시 오류 화면이 뜨는가" 같은 테스트가 한 줄로 끝난다:
///
/// ```dart
/// InMemoryQuestRepository(failWith: const NetworkFailure())
/// ```
class InMemoryQuestRepository implements QuestRepository {
  InMemoryQuestRepository({
    this.failWith,
    List<Quest> seed = const [],
    this.users,
    DateTime Function()? clock,
  }) : _clock = clock ?? DateTime.now {
    for (final quest in seed) {
      _quests.putIfAbsent(quest.id, () => quest);
    }
  }

  final AppFailure? failWith;

  /// 현재 시각 공급자. 하루 코인 상한의 **날짜 경계(KST)** 판정에 쓴다.
  /// 테스트가 실제 시계에 의존하지 않도록 주입 가능하다.
  final DateTime Function() _clock;

  /// 보상을 적립할 사용자 저장소. **선택적이다.**
  ///
  /// [completeQuest]는 사용자 문서(coin·xp)까지 건드려야 하는데, 이미 이 저장소를
  /// 단독으로 생성하는 코드가 여럿 있다(기존 테스트 등). 필수 인자로 만들면 전부
  /// 깨지므로 선택 주입으로 뒀다.
  ///
  /// 주입하지 않으면 **잔액 적립만 생략**하고 [Reward] 계산·반환과 중복 지급 차단은
  /// 그대로 동작한다. 보상 규칙(난이도별 금액·재지급 금지)만 검증하는 테스트는
  /// 사용자 저장소 없이도 쓸 수 있고, 잔액까지 보려면 주입하면 된다.
  ///
  /// ⚠️ **하루 코인 상한도 여기에 달려 있다.** 카운터(`dailyCoinEarned`)가 사용자
  /// 문서 필드라, 주입하지 않으면 절삭할 근거 자체가 없어 상한이 적용되지 않는다.
  /// 상한을 검증하는 테스트는 반드시 주입해야 한다.
  final InMemoryUserRepository? users;

  final Map<String, Quest> _quests = {};

  /// 완료·인증 기록. Firestore의 `users/{uid}/achievements`에 대응한다.
  ///
  /// 퀘스트와 달리 uid로 나눠 담는다 — 이 저장소를 여러 uid로 쓰는 테스트에서
  /// 기록이 섞이면 "몇 건 남았나" 검증이 무의미해지기 때문이다.
  final Map<String, List<Achievement>> _achievements = {};

  /// 인증 사진(base64). Firestore의 `users/{uid}/proofs/{questId}`에 대응한다.
  /// `uid → (questId → base64)`. 퀘스트당 1장이라 questId를 키로 덮어쓴다.
  final Map<String, Map<String, String>> _proofs = {};

  final _controller = StreamController<void>.broadcast();
  int _seq = 0;

  /// 해당 사용자의 성취 기록 (오래된 순).
  ///
  /// 테스트 전용 조회구다. `QuestRepository` 인터페이스에는 넣지 않았다 —
  /// 보관함 화면(4주차)이 실제로 요구하기 전까지 인터페이스를 넓히면
  /// Firestore 구현에도 아직 쓰이지 않는 메서드가 생긴다.
  List<Achievement> achievementsOf(String uid) =>
      List.unmodifiable(_achievements[uid] ?? const []);

  /// 해당 퀘스트의 인증 사진 base64 (없으면 null). 테스트 전용 조회구.
  /// Firestore proof 문서를 실제 네트워크 없이 검증하기 위한 것이다.
  String? proofOf(String uid, String questId) => _proofs[uid]?[questId];

  void _check() {
    if (failWith != null) throw failWith!;
  }

  List<Quest> get _sorted {
    final list = _quests.values.toList()
      ..sort((a, b) {
        final byOrder = a.order.compareTo(b.order);
        if (byOrder != 0) return byOrder;
        final at = a.createdAt;
        final bt = b.createdAt;
        if (at == null || bt == null) return 0;
        return at.compareTo(bt);
      });
    return List.unmodifiable(list);
  }

  @override
  Stream<List<Quest>> watchQuests(String uid) async* {
    _check();
    yield _sorted;
    await for (final _ in _controller.stream) {
      yield _sorted;
    }
  }

  @override
  Future<List<Quest>> fetchQuests(String uid) async {
    _check();
    return _sorted;
  }

  @override
  Future<Quest> createQuest(
    String uid, {
    required String title,
    required Difficulty difficulty,
    DateTime? deadline,
  }) async {
    _check();
    final quest = Quest(
      id: 'mem-${++_seq}',
      title: title.trim(),
      difficulty: difficulty,
      deadline: deadline,
      order: _quests.length,
      createdAt: DateTime.now(),
    );
    _quests[quest.id] = quest;
    _controller.add(null);
    return quest;
  }

  @override
  Future<List<Quest>> createQuests(
    String uid,
    List<QuestDraft> drafts, {
    String? goalId,
    String? parentQuestId,
  }) async {
    _check();
    if (drafts.isEmpty) return const [];

    // 기존 퀘스트 뒤에 이어 붙인다 (Firestore 구현과 동일한 계약).
    final offset = _quests.length;

    // 원자성: 전부 스테이징한 뒤 한 번에 반영한다.
    final staged = <String, Quest>{};
    final created = <Quest>[];

    for (var i = 0; i < drafts.length; i++) {
      final quest = drafts[i].toQuest(
        id: 'mem-${++_seq}',
        goalId: goalId,
        order: offset + i,
        // 재분해 자식이면 원본 퀘스트 ID를 심는다(Firestore 구현과 동일한 계약).
        parentQuestId: parentQuestId,
      );
      staged[quest.id] = quest;
      created.add(quest);
    }

    _quests.addAll(staged);
    _controller.add(null);
    return created;
  }

  @override
  Future<void> updateQuest(String uid, Quest quest) async {
    _check();
    if (!_quests.containsKey(quest.id)) throw const NotFoundFailure();
    _quests[quest.id] = quest;
    _controller.add(null);
  }

  @override
  Future<void> deleteQuest(String uid, String questId) async {
    _check();
    _quests.remove(questId);
    _controller.add(null);
  }

  @override
  Future<void> setStatus(String uid, String questId, QuestStatus status) async {
    _check();
    final quest = _quests[questId];
    if (quest == null) throw const NotFoundFailure();
    // withStatus가 완료 해제 시 completedAt까지 지운다.
    _quests[questId] = quest.withStatus(status);
    _controller.add(null);
  }

  /// Firestore 트랜잭션과 **같은 의미**의 완료+지급.
  ///
  /// 여기선 단일 스레드 + await 없는 상태 변경이라 별도 잠금 없이도 원자적이다.
  /// 중요한 건 판단 근거를 Firestore 구현과 똑같이 맞추는 것이다 —
  /// 지급 여부는 상태도 완료 시각도 아닌 **`rewardedAt`이 null인가**로만 결정한다.
  @override
  Future<Reward?> completeQuest(
    String uid,
    String questId, {
    String? memo,
    String? photoBase64,
  }) async {
    _check();
    // 크기 상한 방어 — Firestore 구현과 같은 단일 정의처를 쓴다.
    // 상태·잔액을 건드리기 전에 던져야 "초과인데 절반만 반영"이 없다.
    ensureProofWithinLimit(photoBase64);

    final quest = _quests[questId];
    if (quest == null) throw const NotFoundFailure();

    // 이미 지급 시각이 있으면 예전에 보상을 받은 퀘스트다(재지급 금지).
    // ⚠️ 하위호환: rewardedAt 도입 전 문서는 null이라 한 번 더 지급될 수 있다.
    final alreadyPaid = quest.isRewarded;

    // 공백만 남는 메모는 인증으로 치지 않는다(Firestore 구현과 같은 정의).
    // 인증은 메모 또는 사진 중 하나만 성립해도 된다(둘 다여도 보너스 1회).
    final verifiedMemo = normalizeMemo(memo);
    final verified = verifiedMemo != null || photoBase64 != null;

    // withStatus는 rewardedAt·memo를 항상 보존한다
    // (완료 해제해도 지급 이력과 사용자가 쓴 글은 남는다).
    final completed = quest.withStatus(QuestStatus.done);
    // copyWith의 null 병합 덕분에 memo가 null이면 기존 메모가 유지된다 —
    // Firestore 구현이 `if (verifiedMemo != null)`로 필드를 생략하는 것과 같은 의미다.
    final withMemo = completed.copyWith(memo: verifiedMemo);
    _quests[questId] = alreadyPaid
        ? withMemo
        // 최초 지급이면 지급 시각을 함께 찍는다. 이후 이 값은 절대 지워지지 않는다.
        : withMemo.copyWith(rewardedAt: DateTime.now());
    _controller.add(null);

    if (alreadyPaid) return null;

    // 적용 순서 1+2: 기본 보상 + 인증 보너스(예: 보통 5/10 → 8/13).
    // 보너스도 rewardedAt 가드 아래라 재완료로 다시 받을 수 없다.
    final gross = questReward(quest.difficulty, verified: verified);

    // 적용 순서 3: 하루 코인 상한 절삭. 카운터가 사용자 문서 필드라 users를
    // 주입하지 않으면 절삭 근거가 없어 그대로 지급한다(위 주석 참고).
    final userRepo = users;
    final current = userRepo == null ? null : await userRepo.fetchUser(uid);
    final now = _clock();
    final capped = current == null
        ? (paid: gross, dailyCoin: 0, capped: false)
        : applyDailyCoinCap(
            reward: gross,
            earnedToday: current.coinEarnedToday(now),
          );
    // 이후 기록·잔액·반환값은 전부 **실제 지급액**을 쓴다.
    // 여기서 갈라지면 다이얼로그 표시와 실지급이 어긋난다.
    final reward = capped.paid;

    // 사진은 별도 proof 저장소에 담는다(Firestore proofs 문서에 대응).
    // 지급 경로에서만 저장 — 재완료는 위에서 return. questId 키라 덮어쓴다.
    if (photoBase64 != null) {
      (_proofs[uid] ??= {})[questId] = photoBase64;
    }

    // 성취 기록 — 지급이 일어난 이 경로에서만 남긴다(재완료는 위에서 return).
    // 제목은 그 시점 값을 복사한다(퀘스트가 지워져도 기록은 남아야 한다).
    (_achievements[uid] ??= []).add(
      Achievement(
        id: 'ach-${++_seq}',
        questId: questId,
        questTitle: quest.title,
        coin: reward.coin,
        xp: reward.xp,
        memo: verifiedMemo,
        verified: verified,
        hasPhoto: photoBase64 != null,
        completedAt: DateTime.now(),
      ),
    );

    if (userRepo != null && current != null) {
      // Firestore 구현과 같은 의미: coin은 단순 누적, xp·level은 applyXpGain으로
      // 다단계 상승·진화 경계·MAX 상한을 반영한 계산값으로 갱신한다.
      // XP는 절삭되지 않으므로 상한에 걸려도 성장은 그대로 진행된다.
      final next = applyXpGain(
        level: current.level,
        xp: current.xp,
        gained: reward.xp,
      );
      userRepo.put(
        current.copyWith(
          coin: current.coin + reward.coin,
          xp: next.xp,
          level: next.level,
          // 카운터에는 **퀘스트 보상만** 쌓는다(스트릭 보너스는 넣지 않는다).
          // 날짜 키를 오늘로 덮어써야 어제 값이 만료된다.
          dailyCoinDate: kstDateKey(now),
          dailyCoinEarned: capped.dailyCoin,
        ),
      );
    }

    return reward;
  }

  void dispose() => _controller.close();
}
