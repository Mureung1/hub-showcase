require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

const backupDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const tablesResult = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `);

    const backup = {
      createdAt: new Date().toISOString(),
      schema: "public",
      tables: {},
    };

    for (const { table_name: tableName } of tablesResult.rows) {
      const columnsResult = await client.query(
        `
          select column_name, data_type, is_nullable, column_default
          from information_schema.columns
          where table_schema = 'public'
            and table_name = $1
          order by ordinal_position
        `,
        [tableName]
      );

      const rowsResult = await client.query(`select * from "${tableName}"`);

      backup.tables[tableName] = {
        columns: columnsResult.rows,
        rows: rowsResult.rows,
      };
    }

    const backupDirectory = path.join(process.cwd(), "backups");
    await fs.mkdir(backupDirectory, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDirectory, `supabase-public-${stamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

    console.log(backupPath);
  } finally {
    await client.end();
  }
};

backupDatabase().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
