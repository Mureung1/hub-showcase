import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';
import '../../core/constants/growth_rules.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../core/utils/kst_date.dart';
import '../../models/achievement.dart';
import '../../models/app_user.dart';
import '../../models/difficulty.dart';
import '../../models/quest.dart';
import '../../models/quest_draft.dart';
import '../../models/quest_status.dart';
import '../quest_repository.dart';
import 'firestore_codec.dart';

class FirestoreQuestRepository implements QuestRepository {
  FirestoreQuestRepository([
    FirebaseFirestore? firestore,
    DateTime Function()? clock,
  ]) : _db = firestore ?? FirebaseFirestore.instance,
      _clock = clock ?? DateTime.now;

  final FirebaseFirestore _db;

  /// 현재 시각 공급자. 하루 코인 상한의 날짜 경계(KST) 판정에 쓴다.
  /// `serverTimestamp`는 커밋 전까지 값을 알 수 없어 트랜잭션 안에서
  /// "오늘인가"를 비교할 수 없다(FirestoreUserRepository와 같은 이유).
  final DateTime Function() _clock;

  CollectionReference<Map<String, dynamic>> _collection(String uid) =>
      _db.collection(FirestorePaths.quests(uid));

  /// 문서 하나가 깨져 있어도 목록 전체를 죽이지 않는다.
  /// `Quest.tryParse`가 null을 주면 그 항목만 버린다.
  ///
  /// 정렬은 `order`만 서버에 맡기고 `createdAt` 2차 정렬은 여기서 한다.
  /// 이유 두 가지:
  ///   1. orderBy를 두 개 걸면 Firestore가 복합 인덱스를 요구한다(없으면 쿼리 실패).
  ///   2. `createdAt`은 serverTimestamp라 서버가 확정하기 전까지 로컬 캐시에서 null이다.
  ///      → 서버 정렬에 기대면 방금 만든 퀘스트의 순서가 흔들린다.
  /// 사용자당 퀘스트는 많아야 수십 개라 클라이언트 정렬 비용은 무시할 수 있다.
  List<Quest> _parse(QuerySnapshot<Map<String, dynamic>> snapshot) {
    final quests = snapshot.docs
        .map((doc) => Quest.tryParse(doc.id, decodeDoc(doc.data())))
        .whereType<Quest>()
        .toList();

    quests.sort((a, b) {
      final byOrder = a.order.compareTo(b.order);
      if (byOrder != 0) return byOrder;
      final at = a.createdAt;
      final bt = b.createdAt;
      // 아직 서버 타임스탬프가 안 붙은(=방금 만든) 항목은 뒤로 보낸다.
      if (at == null) return bt == null ? 0 : 1;
      if (bt == null) return -1;
      return at.compareTo(bt);
    });

    return quests;
  }

  /// 새 퀘스트가 붙을 위치. 기존 퀘스트 개수 = 다음 order.
  Future<int> _nextOrder(String uid) async {
    final count = (await _collection(uid).count().get()).count ?? 0;
    return count;
  }

  @override
  Stream<List<Quest>> watchQuests(String uid) {
    return guardStream(
      _collection(uid).orderBy('order').snapshots().map(_parse),
    );
  }

  @override
  Future<List<Quest>> fetchQuests(String uid) {
    return guard(() async {
      final snapshot = await _collection(uid).orderBy('order').get();
      return _parse(snapshot);
    });
  }

  @override
  Future<Quest> createQuest(
    String uid, {
    required String title,
    required Difficulty difficulty,
    DateTime? deadline,
  }) {
    return guard(() async {
      final ref = _collection(uid).doc();
      final quest = Quest(
        id: ref.id,
        title: title.trim(),
        difficulty: difficulty,
        deadline: deadline,
        order: await _nextOrder(uid),
        createdAt: DateTime.now(),
      );

      await ref.set({
        ...quest.toJson(),
        'createdAt': FieldValue.serverTimestamp(),
      });

      return quest;
    });
  }

