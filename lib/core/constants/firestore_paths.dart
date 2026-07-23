/// Firestore 컬렉션 경로의 **단일 정본.** 문자열을 코드 곳곳에 흩뿌리지 않는다.
///
/// 사용자 하위 컬렉션 구조를 쓰는 이유:
/// 루트 레벨 `quests` 컬렉션이면 문서마다 `ownerId` 필드 + 복합 인덱스 + 소유권
/// 보안 규칙이 필요하다. 하위 컬렉션은 규칙이 한 줄로 끝나고 쿼리도 공짜다.
///
/// 문서화된 스키마: `docs/firestore-schema.md`
abstract final class FirestorePaths {
  static const users = 'users';

  static String user(String uid) => 'users/$uid';

  /// 사용자가 입력한 큰 목표 (2주차 AI 분해의 원본).
  static String goals(String uid) => 'users/$uid/goals';

  static String goal(String uid, String goalId) => 'users/$uid/goals/$goalId';

  static String quests(String uid) => 'users/$uid/quests';

  static String quest(String uid, String questId) =>
      'users/$uid/quests/$questId';

  static String achievements(String uid) => 'users/$uid/achievements';

  /// 성공 지표 이벤트 로그 (4주차). 데이터만 쌓고 지표 화면은 만들지 않는다 —
  /// 산출은 `core/analytics/metrics.dart` 순수 함수가 담당한다.
  static String events(String uid) => 'users/$uid/events';

  static String inventory(String uid) => 'users/$uid/inventory';

  /// 공개 아이템 카탈로그 (4주차 상점). 읽기 전용.
  static const items = 'items';

  /// 인증 사진 **문서** 경로 (Firestore, 3주차). 압축 썸네일을 base64로 담는다.
  ///
  /// `questId`를 문서 ID로 써서 **퀘스트당 사진 1장**이 되게 한다 — 재완료해도
  /// 같은 문서를 자연스럽게 덮어쓴다. 이미지를 quest·achievement 문서가 아니라
  /// 여기 따로 두는 이유: 목록 조회 때마다 이미지 바이트가 딸려오면 읽기 비용이
  /// 폭증한다. 별도 문서로 떼어 두면 사진이 필요한 화면에서만 읽는다.
  static String proofDoc(String uid, String questId) =>
      'users/$uid/proofs/$questId';

  /// ⚠️ Storage(Blaze) 업로드용 경로. **현재 미사용.**
  /// 3주차 사진 인증은 Storage를 쓰지 않고 [proofDoc]의 Firestore 문서에 base64로
  /// 저장한다. Storage(유료 플랜)를 도입하는 날을 위해 경로만 남겨 둔다.
  static String proof(String uid, String fileName) =>
      'users/$uid/proofs/$fileName';
}
