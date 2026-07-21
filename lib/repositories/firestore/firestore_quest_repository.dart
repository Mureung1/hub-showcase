import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';
import '../../core/constants/reward_rules.dart';
import '../../core/error/app_failure.dart';
import '../../models/difficulty.dart';
import '../../models/quest.dart';
import '../../models/quest_draft.dart';
import '../../models/quest_status.dart';
import '../quest_repository.dart';
import 'firestore_codec.dart';

class FirestoreQuestRepository implements QuestRepository {
  FirestoreQuestRepository([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

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
      () => _db.doc(FirestorePaths.quest(uid, quest.id)).update(quest.toJson()),
    );
  }

  @override
  Future<void> deleteQuest(String uid, String questId) {
    return guard(() => _db.doc(FirestorePaths.quest(uid, questId)).delete());
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
  Future<Reward?> completeQuest(
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

      return _db.runTransaction<Reward?>((transaction) async {
        // ⚠️ Firestore 트랜잭션 규칙: 모든 read가 모든 write보다 앞서야 한다.
        final snap = await transaction.get(questRef);
        if (!snap.exists) throw const NotFoundFailure();

        final quest = Quest.fromJson(snap.id, decodeDoc(snap.data()));
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
        final reward =
            rewardFor(quest.difficulty) +
            (verified ? kVerificationBonus : Reward.zero);

        // increment는 현재 잔액을 읽지 않고도 원자적으로 누적된다.
        // merge:true라 사용자 문서가 아직 없어도(=최초 완료) 안전하게 생성된다.
        transaction.set(userRef, {
          'coin': FieldValue.increment(reward.coin),
          'xp': FieldValue.increment(reward.xp),
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

        return reward;
      });
    });
  }
}