  @override
  Future<List<Quest>> createQuests(
    String uid,
    List<QuestDraft> drafts, {
    String? goalId,
    String? parentQuestId,
  }) {
    return guard(() async {
      if (drafts.isEmpty) return const <Quest>[];

      // 기존 퀘스트 뒤에 이어 붙인다. 이 오프셋이 없으면 AI가 뱉은 order 0..4가
      // 기존 퀘스트의 0..2와 겹쳐 목록 순서가 뒤엉킨다.
      final offset = await _nextOrder(uid);

      final collection = _collection(uid);
      // 원자성: batch는 전부 성공하거나 전부 실패한다.
      // 부분 저장으로 인한 데이터 불일치가 없다(checklist 2주차).
      final batch = _db.batch();
      final created = <Quest>[];

      for (var i = 0; i < drafts.length; i++) {
        final ref = collection.doc();
        final quest = drafts[i].toQuest(
          id: ref.id,
          goalId: goalId,
          order: offset + i,
          // 재분해 자식이면 원본 퀘스트 ID가 문서에 심긴다(없으면 toJson이 생략).
          parentQuestId: parentQuestId,
        );
        batch.set(ref, {
          ...quest.toJson(),
          'createdAt': FieldValue.serverTimestamp(),
        });
        created.add(quest);
      }

      await batch.commit();
      return created;
    });
  }

  @override
  Future<void> updateQuest(String uid, Quest quest) {
    return guard(
      () => _db.doc(FirestorePaths.quest(uid, quest.id)).update({
        ...quest.toJson(),
        // toJson은 memo가 null이면 필드를 **생략**한다. update는 준 필드만 건드리므로,
        // 생략하면 문서에 남은 기존 memo를 지울 방법이 없다. 보관함 기록 편집(3단계-b)에서
        // 메모를 비우면(=null) 문서에서도 실제로 사라져야 하므로 명시적으로 실어 준다.
        // 값이 있을 때는 toJson과 같은 값이라 무해하다.
        'memo': quest.memo,
      }),
    );
  }

  @override
  Future<void> deleteQuest(String uid, String questId) {
    return guard(() => _db.doc(FirestorePaths.quest(uid, questId)).delete());
  }

  @override
  Future<void> deleteQuests(String uid, List<String> questIds) {
    return guard(() async {
      if (questIds.isEmpty) return;
      // 원자성: batch는 전부 지워지거나 전부 실패한다(createQuests와 대칭).
      // 부모만 지워져 자식이 고아로 남는 중간 상태가 없다.
      // Firestore의 delete는 멱등이라 없는 문서 ID가 섞여 있어도 실패하지 않는다.
      final batch = _db.batch();
      for (final id in questIds) {
        batch.delete(_db.doc(FirestorePaths.quest(uid, id)));
      }
      await batch.commit();
    });
  }

  @override
  Future<void> setStatus(String uid, String questId, QuestStatus status) {
    return guard(
      () => _db.doc(FirestorePaths.quest(uid, questId)).update({
        'status': status.name,
        // 구버전 호환 + 콘솔 가독성.
        'done': status == QuestStatus.done,
        // 완료가 아니면 완료 시각을 지운다.
        'completedAt': status == QuestStatus.done
            ? FieldValue.serverTimestamp()
            : null,
      }),
    );
  }

  @override
  Future<void> archiveQuests(String uid, Set<String> questIds) {
    return guard(() async {
      if (questIds.isEmpty) return;
      // 원자성: batch는 전부 보관되거나 전부 실패한다(deleteQuests와 대칭).
      // 목표 폴더가 "절반만 옮겨진" 중간 상태가 없다.
      // ⚠️ set(merge:true)가 아니라 update다 — 완료·보상으로 이미 존재하는 문서에
      // archived 플래그만 켜고, 다른 필드(rewardedAt·memo·status)는 손대지 않는다.
      // 없는 문서 ID가 섞이면 update가 실패하지만, 보관 대상은 언제나 방금 완료된
      // (=존재가 보장된) 퀘스트라 그 경로가 발생하지 않는다.
      final batch = _db.batch();
      for (final id in questIds) {
        batch.update(_db.doc(FirestorePaths.quest(uid, id)), {'archived': true});
      }
      await batch.commit();
    });
  }

