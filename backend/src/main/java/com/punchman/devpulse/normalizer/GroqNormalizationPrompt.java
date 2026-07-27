package com.punchman.devpulse.normalizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.JobPosting;
import java.util.List;

/**
 * 후보 공고 목록으로 Groq(OpenAI 호환 chat completions) 요청 바디를 만든다. 할루시네이션
 * 방지를 위해 우리가 아는 자격증 정확한 명칭 목록을 프롬프트에 명시하고, "목록에 없으면
 * 언급하지 말 것"/"확실하지 않으면 빈 배열로 답할 것"을 지시한다.
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
                .append("- 확실하지 않으면 답하지 마라 — 그 공고는 matches를 빈 배열로 둬라.\n")
                .append("- 자격요건 텍스트에서 발견되면 field를 \"QUALIFICATION\", 우대사항 텍스트에서 발견되면 ")
                .append("\"PREFERENCE\"로 표시하라.\n\n")
                .append("다음 JSON 형식으로만 답하라(다른 텍스트 없이):\n")
                .append("{\"results\": [{\"postingIndex\": 0, \"matches\": ")
                .append("[{\"certificationName\": \"...\", \"field\": \"QUALIFICATION\"}]}]}");

        return sb.toString();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
