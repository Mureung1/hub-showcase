package com.placepick.workflow.live;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.placepick.infrastructure.external.http.NoRetryHttpRequestFactory;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

class WorkflowSplitLiveProbeTest {

    private static final String CONDITION_FIXTURE_HASH =
        "c3af43ae0383b7fe0780970e98447d57df070c98de2d8696400d50c3823b4dca";
    private static final String REASON_FIXTURE_HASH =
        "41f755de12d947e06896a60c4f3d034c9e22ff3ca64c96fea2b6de254ae8565c";
    private static final int MAX_RESPONSE_BYTES = 32 * 1024;
    private static final List<String> EXPECTED_STAGES = List.of(
        "conditionExtraction",
        "naverLocal",
        "naverBlog",
        "reasonGeneration"
    );

    @Test
    void verifiesFourProductShapedProviderContractsWithoutLinkingProviderData() {
        requireExplicitEnablement();
        URI gatewayEndpoint = requiredLoopbackEndpoint();
        String localToken = requiredCredential("WORKFLOW_GATEWAY_TOKEN");
        String approvedSha = requiredSha("APPROVED_SHA");

        RestClient client = RestClient.builder()
            .requestFactory(NoRetryHttpRequestFactory.create(
                Duration.ofSeconds(2),
                Duration.ofSeconds(120)
            ))
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + localToken)
            .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
            .build();

        GatewayResponse gatewayResponse = client.post()
            .uri(gatewayEndpoint)
            .contentType(MediaType.APPLICATION_JSON)
            .body(requestBody(approvedSha))
            .exchange((request, response) -> {
                MediaType contentType = response.getHeaders().getContentType();
                if (contentType == null || !MediaType.APPLICATION_JSON.isCompatibleWith(contentType)) {
                    throw new IllegalStateException("Workflow gateway response media type is invalid.");
                }
                try (InputStream input = response.getBody()) {
                    byte[] bounded = input.readNBytes(MAX_RESPONSE_BYTES + 1);
                    if (bounded.length > MAX_RESPONSE_BYTES) {
                        throw new IllegalStateException("Workflow gateway response exceeded the byte limit.");
                    }
                    return new GatewayResponse(response.getStatusCode().value(), bounded);
                }
            });

