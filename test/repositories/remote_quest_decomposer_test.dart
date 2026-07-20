import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:one_step/core/error/app_failure.dart';
import 'package:one_step/models/difficulty.dart';
import 'package:one_step/models/quest_draft.dart';
import 'package:one_step/repositories/decompose/remote_quest_decomposer.dart';

/// 실제 Gemini는 절대 호출하지 않는다. [MockClient]로 응답을 통째로 주입해
/// **파싱 + 에러 매핑**만 검증한다(모델 ID/REST 세부는 형식만 확인).
///
/// 이 헬퍼는 Gemini 성공 응답 봉투(`candidates[0].content.parts[0].text`)로
/// [modelText]를 감싼다 — 우리 파서가 봉투를 열고 안의 JSON 배열 문자열을 꺼낸다.
String _envelope(String modelText) {
  return jsonEncode({
    'candidates': [
      {
        'content': {
          'parts': [
            {'text': modelText},
          ],
        },
      },
    ],
  });
}

/// UTF-8 JSON 응답. Gemini 실제 응답과 같은 `charset=utf-8`을 명시해야 한글이
/// 깨지지 않는다(http.Response는 charset이 없으면 latin1로 디코드).
http.Response _jsonResponse(String body, int status) => http.Response(
  body,
  status,
  headers: const {'content-type': 'application/json; charset=utf-8'},
);

/// 항상 [body]/[status]로 응답하는 목 클라이언트.
RemoteQuestDecomposer _decomposerReturning(String body, {int status = 200}) {
  final client = MockClient((_) async => _jsonResponse(body, status));
  return RemoteQuestDecomposer(apiKey: 'test-key', client: client);
}

