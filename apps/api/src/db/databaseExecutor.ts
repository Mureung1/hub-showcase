import type { QueryResult, QueryResultRow } from "pg";

export interface DatabaseExecutor {
  query<Row extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}
