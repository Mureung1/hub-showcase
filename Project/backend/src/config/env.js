const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 4000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toNumber(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'thingdong',
    user: process.env.DB_USER || 'thingdong',
    password: process.env.DB_PASSWORD || 'thingdong_pw',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  },
  enableDevLogin: process.env.ENABLE_DEV_LOGIN === 'true',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (env.nodeEnv === 'production' && env.jwt.accessSecret === 'dev-access-secret-change-me') {
  throw new Error('JWT_ACCESS_SECRET must be set to a secure value in production.');
}

module.exports = env;