        SafeSummary summary = parseAndValidate(gatewayResponse, approvedSha);
        summary.checks().forEach(WorkflowSplitLiveProbeTest::printCheck);
        if (!summary.passed()) {
            SafeCheck failure = summary.checks().stream()
                .filter(check -> !check.success())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                    "Workflow split probe failed without a safe stage code."
                ));
            throw new IllegalStateException(
                "Workflow split probe failed at stage=" + failure.stage() +
                    " errorCode=" + failure.errorCode()
            );
        }
        System.out.println(
            "WORKFLOW_LIVE mode=split linked=false status=passed callCount=4"
        );
    }

    private static Map<String, String> requestBody(String approvedSha) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("approvedSha", approvedSha);
        body.put("conditionFixtureHash", CONDITION_FIXTURE_HASH);
        body.put("reasonFixtureHash", REASON_FIXTURE_HASH);
        return body;
    }

    private static SafeSummary parseAndValidate(
        GatewayResponse gatewayResponse,
        String approvedSha
    ) {
        JsonNode root;
        try {
            root = new ObjectMapper().readTree(gatewayResponse.body());
        } catch (IOException exception) {
            throw new IllegalStateException("Workflow gateway response JSON is invalid.", null);
        }
        if (root == null || !root.isObject()) {
            throw new IllegalStateException("Workflow gateway safe summary is invalid.");
        }
        String status = text(root, "status");
        boolean passed = "passed".equals(status);
        if (root.size() != 6 ||
            !approvedSha.equals(text(root, "approvedSha")) ||
            integer(root, "callCount") != 4 ||
            !"split".equals(text(root, "mode")) ||
            !(passed || "failed".equals(status)) ||
            (passed && (gatewayResponse.httpStatus() < 200 ||
                gatewayResponse.httpStatus() >= 300)) ||
            (!passed && gatewayResponse.httpStatus() != 502) ||
            !root.has("linked") || root.get("linked").asBoolean(true) ||
            !root.has("checks") || !root.get("checks").isArray() ||
            root.get("checks").size() != 4) {
            throw new IllegalStateException("Workflow gateway safe summary is invalid.");
        }

        var checks = new java.util.ArrayList<SafeCheck>();
        for (int index = 0; index < EXPECTED_STAGES.size(); index++) {
            JsonNode value = root.get("checks").get(index);
            String stage = EXPECTED_STAGES.get(index);
            boolean success = value != null && value.path("success").asBoolean(false);
            String errorCode = value == null ? null : text(value, "errorCode");
            if (value == null || !value.isObject() ||
                !stage.equals(text(value, "stage")) ||
                (success && (!value.path("schemaValid").asBoolean(false) ||
                    !value.path("errorCode").isNull())) ||
                (!success && (value.path("schemaValid").asBoolean(true) ||
                    errorCode == null || !errorCode.matches("[A-Z][A-Z0-9_]{2,64}"))) ||
                integer(value, "durationMs") < 0) {
                throw new IllegalStateException("Workflow gateway stage summary is invalid.");
            }
            int httpStatus = integer(value, "httpStatus");
            if (success && (httpStatus < 200 || httpStatus >= 300)) {
                throw new IllegalStateException("Workflow gateway stage HTTP status is invalid.");
            }
            if (success && stage.startsWith("naver")) {
                int itemCount = integer(value, "itemCount");
                int maximum = "naverLocal".equals(stage) ? 5 : 3;
                if (itemCount < 0 || itemCount > maximum) {
                    throw new IllegalStateException("Workflow gateway item count is invalid.");
                }
                checks.add(new SafeCheck(
                    stage,
                    true,
                    null,
                    httpStatus,
                    integer(value, "durationMs"),
                    itemCount,
                    null,
                    null
                ));
            } else if (success) {
                int inputTokens = integer(value, "inputTokens");
                int outputTokens = integer(value, "outputTokens");
                if (inputTokens < 0 || outputTokens < 0) {
                    throw new IllegalStateException("Workflow gateway token count is invalid.");
                }
                checks.add(new SafeCheck(
                    stage,
                    true,
                    null,
                    httpStatus,
                    integer(value, "durationMs"),
                    null,
                    inputTokens,
                    outputTokens
                ));
            } else {
                checks.add(new SafeCheck(
                    stage,
                    false,
                    errorCode,
                    httpStatus,
                    integer(value, "durationMs"),
                    null,
                    null,
                    null
                ));
            }
        }
        if (passed != checks.stream().allMatch(SafeCheck::success)) {
            throw new IllegalStateException("Workflow gateway overall status is inconsistent.");
        }
        return new SafeSummary(passed, List.copyOf(checks));
    }

    private static void printCheck(SafeCheck check) {
        if (!check.success()) {
            String http = check.httpStatus() < 0 ? "none" : Integer.toString(check.httpStatus());
            System.out.println(
                "WORKFLOW_LIVE stage=" + check.stage() + " http=" + http +
                    " schema=false errorCode=" + check.errorCode() +
                    " latencyMs=" + check.durationMilliseconds()
            );
            return;
        }
        StringBuilder output = new StringBuilder()
            .append("WORKFLOW_LIVE stage=").append(check.stage())
            .append(" http=2xx schema=true");
        if (check.itemCount() != null) {
            output.append(" itemCount=").append(check.itemCount());
        }
        if (check.inputTokens() != null) {
            output.append(" inputTokens=").append(check.inputTokens())
                .append(" outputTokens=").append(check.outputTokens());
        }
        output.append(" latencyMs=").append(check.durationMilliseconds());
        System.out.println(output);
    }

    private static String text(JsonNode value, String field) {
        JsonNode node = value.get(field);
        return node != null && node.isTextual() ? node.textValue() : null;
    }

    private static int integer(JsonNode value, String field) {
        JsonNode node = value.get(field);
        if (node == null || !node.canConvertToInt()) {
            return -1;
        }
        return node.intValue();
    }

    private static URI requiredLoopbackEndpoint() {
        URI base;
        try {
            base = URI.create(requiredEnvironment("WORKFLOW_GATEWAY_URL"));
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("WORKFLOW_GATEWAY_URL is invalid.", null);
        }
        String host = base.getHost();
        if (!base.isAbsolute() || !"http".equals(base.getScheme()) ||
            !("127.0.0.1".equals(host) || "localhost".equals(host)) ||
            base.getUserInfo() != null || base.getQuery() != null || base.getFragment() != null ||
            !(base.getPath().isEmpty() || "/".equals(base.getPath()))) {
            throw new IllegalStateException("Workflow gateway must use an approved loopback URL.");
        }
        return base.resolve("/v1/probes/workflow-split");
    }

    private static String requiredCredential(String name) {
        String value = requiredEnvironment(name);
        if (!value.matches("[A-Za-z0-9_-]{43,128}")) {
            throw new IllegalStateException(name + " is malformed.");
        }
        return value;
    }

    private static String requiredSha(String name) {
        String value = requiredEnvironment(name);
        if (!value.matches("[0-9a-f]{40}")) {
            throw new IllegalStateException(name + " is malformed.");
        }
        return value;
    }

    private static String requiredEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required for the workflow split probe.");
        }
        return value;
    }

    private static void requireExplicitEnablement() {
        if (!"live-contract".equals(System.getenv("PLACEPICK_EXTERNAL_MODE"))) {
            throw new IllegalStateException(
                "Workflow split probe requires PLACEPICK_EXTERNAL_MODE=live-contract."
            );
        }
        if (System.getenv("CI") != null) {
            throw new IllegalStateException("Workflow split probe is forbidden when CI is set.");
        }
        Set<String> forbiddenProviderVariables = Set.of(
            "NAVER_API_HUB_KEY_ID",
            "NAVER_API_HUB_KEY",
            "PROXY_TOKEN",
            "CHAT_PROXY_URL",
            "EMBEDDING_PROXY_URL",
            "OPENAI_MODEL",
            "OPENAI_EMBEDDING_MODEL"
        );
        if (forbiddenProviderVariables.stream().anyMatch(name -> System.getenv(name) != null)) {
            throw new IllegalStateException(
                "Raw provider configuration must not enter the Java workflow probe process."
            );
        }
    }

    private record GatewayResponse(int httpStatus, byte[] body) {
    }

    private record SafeSummary(boolean passed, List<SafeCheck> checks) {
    }

    private record SafeCheck(
        String stage,
        boolean success,
        String errorCode,
        int httpStatus,
        long durationMilliseconds,
        Integer itemCount,
        Integer inputTokens,
        Integer outputTokens
    ) {
    }
}