  /// 완료 + 보상 지급을 한 트랜잭션으로 (3주차 핵심 보상 루프).
  ///
  /// 트랜잭션인 이유: 퀘스트 문서와 사용자 문서를 함께 바꾸기 때문이다.
  /// 둘이 따로 커밋되면 "완료됐는데 코인이 안 들어온" 상태가 남는다.
  ///
  /// 재지급 차단의 근거는 **읽어 온 `rewardedAt`**이다(`completedAt`이 아니다 —
  /// 그건 완료 해제 시 지워져서 파밍 구멍이 된다). 트랜잭션 안에서 읽고 판단하므로,
  /// 같은 퀘스트를 두 기기에서 동시에 완료해도 한쪽만 커밋된다
  /// (다른 쪽은 문서가 바뀐 걸 감지하고 재시도 → 이때는 rewardedAt이 이미 있어
  /// 보상을 주지 않는다).
  ///
  /// 3주차-B·사진: [memo]나 [photoBase64] 중 하나만 있어도 인증 보너스를 **합산**해
  /// 지급하고(둘 다 줘도 1회), 지급이 일어난 경우에만 `achievements` 기록과 사진
  /// proof 문서를 **같은 트랜잭션**에 넣는다.
  @override
  Future<CompleteResult?> completeQuest(
    String uid,
    String questId, {
    String? memo,
    String? photoBase64,
  }) {
    return guard(() async {
      // 크기 상한 방어 — 트랜잭션에 들어가기 전에 막는다(단일 정의처).
      // 넘으면 문서 쓰기가 어차피 실패하므로, 아예 시작하지 않는 편이 안전하다.
      ensureProofWithinLimit(photoBase64);

      final questRef = _db.doc(FirestorePaths.quest(uid, questId));
      final userRef = _db.doc(FirestorePaths.user(uid));
      // 새 기록의 ID는 트랜잭션 밖에서 미리 뽑는다. `doc()`은 서버 왕복 없이
      // 로컬에서 ID를 만들 뿐이라 read가 아니고, read-before-write 규칙과 무관하다.
      final achievementRef = _db
          .collection(FirestorePaths.achievements(uid))
          .doc();
      // 사진 proof 문서. ID = questId라 재완료해도 같은 문서를 덮어쓴다
      // (퀘스트당 사진 1장). 여기도 `.doc()`은 read가 아니다.
      final proofRef = _db.doc(FirestorePaths.proofDoc(uid, questId));

      // 공백만 남는 메모는 인증으로 치지 않는다(정의는 normalizeMemo 한 곳).
      final verifiedMemo = normalizeMemo(memo);

      return _db.runTransaction<CompleteResult?>((transaction) async {
        // ⚠️ Firestore 트랜잭션 규칙: 모든 read가 모든 write보다 앞서야 한다.
        // 그래서 quest·user 두 문서를 여기서 먼저 다 읽는다. 레벨업은 현재 XP·레벨을
        // 알아야 계산되므로 user 문서 read가 추가됐다(3주차엔 coin/xp를 increment로만
        // 쌓아 read가 필요 없었다).
        final snap = await transaction.get(questRef);
        if (!snap.exists) throw const NotFoundFailure();
        final userSnap = await transaction.get(userRef);

        final quest = Quest.fromJson(snap.id, decodeDoc(snap.data()));
        // 문서가 아직 없으면(최초 완료) 신규 사용자 기본값에서 출발한다.
        // decodeDoc으로 Timestamp를 DateTime으로 바꿔 경계에서 정규화한다
        // (FirestoreUserRepository와 동일한 파싱 계약).
        final cur = userSnap.exists
            ? AppUser.fromJson(uid, decodeDoc(userSnap.data()))
            : AppUser.initial(uid);
        // 이미 지급 시각이 찍혀 있으면 = 예전에 보상을 받은 퀘스트다.
        // ⚠️ 하위호환: rewardedAt 도입 전에 저장된 문서는 이 값이 없어(null)
        // "미지급"으로 취급된다 → 보상이 한 번 더 지급될 수 있다.
        // 데모 단계에선 수용 가능한 손실이라 마이그레이션 없이 둔다.
        final alreadyPaid = quest.isRewarded;

        // ── 여기부터 write ──
        transaction.update(questRef, {
          'status': QuestStatus.done.name,
          // 구버전 호환 + 콘솔 가독성 (setStatus와 동일한 계약).
          'done': true,
          // 완료 시각은 "언제 완료했나"라서 완료할 때마다 갱신한다.
          'completedAt': FieldValue.serverTimestamp(),
          // 지급 시각은 **최초 1회만** 찍고 이후 절대 건드리지 않는다.
          // 이 값이 재지급 차단선이다.
          if (!alreadyPaid) 'rewardedAt': FieldValue.serverTimestamp(),
          // 메모는 있을 때만 쓴다. null을 쓰면 이전에 남긴 메모를 지워 버린다
          // (건너뛰기로 다시 완료했다고 예전 글이 사라지면 안 된다 —
          //  Quest.withStatus가 memo를 보존하는 것과 같은 이유).
          'memo': ?verifiedMemo,
        });

        if (alreadyPaid) return null;

        // 저장된 난이도로 보상을 계산한다. 트랜잭션 안이라 "읽은 난이도"와
        // "지급액"이 어긋날 수 없다.
        // 인증(메모 또는 사진)이 성립하면 보너스를 합산한다 — 보너스도 rewardedAt
        // 가드 아래라 재완료로는 다시 받을 수 없다. 둘 다 있어도 보너스는 1회다.
        final verified = verifiedMemo != null || photoBase64 != null;
        // 적용 순서 1+2 (questReward가 단일 정의처다).
        final gross = questReward(quest.difficulty, verified: verified);

        // 적용 순서 3: 하루 코인 상한 절삭. 읽어 온 user 문서의 카운터를 쓰므로
        // 왕복이 늘지 않는다(레벨업 계산 때문에 이미 읽고 있었다).
        // 날짜가 바뀌었으면 coinEarnedToday가 0을 준다 — 자정에 카운터를 밀어 주는
        // 배치가 없어도 읽는 쪽에서 만료된다.
        final now = _clock();
        final capped = applyDailyCoinCap(
          reward: gross,
          earnedToday: cur.coinEarnedToday(now),
        );
        // 이후 잔액·기록·반환값은 전부 **실제 지급액**을 쓴다.
        final reward = capped.paid;

        // 레벨업 계산: 읽어 온 현재 레벨·XP에 이번 XP를 더해 다단계 상승·진화
        // 경계·MAX 상한을 한 번에 처리한다(applyXpGain 단일 정의).
        // XP는 상한 대상이 아니므로 절삭 여부와 무관하게 온전히 들어간다.
        final next = applyXpGain(
          level: cur.level,
          xp: cur.xp,
          gained: reward.xp,
        );

        // coin은 현재 잔액을 안 읽고도 되는 단순 누적이라 increment 유지.
        // xp·level은 계산값을 set한다 — user 문서를 read했으므로 같은 트랜잭션
        // 안에서 일관된 값이고, 경쟁 시 Firestore가 재읽기·재시도로 정합성을 지킨다.
        // merge:true라 사용자 문서가 아직 없어도(=최초 완료) 안전하게 생성된다.
        //
        // dailyCoinEarned는 increment가 아니라 **계산값 set**이다 — 날짜가 바뀌면
        // 0에서 다시 시작해야 하는데 increment로는 리셋을 표현할 수 없다.
        // 카운터에는 퀘스트 보상만 쌓인다(스트릭 보너스는 상한 밖이라 제외).
        transaction.set(userRef, {
          'coin': FieldValue.increment(reward.coin),
          'xp': next.xp,
          'level': next.level,
          'dailyCoinDate': kstDateKey(now),
          'dailyCoinEarned': capped.dailyCoin,
        }, SetOptions(merge: true));

        // 사진은 별도 proof 문서에 담는다(quest·achievement 문서 비대화 방지).
        // 지급 경로에서만 쓴다 — 재완료(alreadyPaid)는 위에서 이미 return 했다.
        // 같은 트랜잭션이라 "보상은 줬는데 사진은 없는" 불일치가 생기지 않는다.
        if (photoBase64 != null) {
          transaction.set(proofRef, {
            'questId': questId,
            'base64': photoBase64,
            'createdAt': FieldValue.serverTimestamp(),
          });
        }

        // 성취 기록 — **지급이 일어난 이 경로에서만** 남긴다.
        // 재완료(alreadyPaid)는 위에서 이미 return 했으므로 여기 오지 않는다.
        // → 기록 개수 = 지급 횟수. 코인 합계와 잔액이 어긋나지 않는다.
        // 제목은 그 시점 값을 복사해 둔다(퀘스트가 지워져도 보관함에 남아야 한다).
        transaction.set(achievementRef, {
          'questId': questId,
          'questTitle': quest.title,
          'coin': reward.coin,
          'xp': reward.xp,
          'verified': verified,
          // 이미지 바이트는 proof 문서에 있고, 여기엔 유무 플래그만 둔다.
          'hasPhoto': photoBase64 != null,
          'memo': ?verifiedMemo,
          'completedAt': FieldValue.serverTimestamp(),
        });

        // 지급 전·후 레벨/단계를 함께 실어 돌려준다(레벨업·진화 연출용). 전부
        // 이 트랜잭션에서 이미 읽고 계산한 값이라 추가 왕복이 없다. cutCoin은 절삭
        // 전 총액(gross)과 실지급액의 차이다 — 화면이 재계산하지 않도록 여기서 준다.
        return CompleteResult(
          reward: reward,
          cutCoin: gross.coin - reward.coin,
          fromLevel: cur.level,
          toLevel: next.level,
          fromStage: stageOf(cur.level),
          toStage: stageOf(next.level),
        );
      });
    });
  }

