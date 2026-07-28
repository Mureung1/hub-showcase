package com.spendmate.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AgentService {

    private static final String NO_INTERVENTION = "개입 안 함";

    private final AgentClient agentClient;
    private final ContextService contextService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, AgentTool> toolsByName;

    public record ChatResponse(String message) {}
    public record JudgeResponse(boolean shouldIntervene, String message) {}

    public AgentService(AgentClient agentClient, ContextService contextService, List<AgentTool> tools) {
        this.agentClient = agentClient;
        this.contextService = contextService;
        this.toolsByName = tools.stream().collect(Collectors.toMap(AgentTool::name, t -> t));
    }

    public ChatResponse chat(Long userId, String userMessage) {
        return new ChatResponse(converse(userId, userMessage));
    }

    /**
     * 지출이 새로 등록된 직후 호출 — 이번 시점의 Context를 보고 먼저 말을 걸지 스스로 판단한다.
     * "개입 안 함"도 유효한 결과이며, 그 경우 shouldIntervene=false, message=null로 반환한다.
     */
    public JudgeResponse judgeAfterExpense(Long userId) {
        String contextJson = toJson(contextService.getContext(userId));
        String prompt = """
                방금 새로운 지출이 등록됐습니다. 지금 이 시점의 소비 Context는 다음과 같습니다:
                %s

                이 상황에서 먼저 말을 걸어야 하는지 판단하세요. 개입이 필요 없다면 다른 말 없이 정확히 "%s"라고만 답하세요.
                """.formatted(contextJson, NO_INTERVENTION);

        String result = converse(userId, prompt);
        if (result.contains(NO_INTERVENTION)) {
            return new JudgeResponse(false, null);
        }
        return new JudgeResponse(true, result);
    }

    private String converse(Long userId, String initialUserMessage) {
        List<Map<String, Object>> toolDefs = toolsByName.values().stream()
                .map(AgentTool::definition)
                .toList();

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", initialUserMessage));

        AgentClient.ClaudeResponse response = agentClient.sendMessage(AgentPromptProvider.SYSTEM_PROMPT, messages, toolDefs);

        if (!"tool_use".equals(response.stopReason())) {
            return extractText(response);
        }

        messages.add(Map.of("role", "assistant", "content", toRawContent(response.content())));

        List<Map<String, Object>> toolResults = new ArrayList<>();
        for (AgentClient.ContentBlock block : response.content()) {
            if (!"tool_use".equals(block.type())) continue;
            AgentTool tool = toolsByName.get(block.name());
            Object result = tool.execute(block.input(), userId);
            toolResults.add(Map.of(
                    "type", "tool_result",
                    "tool_use_id", block.id(),
                    "content", toJson(result)
            ));
        }
        messages.add(Map.of("role", "user", "content", toolResults));

        AgentClient.ClaudeResponse finalResponse = agentClient.sendMessage(AgentPromptProvider.SYSTEM_PROMPT, messages, toolDefs);
        return extractText(finalResponse);
    }

    private String extractText(AgentClient.ClaudeResponse response) {
        return response.content().stream()
                .filter(b -> "text".equals(b.type()))
                .map(AgentClient.ContentBlock::text)
                .findFirst()
                .orElse("");
    }

    private List<Map<String, Object>> toRawContent(List<AgentClient.ContentBlock> blocks) {
        // Claude가 기본으로 끼워 보내는 "thinking"(내부 추론) 블록 등은 되돌려줄 필요가 없어 건너뛴다.
        List<Map<String, Object>> raw = new ArrayList<>();
        for (AgentClient.ContentBlock b : blocks) {
            if ("tool_use".equals(b.type())) {
                Map<String, Object> block = new java.util.LinkedHashMap<>();
                block.put("type", "tool_use");
                block.put("id", b.id());
                block.put("name", b.name());
                block.put("input", b.input());
                raw.add(block);
            } else if ("text".equals(b.type()) && b.text() != null) {
                raw.add(Map.of("type", "text", "text", b.text()));
            }
        }
        return raw;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON 변환에 실패했습니다.", e);
        }
    }
}