void main() {
  group('RemoteQuestDecomposer.decompose — 정상 파싱', () {
    test('정상 JSON 배열 → draft 리스트', () async {
      final text = jsonEncode([
        {'title': '공고 확인하기', 'difficulty': 'easy'},
        {'title': '지원서 초안 쓰기', 'difficulty': 'hard'},
      ]);
      final ai = _decomposerReturning(_envelope(text));

      final drafts = await ai.decompose('공모전 지원하기');

      expect(drafts, hasLength(2));
      expect(drafts[0].title, '공고 확인하기');
      expect(drafts[0].difficulty, Difficulty.easy);
      expect(drafts[1].difficulty, Difficulty.hard);
      // 버려진 항목이 없으니 order는 0,1로 연속.
      expect(drafts.map((d) => d.order), [0, 1]);
    });

    test('```json 코드펜스로 감싼 응답 → 벗기고 파싱', () async {
      final inner = jsonEncode([
        {'title': '첫 단계 하기', 'difficulty': 'easy'},
      ]);
      final fenced = '```json\n$inner\n```';
      final ai = _decomposerReturning(_envelope(fenced));

      final drafts = await ai.decompose('무언가');

      expect(drafts, hasLength(1));
      expect(drafts[0].title, '첫 단계 하기');
    });

    test('언어 태그 없는 ``` 코드펜스도 벗긴다', () async {
      final inner = jsonEncode([
        {'title': '자료 모으기', 'difficulty': 'normal'},
      ]);
      final ai = _decomposerReturning(_envelope('```\n$inner\n```'));

      final drafts = await ai.decompose('무언가');

      expect(drafts.single.difficulty, Difficulty.normal);
    });
  });

  group('RemoteQuestDecomposer.decompose — 오염/불량 항목 걸러내기', () {
    test('오염 난이도·필드 누락 항목은 parseList가 제외하고 정상만 살린다', () async {
      final text = jsonEncode([
        {'title': '일정 확인', 'difficulty': 'easy'},
        {'title': '오염 항목', 'difficulty': '매우어려움'}, // 오염 → 제외
        {'difficulty': 'normal'}, // title 누락 → 제외
        {'title': '복습하기', 'difficulty': 'hard'},
      ]);
      final ai = _decomposerReturning(_envelope(text));

      final drafts = await ai.decompose('시험 준비');

      expect(drafts, hasLength(2));
      expect(drafts.map((d) => d.title), ['일정 확인', '복습하기']);
      expect(drafts.map((d) => d.order), [0, 1]);
    });
  });

  group('RemoteQuestDecomposer.decompose — 실패 매핑', () {
    test('깨진 JSON → ParseFailure', () async {
      final ai = _decomposerReturning(_envelope('{ this is not json'));

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<ParseFailure>()),
      );
    });

    test('전부 불량이라 결과가 빈 배열 → ParseFailure(성공 0개로 오해 금지)', () async {
      final text = jsonEncode([
        {'title': '오염', 'difficulty': '이상한값'},
      ]);
      final ai = _decomposerReturning(_envelope(text));

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<ParseFailure>()),
      );
    });

    test('HTTP 500 → UnknownFailure', () async {
      final ai = _decomposerReturning('server error', status: 500);

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<UnknownFailure>()),
      );
    });

    test('HTTP 400 → UnknownFailure', () async {
      final ai = _decomposerReturning('bad request', status: 400);

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<UnknownFailure>()),
      );
    });

    test('200이지만 후보 없음 → UnknownFailure', () async {
      final ai = _decomposerReturning(jsonEncode({'candidates': []}));

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<UnknownFailure>()),
      );
    });

    test('SocketException → NetworkFailure', () async {
      final client = MockClient(
        (_) async => throw const SocketException('no network'),
      );
      final ai = RemoteQuestDecomposer(apiKey: 'k', client: client);

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('http.ClientException → NetworkFailure', () async {
      final client = MockClient(
        (_) async => throw http.ClientException('connection closed'),
      );
      final ai = RemoteQuestDecomposer(apiKey: 'k', client: client);

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<NetworkFailure>()),
      );
    });

    test('응답 지연이 timeout을 넘으면 → NetworkFailure', () async {
      final client = MockClient((_) async {
        await Future<void>.delayed(const Duration(milliseconds: 200));
        return _jsonResponse(_envelope('[]'), 200);
      });
      final ai = RemoteQuestDecomposer(
        apiKey: 'k',
        client: client,
        timeout: const Duration(milliseconds: 20),
      );

      await expectLater(
        ai.decompose('x'),
        throwsA(isA<NetworkFailure>()),
      );
    });
  });

  group('RemoteQuestDecomposer.redecompose', () {
    final item = const QuestDraft(
      localId: 'd0',
      title: '지원서 쓰기',
      difficulty: Difficulty.hard,
    );

    test('정상 JSON → 하위 draft 리스트', () async {
      final text = jsonEncode([
        {'title': '개요 잡기', 'difficulty': 'easy'},
        {'title': '한 단락 쓰기', 'difficulty': 'normal'},
      ]);
      final ai = _decomposerReturning(_envelope(text));

      final drafts = await ai.redecompose(goalText: '공모전', item: item);

      expect(drafts, hasLength(2));
      expect(drafts[0].title, '개요 잡기');
    });

    test('깨진 JSON → ParseFailure', () async {
      final ai = _decomposerReturning(_envelope('not-json'));

      await expectLater(
        ai.redecompose(goalText: '공모전', item: item),
        throwsA(isA<ParseFailure>()),
      );
    });
  });

  group('요청 형식', () {
    test('구조화 출력(responseSchema)·프롬프트를 담아 올바른 엔드포인트로 POST한다', () async {
      late http.Request captured;
      final client = MockClient((req) async {
        captured = req;
        final text = jsonEncode([
          {'title': 't', 'difficulty': 'easy'},
        ]);
        return _jsonResponse(_envelope(text), 200);
      });
      final ai = RemoteQuestDecomposer(
        apiKey: 'secret',
        client: client,
        model: 'gemini-flash-latest',
      );

      await ai.decompose('교내 공모전');

      // 엔드포인트·키·모델.
      expect(captured.method, 'POST');
      expect(captured.url.host, 'generativelanguage.googleapis.com');
      expect(captured.url.path, contains('gemini-flash-latest:generateContent'));
      expect(captured.url.queryParameters['key'], 'secret');

      // 바디: 구조화 출력 스키마 + 목표가 프롬프트에 삽입됐는지.
      final body = jsonDecode(captured.body) as Map<String, Object?>;
      final genConfig = body['generationConfig'] as Map<String, Object?>;
      expect(genConfig['responseMimeType'], 'application/json');
      expect(genConfig['responseSchema'], isNotNull);
      expect(captured.body, contains('교내 공모전'));
    });
  });
}
