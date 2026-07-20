import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../core/error/app_failure.dart';
import '../../models/quest_draft.dart';
import '../quest_decomposer.dart';
import 'gemini_prompt.dart';

/// 실제 **Gemini Flash(무료 등급)** REST API로 목표를 분해하는 [QuestDecomposer].
///
/// [FakeQuestDecomposer]와 같은 계약을 지킨다: 성공 시 초안 리스트, 실패 시
/// [AppFailure]만 던진다. 폴백·재분해 정책은 상위(`DecomposeNotifier`)가 그대로
/// 재사용한다 — 엔진↔정책 분리 덕에 여기선 **호출 + 파싱 + 에러 매핑**만 한다.
///
/// **왜 SDK가 아니라 REST(http)인가**: [http.Client]를 주입할 수 있어 실제 네트워크
/// 없이 [MockClient]로 테스트할 수 있고, google_generative_ai의 잦은 버전 변경과
/// 네이티브 의존(한글 경로/Firebase 제약)을 피한다.
///
/// **키 위생**: [apiKey]는 소스에 하드코딩하지 않는다. `main.dart`가
/// `String.fromEnvironment('GEMINI_API_KEY')`로 주입한다.
class RemoteQuestDecomposer implements QuestDecomposer {
  RemoteQuestDecomposer({
    required this.apiKey,
    http.Client? client,
    this.model = _defaultModel,
    this.timeout = const Duration(seconds: 20),
  }) : _client = client ?? http.Client();

  /// 무료 flash 계열. `-latest` 별칭이라 현재 flash(현재 gemini-3.5-flash)로 자동 연결된다.
  /// gemini-2.0-flash는 무료 쿼터 0, gemini-2.5-flash는 신규 사용자 deprecated라
  /// 실측으로 200을 주는 `gemini-flash-latest`로 고정한다. 나중에 교체하기 쉽게 파라미터로도 뺀다.
  static const String _defaultModel = 'gemini-flash-latest';

  static const String _host = 'generativelanguage.googleapis.com';

  final String apiKey;
  final String model;

  /// 응답이 이 시간을 넘기면 [NetworkFailure]로 끊는다. 무한 로딩 방지.
  final Duration timeout;

  final http.Client _client;

  @override
  Future<List<QuestDraft>> decompose(String goal) {
    return _generate(buildDecomposePrompt(goal));
  }

  @override
  Future<List<QuestDraft>> redecompose({
    required String goalText,
    required QuestDraft item,
  }) {
    return _generate(
      buildRedecomposePrompt(goalText: goalText, itemTitle: item.title),
    );
  }

  /// 프롬프트 → Gemini 호출 → 텍스트 추출 → 코드펜스 제거 → jsonDecode →
  /// [QuestDraft.parseList]. 모든 실패 경로를 [AppFailure]로 정규화한다.
  Future<List<QuestDraft>> _generate(String prompt) async {
    final http.Response response;
    try {
      response = await _client
          .post(
            _endpoint(),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode(_requestBody(prompt)),
          )
          .timeout(timeout);
    } on TimeoutException catch (e) {
      // 응답이 늦음 = 서버 도달/연결 계열 실패로 본다.
      throw NetworkFailure(e);
    } on SocketException catch (e) {
      // DNS 실패·연결 거부·네트워크 없음.
      throw NetworkFailure(e);
    } on http.ClientException catch (e) {
      // 연결 도중 끊김 등 http 계층 오류.
      throw NetworkFailure(e);
    }

    // 4xx/5xx: 서버에 닿았으나 처리 실패. 연결 문제(Network)가 아니라 분류되지
    // 않은 상위 실패(Unknown). 상위 폴백이 이어받는다.
    if (response.statusCode != 200) {
      throw UnknownFailure('HTTP ${response.statusCode}');
    }

    final text = _extractText(response.body);
    if (text == null) {
      // 200이지만 후보/텍스트가 없음(안전차단·빈 응답 등). 파싱할 대상 자체가 없다.
      throw const UnknownFailure('빈 응답(후보 없음)');
    }

    return _parseDrafts(text);
  }

  /// 성공 응답 본문에서 `candidates[0].content.parts[0].text`를 꺼낸다.
  /// 구조가 조금이라도 어긋나면 `null`(→ 호출부가 [UnknownFailure]로 처리).
  String? _extractText(String responseBody) {
    final Object? decoded;
    try {
      decoded = jsonDecode(responseBody);
    } on FormatException {
      return null;
    }
    if (decoded is! Map) return null;

    final candidates = decoded['candidates'];
    if (candidates is! List || candidates.isEmpty) return null;

    final first = candidates.first;
    if (first is! Map) return null;

    final content = first['content'];
    if (content is! Map) return null;

    final parts = content['parts'];
    if (parts is! List || parts.isEmpty) return null;

    final firstPart = parts.first;
    if (firstPart is! Map) return null;

    final text = firstPart['text'];
    return text is String ? text : null;
  }

  /// 모델이 낸 JSON 배열 문자열 → 초안 리스트.
  ///
  /// responseMimeType=application/json이라 보통 순수 JSON이지만, 모델이 가끔
  /// ```json … ``` 코드펜스로 감싸므로 방어적으로 벗겨낸다. jsonDecode 실패나
  /// 결과가 비면(전부 불량·빈 배열) [ParseFailure] — "성공했는데 0개"가 아니라
  /// 실패로 본다. 난이도=보상 등급이라 조용히 넘기면 안 된다.
  List<QuestDraft> _parseDrafts(String text) {
    final cleaned = _stripCodeFence(text);

    final Object? decoded;
    try {
      decoded = jsonDecode(cleaned);
    } on FormatException catch (e) {
      throw ParseFailure(e);
    }

    // parseList가 List가 아니면 []를 주므로, 그 빈 결과를 성공으로 착각하지 않도록
    // 여기서 실패로 승격한다.
    final drafts = QuestDraft.parseList(decoded);
    if (drafts.isEmpty) throw const ParseFailure('유효한 퀘스트가 없음');
    return drafts;
  }

  /// 앞뒤 ```json … ``` (또는 ``` … ```) 코드펜스가 있으면 제거한다.
  String _stripCodeFence(String raw) {
    var s = raw.trim();
    if (!s.startsWith('```')) return s;

    // 첫 줄(``` 또는 ```json)을 통째로 제거.
    final firstNewline = s.indexOf('\n');
    s = firstNewline == -1 ? '' : s.substring(firstNewline + 1);

    // 끝의 닫는 ``` 제거.
    final closing = s.lastIndexOf('```');
    if (closing != -1) s = s.substring(0, closing);

    return s.trim();
  }

  Uri _endpoint() => Uri.https(
    _host,
    '/v1beta/models/$model:generateContent',
    {'key': apiKey},
  );

  /// 구조화 출력을 강제하는 요청 바디. responseSchema로 난이도를 easy/normal/hard
  /// enum으로 못박아, 엄격 파서([QuestDraft.parseStrict])의 어휘 불일치를 원천 차단한다.
  Map<String, Object?> _requestBody(String prompt) => {
    'contents': [
      {
        'parts': [
          {'text': prompt},
        ],
      },
    ],
    'generationConfig': {
      'responseMimeType': 'application/json',
      'responseSchema': {
        'type': 'ARRAY',
        'items': {
          'type': 'OBJECT',
          'properties': {
            'title': {'type': 'STRING'},
            'difficulty': {
              'type': 'STRING',
              'enum': ['easy', 'normal', 'hard'],
            },
          },
          'required': ['title', 'difficulty'],
        },
      },
    },
  };
}