  @override
  Stream<List<Achievement>> watchAchievements(String uid) {
    // 최신순은 서버 orderBy에 맡긴다 — createdAt 2차 정렬이 필요한 quests와 달리
    // achievements는 completedAt 단일 키라 복합 인덱스가 필요 없다.
    // ⚠️ orderBy는 completedAt 필드가 없는 문서를 결과에서 제외한다. 지급 경로가
    // 항상 서버 시각을 찍으므로 정상 기록은 모두 포함된다.
    return guardStream(
      _db
          .collection(FirestorePaths.achievements(uid))
          .orderBy('completedAt', descending: true)
          .snapshots()
          .map(_parseAchievements),
    );
  }

  /// 문서 하나가 깨져 있어도 목록 전체를 죽이지 않는다.
  /// `Achievement.tryParse`가 null을 주면 그 항목만 버린다(_parse와 같은 계약).
  /// 정렬은 서버 orderBy가 이미 했으므로 여기서 다시 정렬하지 않는다.
  List<Achievement> _parseAchievements(
    QuerySnapshot<Map<String, dynamic>> snapshot,
  ) {
    return snapshot.docs
        .map((doc) => Achievement.tryParse(doc.id, decodeDoc(doc.data())))
        .whereType<Achievement>()
        .toList();
  }

