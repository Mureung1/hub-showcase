import type { Pool, PoolClient } from "pg";
import type { DatabaseExecutor } from "./databaseExecutor.js";

export interface TransactionManager {
  run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>): Promise<Result>;
}

export class PgTransactionManager implements TransactionManager {
  constructor(private readonly pool: Pick<Pool, "connect">) {}

  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>): Promise<Result> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
