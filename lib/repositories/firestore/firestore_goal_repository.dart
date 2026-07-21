import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';
import '../../core/error/app_failure.dart';
import '../../models/goal.dart';
import '../goal_repository.dart';
import 'firestore_codec.dart';

class FirestoreGoalRepository implements GoalRepository {
  FirestoreGoalRepository([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> _collection(String uid) =>
      _db.collection(FirestorePaths.goals(uid));

  /// 깨진 문서 하나가 목록 전체를 죽이지 않게 한다.
  ///
  /// `Goal.fromJson`은 text가 없으면 [FormatException]을 던진다 — 단건 조회에서는
  /// 그게 맞다(목표 텍스트 없는 목표는 재분해 프롬프트를 만들 수 없다). 하지만
  /// 목록에서는 그 하나 때문에 스트림이 통째로 에러가 되어 **정상 목표까지 사라진다.**
  /// 목록은 관대하게, 단건은 엄격하게 — `firestore_quest_repository._parse`와 같은 규칙이다.
  List<Goal> _parse(QuerySnapshot<Map<String, dynamic>> snapshot) {
    final goals = <Goal>[];
    for (final doc in snapshot.docs) {
      try {
        goals.add(Goal.fromJson(doc.id, decodeDoc(doc.data())));
      } on FormatException {
        continue;
      }
    }
    return goals;
  }

  @override
  Stream<List<Goal>> watchGoals(String uid) {
    // 정렬하지 않는다 — 목록 화면의 그룹 순서는 목표 생성 시각이 아니라
    // **퀘스트 정렬 순서**를 따르고(groupQuestsByGoal), 여기서는 라벨 조회용
    // 맵의 재료로만 쓰인다. orderBy를 걸면 의미 없는 인덱스 요구만 늘어난다.
    return guardStream(_collection(uid).snapshots().map(_parse));
  }

  @override
  Future<Goal> createGoal(String uid, String text) {
    return guard(() async {
      final ref = _collection(uid).doc();
      final goal = Goal(
        id: ref.id,
        text: text.trim(),
        createdAt: DateTime.now(),
      );

      // createdAt은 서버 타임스탬프로 확정한다(로컬 시계에 기대지 않는다).
      await ref.set({
        ...goal.toJson(),
        'createdAt': FieldValue.serverTimestamp(),
      });

      return goal;
    });
  }

  @override
  Future<Goal> fetchGoal(String uid, String goalId) {
    return guard(() async {
      final snapshot = await _db.doc(FirestorePaths.goal(uid, goalId)).get();
      if (!snapshot.exists) throw const NotFoundFailure();
      return Goal.fromJson(goalId, decodeDoc(snapshot.data()));
    });
  }
}