  @override
  Future<String?> fetchProof(String uid, String questId) {
    return guard(() async {
      // completeQuest가 지급 경로에서만 `base64` 필드로 담는 문서다(proofDoc).
      final snap = await _db.doc(FirestorePaths.proofDoc(uid, questId)).get();
      // 사진 없이 완료한 퀘스트는 문서 자체가 없다 — null(에러 아님, 인터페이스 계약).
      if (!snap.exists) return null;
      // 값이 문자열이 아니면(깨진 문서) null로 떨어뜨린다 — 상세 시트가 "사진 없음"을
      // 그리면 되지, 예외로 시트를 죽이지 않는다(watchQuests 관대 파싱과 같은 원칙).
      final base64 = snap.data()?['base64'];
      return base64 is String ? base64 : null;
    });
  }

  /// 인증 사진만 독립 갱신한다(보관함 기록 편집, 3단계-b).
  ///
  /// ⚠️ **completeQuest 트랜잭션과 무관한 단건 쓰기다.** 완료·보상이 커밋된 뒤,
  /// 이미 보관된 기록의 사진만 나중에 고친다. rewardedAt·coin·xp·성취 기록을 전혀
  /// 건드리지 않는다(보관 쓰기를 지급 트랜잭션 밖에 두는 것과 같은 원칙).
  ///
  /// 값이면 proofDoc을 `set`으로 교체(재완료 덮어쓰기와 같은 문서), null이면
  /// `delete`로 제거한다. 문서 ID = questId라 퀘스트당 사진 1장을 유지한다.
  @override
  Future<void> updateProof(String uid, String questId, String? photoBase64) {
    return guard(() async {
      // 크기 상한 방어 — completeQuest와 같은 단일 정의처(교체 시 문서 리밋 방어).
      ensureProofWithinLimit(photoBase64);
      final ref = _db.doc(FirestorePaths.proofDoc(uid, questId));
      if (photoBase64 == null) {
        // 제거: 문서를 지운다. 없던 문서여도 delete는 실패하지 않는다(멱등).
        await ref.delete();
      } else {
        // 교체: completeQuest가 지급 경로에서 쓰는 것과 같은 스키마로 덮어쓴다.
        await ref.set({
          'questId': questId,
          'base64': photoBase64,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
    });
  }
}
