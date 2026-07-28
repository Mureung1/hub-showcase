/// 빈 화면 일러스트 자산 경로 — **화면과 테스트의 유일한 정의처.**
///
/// 왜 상수로 묶는가: 자산 경로는 컴파일러가 봐 주지 않는 문자열이고, [PixelArt]가
/// 로드 실패를 이모지로 조용히 덮는다. 화면이 경로 리터럴을 직접 들고 있으면
/// 오타 한 글자에 일러스트가 사라져도 **아무 테스트도 울지 않고** 이모지로 강등된
/// 채 배포된다(테스트가 같은 리터럴을 따로 적어 두는 것으로는 못 잡는다 —
/// 테스트는 자기 사본만 검사할 뿐 화면이 무엇을 넘기는지는 모른다).
///
/// 화면과 `pixel_asset_test`가 **이 상수를 함께 보게** 해서, 경로가 틀리면
/// 자산 존재 검증이 실패하도록 묶는다.
abstract final class EmptyArt {
  /// 홈 — 진행 중인 퀘스트가 없을 때.
  static const String home = 'assets/empty/empty_home.png';

  /// 오늘의 퀘스트 목록 — 등록된 퀘스트가 없을 때.
  static const String quest = 'assets/empty/empty_quest.png';

  /// 상점 — 카탈로그가 비었을 때(방어적).
  static const String shop = 'assets/empty/empty_shop.png';

  /// AI 분해 결과 — 나눠진 퀘스트가 하나도 없을 때(방어적).
  static const String split = 'assets/empty/empty_split.png';

  /// 보관함 — 완료한 도전이 없을 때.
  static const String storage = 'assets/empty/empty_storage.png';
}

/// 빈 화면 일러스트 전체 목록. 자산 검증 테스트가 이걸 훑는다.
///
/// `assets/empty/` 디렉터리 내용과 **정확히 일치해야 한다** — 파일만 추가하고
/// 여기 안 넣으면 검증 밖에 놓이고, 여기만 넣고 파일이 없으면 검증이 잡는다.
const List<String> kEmptyArt = [
  EmptyArt.home,
  EmptyArt.quest,
  EmptyArt.shop,
  EmptyArt.split,
  EmptyArt.storage,
];
