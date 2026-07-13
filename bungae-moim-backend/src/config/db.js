const { Pool } = require('pg');

// DATABASE_URL 형식: postgres://user:password@host:port/dbname
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
