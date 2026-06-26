import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be defined in production!');
  }
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing. Using insecure development fallback.');
}
const JWT_SECRET_OR_FALLBACK = JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JWTPayload, expiresIn?: string): string => {
  return jwt.sign(payload, JWT_SECRET_OR_FALLBACK, { expiresIn: (expiresIn || '1d') as any });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET_OR_FALLBACK) as JWTPayload;
};
