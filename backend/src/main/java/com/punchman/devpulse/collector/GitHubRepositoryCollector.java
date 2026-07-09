package com.punchman.devpulse.collector;

import com.punchman.devpulse.collector.dto.GraphQlRequest;
import com.punchman.devpulse.collector.dto.GraphQlResponse;
import com.punchman.devpulse.domain.Project;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GitHubRepositoryCollector {

    private final GitHubGraphQlClient client;

    public GitHubRepositoryCollector(GitHubGraphQlClient client) {
        this.client = client;
    }

    public GraphQlResponse fetchPage(Project project, String commitsAfter, String issuesAfter) {
        Map<String, Object> variables = RepositorySyncQueries.variables(
                project.getOwner(), project.getName(), project.getLastAnalyzedAt(), commitsAfter, issuesAfter);
        GraphQlRequest request = new GraphQlRequest(RepositorySyncQueries.REPOSITORY_INCREMENTAL_SYNC, variables);
        return client.execute(request);
    }
}
