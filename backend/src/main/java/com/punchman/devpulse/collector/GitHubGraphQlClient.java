package com.punchman.devpulse.collector;

import com.punchman.devpulse.collector.dto.GraphQlRequest;
import com.punchman.devpulse.collector.dto.GraphQlResponse;
import feign.Headers;
import feign.RequestLine;

public interface GitHubGraphQlClient {

    @RequestLine("POST")
    @Headers("Content-Type: application/json")
    GraphQlResponse execute(GraphQlRequest request);
}
