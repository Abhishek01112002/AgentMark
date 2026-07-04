import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JWTPayload, expiresIn?: string): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (expiresIn || '1d') as any });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};
