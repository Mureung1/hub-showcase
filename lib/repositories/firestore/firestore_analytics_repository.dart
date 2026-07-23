import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';
import '../../models/analytics_event.dart';
import '../analytics_repository.dart';
import 'firestore_codec.dart';

/// 이벤트 로그를 `users/{uid}/events`에 쌓는다.
class FirestoreAnalyticsRepository implements AnalyticsRepository {
  FirestoreAnalyticsRepository([FirebaseFirestore? firestore])
    : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> _collection(String uid) =>
      _db.collection(FirestorePaths.events(uid));

  @override
  Future<void> log(String uid, AnalyticsEvent event) async {
    // ⚠️ 계측은 부가 기능 — **어떤 실패도 위로 던지지 않는다.**
    // 이 쓰기는 완료·등록 트랜잭션과 **분리된 별도 쓰기**라, 여기서 실패해도
    // 지급·등록은 이미 커밋됐다. 로그 유실이 기능을 되돌리면 안 되므로 삼킨다.
    try {
      await _collection(uid).add({
        ...event.toJson(),
        // at은 서버 시각으로 확정한다(로컬 시계에 기대지 않는다 — goal.createdAt 패턴).
        'at': FieldValue.serverTimestamp(),
      });
    } catch (_) {
      // best-effort. 무엇이 터지든 조용히 넘어간다.
    }
  }

  @override
  Future<List<AnalyticsEvent>> fetchEvents(String uid) {
    return guard(() async {
      // 시각 순 정렬. 단일 필드 orderBy라 복합 인덱스가 필요 없다.
      final snapshot = await _collection(uid).orderBy('at').get();
      // 목록은 관대하게 읽는다 — 깨진 이벤트 하나가 산출 전체를 죽이지 않는다.
      return snapshot.docs
          .map((doc) => AnalyticsEvent.tryParse(doc.id, decodeDoc(doc.data())))
          .whereType<AnalyticsEvent>()
          .toList();
    });
  }
}
