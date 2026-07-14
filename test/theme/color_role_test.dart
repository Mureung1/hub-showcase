import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// checklist 1주차 — "노랑이 코인·보상 이외의 UI 요소에 사용되지 않는다(코드 검색으로 확인 가능)".
///
/// 이 테스트가 그 "코드 검색"이다. 사람이 눈으로 grep 하는 대신 CI가 강제한다.
/// 규칙을 깨는 순간(예: 버튼을 노랑으로 칠하는 순간) 빨간불이 뜬다.
void main() {
  final libDir = Directory('lib');

  /// `reward_colors.dart`를 import 할 수 있는 파일 — 즉 **노랑을 쓸 수 있는 파일**.
  ///
  /// 여기 없는 파일이 노랑에 접근하려 하면 테스트가 실패한다.
  /// 새 파일을 추가하려면 "이게 정말 코인·보상인가?"를 먼저 답해야 한다.
  const rewardAllowlist = <String>{
    // 노랑의 유일한 정의처.
    'lib/core/theme/reward_colors.dart',
    // ThemeData에 RewardTheme 확장을 꽂는 배선부.
    'lib/core/theme/app_theme.dart',
    // 코인 표시.
    'lib/core/widgets/coin_pill.dart',
    // 보상(코인·XP) 표시.
    'lib/core/widgets/reward_chip.dart',
    // ★예외: 난이도 = 보상 등급. 보통(Normal) 난이도 pill이 노랑 틴트를 쓴다.
    //   tokens.md의 난이도 매핑을 그대로 구현하기 위한 의도적 허용이며,
    //   사용자와 합의된 예외다(2026-07-14).
    'lib/core/widgets/difficulty_pill.dart',
    // 홈 캐릭터 카드의 코인 배너.
    'lib/features/home/widgets/character_card.dart',
  };

  List<File> dartFiles() {
    if (!libDir.existsSync()) return [];
    return libDir
        .listSync(recursive: true)
        .whereType<File>()
        .where((f) => f.path.endsWith('.dart'))
        .toList();
  }

  /// Windows 경로 구분자를 정규화해 allowlist와 비교 가능하게 만든다.
  String normalize(String path) => path.replaceAll(r'\', '/');

  /// 주석을 제거한 코드만 검사한다.
  /// 규칙의 대상은 "노랑을 쓰는 코드"이지 "노랑을 설명하는 문서"가 아니다.
  /// (예: app_colors.dart의 `[RewardColors]를 보라`는 위반이 아니다)
  ///
  /// ⚠️ 단순히 `//` 뒤를 지우면 **문자열 안의 `//`도 주석으로 오인**한다.
  /// 예: `const url = 'https://x'; final c = RewardColors.coin;`
  /// → `https://` 뒤가 통째로 지워져 위반이 은폐된다.
  /// 그래서 문자열 리터럴을 먼저 자리표시자로 치환한 뒤 주석을 지운다.
  /// 정규식으로는 못 한다. 문자열을 통째로 지우면 `import '.../reward_colors.dart'`가
  /// 안 보이게 되고, 문자열을 안 지우면 `'https://…'` 안의 `//`가 주석으로 오인된다.
  /// 문자열 안인지 밖인지를 추적하며 한 글자씩 훑는다.
  String stripComments(String source) {
    final out = StringBuffer();
    String? openQuote;
    var i = 0;

    while (i < source.length) {
      final c = source[i];
      final next = i + 1 < source.length ? source[i + 1] : '';

      // 문자열 안: 그대로 살리고, 닫는 따옴표만 찾는다.
      if (openQuote != null) {
        out.write(c);
        if (c == r'\' && next.isNotEmpty) {
          out.write(next);
          i += 2;
          continue;
        }
        if (c == openQuote) openQuote = null;
        i++;
        continue;
      }

      // 문자열 시작
      if (c == "'" || c == '"') {
        openQuote = c;
        out.write(c);
        i++;
        continue;
      }

      // 한 줄 주석 — 줄 끝까지 버린다.
      if (c == '/' && next == '/') {
        while (i < source.length && source[i] != '\n') {
          i++;
        }
        continue;
      }

      // 블록 주석 — 닫힐 때까지 버린다.
      if (c == '/' && next == '*') {
        i += 2;
        while (i + 1 < source.length &&
            !(source[i] == '*' && source[i + 1] == '/')) {
          i++;
        }
        i += 2;
        continue;
      }

      out.write(c);
      i++;
    }

    return out.toString();
  }

  group('감시 장치 자체가 동작하는가 (메타 테스트)', () {
    // 규칙 테스트가 아무것도 못 잡으면서 조용히 통과하면 없느니만 못하다.
    // stripComments가 검사 대상을 파괴하지 않는지 직접 확인한다.

    test('주석은 지우되 문자열 안의 //는 살린다', () {
      const source = '''
// RewardColors 를 보라 (주석이므로 위반 아님)
import '../theme/reward_colors.dart';
const docs = 'https://example.com';
final c = RewardColors.coin;
''';
      final stripped = stripComments(source);

      // 주석 속 언급은 사라진다
      expect(stripped, isNot(contains('주석이므로')));
      // import 경로는 살아남는다 — allowlist 검사가 이걸 본다
      expect(stripped, contains('reward_colors.dart'));
      // 문자열 안의 // 때문에 뒷줄이 날아가지 않는다
      expect(stripped, contains('RewardColors.coin'));
    });

    test('블록 주석도 지운다', () {
      final stripped = stripComments('/* RewardTheme */ final x = 1;');

      expect(stripped, isNot(contains('RewardTheme')));
      expect(stripped, contains('final x = 1;'));
    });
  });

  test('노랑(RewardColors/RewardTheme)은 allowlist 파일에서만 쓰인다', () {
    final violations = <String>[];

    for (final file in dartFiles()) {
      final path = normalize(file.path);
      if (rewardAllowlist.contains(path)) continue;

      final source = stripComments(file.readAsStringSync());
      final usesReward =
          source.contains('reward_colors.dart') ||
          source.contains('RewardColors') ||
          source.contains('RewardTheme');

      if (usesReward) violations.add(path);
    }

    expect(
      violations,
      isEmpty,
      reason:
          '노랑은 코인·보상 전용이다. 아래 파일이 허용 목록 밖에서 노랑에 접근한다:\n'
          '${violations.join('\n')}\n\n'
          '정말 코인·보상 요소라면 이 테스트의 rewardAllowlist에 사유와 함께 추가하라.',
    );
  });

  test('노랑 HEX 리터럴은 reward_colors.dart 안에만 존재한다', () {
    // RewardColors가 정의하는 값들. 다른 파일에 이 숫자가 나타나면 우회 시도다.
    final yellowHexes = <String>[
      '0xFFEF9900', // coin
      '0xFFFFB95F', // coinGlow
      '0xFF5C3800', // onCoin
      '0xFF855300', // onCoinTint
    ];
    const definitionFile = 'lib/core/theme/reward_colors.dart';

    final violations = <String>[];

    for (final file in dartFiles()) {
      final path = normalize(file.path);
      if (path == definitionFile) continue;

      final source = stripComments(file.readAsStringSync()).toUpperCase();
      for (final hex in yellowHexes) {
        if (source.contains(hex.toUpperCase())) {
          violations.add('$path → $hex');
        }
      }
    }

    expect(
      violations,
      isEmpty,
      reason:
          '노랑 HEX를 직접 쓰지 말고 RewardTheme을 통해 접근하라:\n'
          '${violations.join('\n')}',
    );
  });

  test('Material의 기성 노랑(Colors.amber 등)으로 규칙을 우회할 수 없다', () {
    // 위 두 테스트는 RewardColors 식별자와 노랑 HEX만 본다.
    // `Colors.amber`나 `Color.fromARGB(255, 239, 153, 0)`은 그 그물을 빠져나간다.
    // 노랑으로 보이는 모든 경로를 막는다.
    final forbidden = [
      RegExp(r'Colors\.(amber|yellow|orange|lime)\b'),
      RegExp(r'Color\.fromARGB'),
      RegExp(r'Color\.fromRGBO'),
      RegExp(r'HSLColor\.'),
    ];
    const themeDir = 'lib/core/theme/';

    final violations = <String>[];

    for (final file in dartFiles()) {
      final path = normalize(file.path);
      if (path.startsWith(themeDir)) continue;

      final source = stripComments(file.readAsStringSync());
      for (final pattern in forbidden) {
        final match = pattern.firstMatch(source);
        if (match != null) violations.add('$path → ${match.group(0)}');
      }
    }

    expect(
      violations,
      isEmpty,
      reason:
          '색은 AppColors / Theme.of(context) / RewardTheme으로만 가져와라.\n'
          'Material 기성 색이나 fromARGB로 노랑을 만들면 색 역할 규칙이 무너진다:\n'
          '${violations.join('\n')}',
    );
  });

  test('원시 Color(0x…) 리터럴은 core/theme 안에만 존재한다', () {
    // 화면 위젯이 HEX를 하드코딩하면 디자인 토큰이 무너진다(SKILL.md "금지" 항목).
    final colorLiteral = RegExp(r'Color\(0x');
    const themeDir = 'lib/core/theme/';

    final violations = <String>[];

    for (final file in dartFiles()) {
      final path = normalize(file.path);
      if (path.startsWith(themeDir)) continue;

      final source = stripComments(file.readAsStringSync());
      if (colorLiteral.hasMatch(source)) violations.add(path);
    }

    expect(
      violations,
      isEmpty,
      reason:
          'HEX 색상을 하드코딩하지 말고 AppColors / Theme.of(context)를 참조하라:\n'
          '${violations.join('\n')}',
    );
  });
}
