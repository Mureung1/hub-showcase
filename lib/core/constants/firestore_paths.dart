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

  static String inventory(String uid) => 'users/$uid/inventory';

  /// 공개 아이템 카탈로그 (4주차 상점). 읽기 전용.
  static const items = 'items';

  /// 인증 사진 업로드 경로 (Storage, 3주차).
  static String proof(String uid, String fileName) =>
      'users/$uid/proofs/$fileName';
}
