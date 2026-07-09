package com.punchman.devpulse.collector;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

public final class RepositorySyncQueries {

    public static final String REPOSITORY_INCREMENTAL_SYNC = """
            query RepositoryIncrementalSync(
              $owner: String!
              $name: String!
              $commitsSince: GitTimestamp!
              $commitsAfter: String
              $issuesAfter: String
            ) {
              repository(owner: $owner, name: $name) {
                defaultBranchRef {
                  target {
                    ... on Commit {
                      history(since: $commitsSince, first: 50, after: $commitsAfter) {
                        pageInfo { hasNextPage endCursor }
                        nodes {
                          oid
                          message
                          committedDate
                          additions
                          deletions
                          author { name user { login } }
                        }
                      }
                    }
                  }
                }
                issues(first: 50, after: $issuesAfter, orderBy: { field: UPDATED_AT, direction: DESC }) {
                  pageInfo { hasNextPage endCursor }
                  nodes {
                    number
                    title
                    state
                    createdAt
                    updatedAt
                    closedAt
                    labels(first: 20) { nodes { name } }
                  }
                }
              }
              rateLimit { remaining resetAt }
            }
            """;

    private static final String EPOCH = "1970-01-01T00:00:00Z";

    private RepositorySyncQueries() {
    }

    public static Map<String, Object> variables(String owner, String name, LocalDateTime lastAnalyzedAt,
                                                 String commitsAfter, String issuesAfter) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("owner", owner);
        variables.put("name", name);
        variables.put("commitsSince", lastAnalyzedAt != null
                ? lastAnalyzedAt.atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : EPOCH);
        variables.put("commitsAfter", commitsAfter);
        variables.put("issuesAfter", issuesAfter);
        return variables;
    }
}
