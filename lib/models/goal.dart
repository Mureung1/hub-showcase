import '../core/utils/json_utils.dart';

/// 사용자가 입력한 **큰 목표.** AI 분해의 원본이다 (`goals/{goalId}`).
///
/// 왜 별도 문서로 저장하는가:
/// `docs/plan.md` 기능 A의 마지막 요구사항이 개별 항목 **재분해**다.
/// > "사용자가 특정 단계에서 멈추면, 저장된 진행 상태를 근거로
/// >  해당 지점을 더 작은 퀘스트로 재분해할 수 있다."
///
/// 재분해 프롬프트를 만들려면 **원본 목표의 맥락이 필수**다.
/// "공모전 지원하기"라는 맥락 없이 "지원서 초안 쓰기"만 AI에 던지면 엉뚱한 결과가 나온다.
/// 퀘스트의 `goalId`가 이 문서를 가리킨다.
class Goal {
  const Goal({
    required this.id,
    required this.text,
    this.createdAt,
  });

  final String id;

  /// 사용자가 입력한 원문 (예: "공모전 지원하기").
  final String text;

  final DateTime? createdAt;

  /// 필수 필드가 없으면 [FormatException]. 목표 텍스트 없는 목표는 의미가 없다.
  factory Goal.fromJson(String id, Map<String, dynamic>? json) {
    if (id.trim().isEmpty) {
      throw const FormatException('필수 필드 누락: id');
    }
    final data = json ?? const <String, dynamic>{};
    return Goal(
      id: id.trim(),
      text: requireString(data, 'text'),
      createdAt: asDateTime(data['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'text': text,
    if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
  };

  @override
  bool operator ==(Object other) =>
      other is Goal &&
      other.id == id &&
      other.text == text &&
      other.createdAt == createdAt;

  @override
  int get hashCode => Object.hash(id, text, createdAt);

  @override
  String toString() => 'Goal($id, "$text")';
}
