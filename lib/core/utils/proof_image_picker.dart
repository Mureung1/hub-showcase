import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';

import '../constants/proof_rules.dart';

/// 갤러리에서 사진 한 장을 골라 **압축된 바이트**를 돌려준다. 취소하면 `null`.
///
/// 인증 사진 압축 파이프라인의 **단일 진실원**이다. 완료 전 메모 시트
/// (`quest_memo_sheet`)와 보관함 기록 편집(`achievement_detail_sheet`)이
/// 같은 압축 규칙([kProofMaxWidth]·[kProofImageQuality])을 써야 하는데, 각자
/// 복사해 두면 언젠가 한쪽만 낡아 사진 크기가 갈린다 — proof_rules 상수를 한곳에서
/// 인용한다.
///
/// image_picker는 **이미지 타입만** 돌려주므로 "잘못된 파일 형식 거부"가 자연히
/// 충족된다(별도 검증 불필요). 네이티브 플러그인이라 위젯 테스트에서는 이 함수를
/// 직접 부르지 않고, 시트가 주입받는 `pickImage` 자리에 가짜를 넣어 대체한다.
Future<Uint8List?> pickCompressedProofImage() async {
  final file = await ImagePicker().pickImage(
    source: ImageSource.gallery,
    maxWidth: kProofMaxWidth.toDouble(),
    imageQuality: kProofImageQuality,
  );
  if (file == null) return null; // 사용자가 픽업을 취소함.
  return file.readAsBytes();
}
