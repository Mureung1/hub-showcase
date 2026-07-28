package com.punchman.devpulse.normalizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.JobPosting;
import java.util.List;

/**
 * 후보 공고 목록으로 Groq(OpenAI 호환 chat completions) 요청 바디를 만든다.
 *
 * 실제 라이브 테스트에서 카탈로그 존재 여부 가드만으로는 부족하다는 게 확인됐다 — LLM이
 * "전기산업기사"/"모집 직무분야 산업기사 이상" 같은 일반 등급 표현을 "산업기사"라는 표면적
 * 글자 유사성만으로 우리 목록의 "산업안전기사"와 혼동했고, 심지어 자격증 언급이 전혀 없는
 * 공고에서도 매칭을 지어냈다. 그래서 두 겹으로 방어한다: (1) 프롬프트에 이 구체적 실패
 * 사례를 반례로 명시, (2) 응답에 원문 그대로의 근거 인용(evidence)을 강제하고
 * CertificationLlmNormalizationService가 그 인용이 실제 원문에 있는지 기계적으로 재검증한다
 * (LLM의 자기 신고만 믿지 않음).
 */
public final class GroqNormalizationPrompt {

    private GroqNormalizationPrompt() {
    }

    public static String buildRequestBody(
            ObjectMapper objectMapper,
            String model,
            List<JobPosting> candidates,
            List<Certification> certifications) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", model);
        root.putObject("response_format").put("type", "json_object");

        ArrayNode messages = root.putArray("messages");
        messages.addObject()
                .put("role", "system")
                .put("content", "너는 채용공고 텍스트에서 특정 자격증 언급 여부를 판별하는 도우미다. "
                        + "반드시 지시된 JSON 형식으로만 답하고 다른 설명은 하지 마라.");
        messages.addObject()
                .put("role", "user")
                .put("content", buildUserContent(candidates, certifications));

        return root.toString();
    }

    private static String buildUserContent(List<JobPosting> candidates, List<Certification> certifications) {
        StringBuilder sb = new StringBuilder();
        sb.append("다음은 우리가 추적하는 자격증의 정확한 명칭 목록이다:\n");
        for (Certification certification : certifications) {
            sb.append("- ").append(certification.getName()).append('\n');
        }

        sb.append("\n아래는 채용공고들의 자격요건/우대사항 원문이다. 각 공고에서 위 목록의 자격증이 ")
                .append("표현을 다르게(동의어, 축약형, 띄어쓰기 차이 등) 언급됐는지 판별하라.\n\n");
        for (int i = 0; i < candidates.size(); i++) {
            JobPosting posting = candidates.get(i);
            sb.append('[').append(i).append("] 자격요건: ")
                    .append(nullToEmpty(posting.getApplicationQualification()))
                    .append(" / 우대사항: ")
                    .append(nullToEmpty(posting.getPreferenceDetail()))
                    .append('\n');
        }

        sb.append("\n규칙:\n")
                .append("- 위 목록에 있는 정확한 명칭만 사용해서 답하라. 목록에 없는 자격증은 절대 언급하지 마라.\n")
                .append("- 확실하지 않으면 답하지 마라 — 그 공고는 matches를 빈 배열로 둬라. 텍스트에 자격증 ")
                .append("이름 자체가 없으면 아무것도 답하지 마라. 절대 지어내지 마라.\n")
                .append("- 중요(실수하기 쉬운 사례): \"산업기사\"는 등급을 뜻하는 일반 명사이지 ")
                .append("\"산업안전기사\"의 축약형이 아니다. 예를 들어 \"전기산업기사\", ")
                .append("\"모집 직무분야 산업기사 이상\" 같은 문구는 안전 분야와 무관하면 \"산업안전기사\"로 ")
                .append("판단하지 마라 — 텍스트에 안전(安全)/보건 관련 문맥이 실제로 있을 때만 매칭하라.\n")
                .append("- 자격요건 텍스트에서 발견되면 field를 \"QUALIFICATION\", 우대사항 텍스트에서 발견되면 ")
                .append("\"PREFERENCE\"로 표시하라.\n")
                .append("- matches의 각 항목에는 반드시 evidence를 포함하라 — 원문에서 근거가 된 부분을 ")
                .append("한 글자도 바꾸지 말고 그대로 인용하라(요약·재구성 금지). 그대로 인용할 수 없으면 ")
                .append("그 매칭 자체를 답하지 마라.\n\n")
                .append("다음 JSON 형식으로만 답하라(다른 텍스트 없이):\n")
                .append("{\"results\": [{\"postingIndex\": 0, \"matches\": ")
                .append("[{\"certificationName\": \"...\", \"field\": \"QUALIFICATION\", ")
                .append("\"evidence\": \"원문에서 그대로 인용한 구절\"}]}]}");

        return sb.toString();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
