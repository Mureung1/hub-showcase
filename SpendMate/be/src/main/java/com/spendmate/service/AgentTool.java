package com.spendmate.service;

import java.util.Map;

public interface AgentTool {

    String name();

    Map<String, Object> definition();

    Object execute(Map<String, Object> input);
}