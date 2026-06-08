import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5001,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  jwtExpiresIn: '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
