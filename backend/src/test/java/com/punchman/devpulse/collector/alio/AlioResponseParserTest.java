package com.punchman.devpulse.collector.alio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * 실제 opendata.alio.go.kr 호출로 2026-07-22에 확인한 실제 응답 원문을 고정 픽스처로 사용한다
 * (recrutInquiryAjaxList.do, ongoingYn=Y, numOfRows=1). envelope 구조가 문서화돼 있지 않아
 * 이 실제 캡처가 유일한 근거이므로, 나중에 구조가 바뀌면 이 테스트가 가장 먼저 깨져서 알려준다.
 */
class AlioResponseParserTest {

    private static final String REAL_CAPTURED_RESPONSE = """
            {
              "data" : {
                "result" : [ {
                  "pbadmsStdInstCd" : "B552071",
                  "ongoingYn" : "Y",
                  "ncsCdLst" : "R600002",
                  "recrutPblntSn" : 302988,
                  "aplyQlfcCn" : "응시자격 원문",
                  "pblntInstCd" : "C0170",
                  "instNm" : "한국교통연구원",
                  "srcUrl" : "https://www.koti.re.kr/user/bbs/empmnInfo02View.do?bbs_no=73551",
                  "pbancBgngYmd" : "20260722",
                  "recrutPbancTtl" : "2026년 직원 채용(3차) 공고",
                  "replmprYn" : "Y",
                  "prefCondCn" : "우대조건 요약",
                  "pbancEndYmd" : "20260806",
                  "prefCn" : "우대사항 상세",
                  "ncsCdNmLst" : "경영.회계.사무"
                } ],
                "resultCode" : 200,
                "totalCount" : 112054,
                "resultMsg" : "성공했습니다."
              },
              "pathParam" : "recrut"
            }
            """;

    // Spring Boot의 자동설정 ObjectMapper는 fail-on-unknown-properties를 기본 false로 두는데,
    // 실제 ALIO 응답은 이 이슈가 다루지 않는 필드를 훨씬 더 많이 포함하므로 그 설정을 여기서도 맞춘다.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Test
    void parsesRealCapturedEnvelopeIntoItems() {
        List<AlioRecrutItem> items = AlioResponseParser.parseItems(objectMapper, REAL_CAPTURED_RESPONSE);

        assertThat(items).hasSize(1);
        AlioRecrutItem item = items.get(0);
        assertThat(item.recrutPblntSn()).isEqualTo(302988L);
        assertThat(item.recrutPbancTtl()).isEqualTo("2026년 직원 채용(3차) 공고");
        assertThat(item.instNm()).isEqualTo("한국교통연구원");
        assertThat(item.ongoingYn()).isEqualTo("Y");
        assertThat(item.pbancBgngYmd()).isEqualTo("20260722");
        assertThat(item.pbancEndYmd()).isEqualTo("20260806");
        assertThat(item.ncsCdNmLst()).isEqualTo("경영.회계.사무");
    }

    @Test
    void emptyResultArrayParsesToEmptyList() {
        String emptyResponse = """
                {"data": {"result": [], "resultCode": 200, "totalCount": 0, "resultMsg": "성공했습니다."}, "pathParam": "recrut"}
                """;

        assertThat(AlioResponseParser.parseItems(objectMapper, emptyResponse)).isEmpty();
    }

    @Test
    void unexpectedEnvelopeShapeThrows() {
        String unexpected = """
                {"unexpected": "shape"}
                """;

        assertThatThrownBy(() -> AlioResponseParser.parseItems(objectMapper, unexpected))
                .isInstanceOf(IllegalStateException.class);
    }
}
