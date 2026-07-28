const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: env.nodeEnv === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

async function assertDbConnection() {
  try {
    await sequelize.authenticate();
    console.log('[db] MySQL connected');
  } catch (err) {
    console.error('[db] MySQL connection failed:', err.message);
    throw err;
  }
}

module.exports = { sequelize, assertDbConnection };

