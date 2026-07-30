import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authMiddleware, authenticateToken, AuthRequest } from './auth.middleware';
import { generateToken } from '../utils/jwt';
import prisma from '../db';

jest.mock('../db', () => ({
  apiKey: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
}));

describe('Authentication Middleware (auth.middleware)', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('JWT Authentication Path', () => {
    it('should authenticate valid JWT token in Authorization Bearer header', async () => {
      const token = generateToken({ userId: 'user-uuid-123', email: 'user@example.com' });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.userId).toBe('user-uuid-123');
      expect(mockRequest.authMethod).toBe('jwt');
    });

    it('should return 401 when Authorization header is missing', async () => {
      await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'No token provided' })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid or expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.jwt.token',
      };

      await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid or revoked token / API key' })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Developer API Key Authentication Path', () => {
    it('should authenticate valid Developer API Key in Authorization Bearer header', async () => {
      const rawApiKey = 'am_dev_key_abc123xyz456';
      const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

      mockRequest.headers = {
        authorization: `Bearer ${rawApiKey}`,
      };

      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: 'key-db-id',
        userId: 'user-mcp-456',
        isActive: true,
      });
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

      await authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { keyHash: keyHash },
        select: { id: true, userId: true, isActive: true },
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.userId).toBe('user-mcp-456');
      expect(mockRequest.authMethod).toBe('api_key');
    });

    it('should helper authenticateToken parse token directly', async () => {
      const token = generateToken({ userId: 'user-direct-789', email: 'direct@example.com' });
      const authUser = await authenticateToken(token);

      expect(authUser).toEqual(
        expect.objectContaining({
          userId: 'user-direct-789',
          authMethod: 'jwt',
        })
      );
    });
  });
});
