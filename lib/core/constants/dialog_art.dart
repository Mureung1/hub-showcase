/// 축하 다이얼로그 배지 도트아트 경로 — **화면과 테스트의 유일한 정의처.**
///
/// 왜 상수로 묶는가: 자산 경로는 컴파일러가 봐 주지 않는 문자열이고, `PixelArt`가
/// 로드 실패를 이모지로 조용히 덮는다. 화면이 경로 리터럴을 직접 들고 있으면
/// 오타 한 글자에 도트아트가 사라져도 **아무 테스트도 울지 않고** 이모지로 강등된
/// 채 배포된다(테스트가 같은 리터럴을 따로 적어 두는 것으로는 못 잡는다 —
/// 테스트는 자기 사본만 검사할 뿐 화면이 무엇을 넘기는지는 모른다).
///
/// 화면과 `pixel_asset_test`가 **이 상수를 함께 보게** 해서, 경로가 틀리면
/// 자산 존재 검증이 실패하도록 묶는다. (`EmptyArt`와 같은 처방이다.)
///
/// 5장 모두 256×256 · RGBA(투명 배경) · 논리 격자 64×64(한 칸 4px)이고, 팔레트는
/// 앱 토큰과 정확히 같다 — `#006E2F`(외곽선) · `#EF9900` · `#22C55E` · `#0058BE` ·
/// `#F8F9FF`. **외곽선이 `AppColors.primary`와 같은 값**이라 배지를 primary로 채우면
/// 그림의 10~15%가 배경에 먹힌다. 배지 채움을 옅은 그린 틴트로 둔 이유가 이것이고,
/// 근거는 `CelebrationBadge` 문서에 적어 뒀다.
abstract final class DialogArt {
  /// 퀘스트 완료 연출 — 트로피.
  static const String questComplete = 'assets/dialogs/dlg_quest_complete.png';

  /// 레벨 업 연출 — 상승 계단.
  static const String levelUp = 'assets/dialogs/dlg_level_up.png';

  /// 목표 완수 연출 — 월계관 메달.
  static const String goalComplete = 'assets/dialogs/dlg_goal_complete.png';

  /// 연속 출석 보너스 연출 — 불꽃.
  static const String streak = 'assets/dialogs/dlg_streak.png';

  /// 환생 연출 — 별(환생 표식).
  static const String rebirth = 'assets/dialogs/dlg_rebirth.png';
}

/// 다이얼로그 도트아트 전체 목록. 자산 검증 테스트가 이걸 훑는다.
///
/// `assets/dialogs/` 디렉터리 내용과 **정확히 일치해야 한다** — 파일만 추가하고
/// 여기 안 넣으면 검증 밖에 놓이고, 여기만 넣고 파일이 없으면 검증이 잡는다.
const List<String> kDialogArt = [
  DialogArt.questComplete,
  DialogArt.levelUp,
  DialogArt.goalComplete,
  DialogArt.streak,
  DialogArt.rebirth,
];
