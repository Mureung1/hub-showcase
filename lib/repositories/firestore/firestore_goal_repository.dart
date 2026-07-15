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
