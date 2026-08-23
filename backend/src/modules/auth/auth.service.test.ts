import { authService } from './auth.service';
import prisma from '../../db';

jest.mock('../../db', () => ({
  __esModule: true,
  default: {
    user: {
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('should update name and avatarUrl and return the updated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        createdAt: new Date(),
        avatarUrl: 'https://example.com/avatar.jpg'
      };

      // Mock the second call which gets the user after update
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([mockUser]);

      const result = await authService.updateProfile('user-123', {
        name: 'Updated Name',
        avatarUrl: 'https://example.com/avatar.jpg'
      });

      // Verify the prisma.user.update call
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'Updated Name',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      });

      expect(result).toEqual(mockUser);
    });

    it('should handle null avatarUrl', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        createdAt: new Date(),
        avatarUrl: null
      };

      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([mockUser]);

      const result = await authService.updateProfile('user-123', {
        avatarUrl: null
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          avatarUrl: null
        }
      });

      expect(result).toEqual(mockUser);
    });

    it('should not call prisma update if data is empty', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Old Name',
        createdAt: new Date(),
        avatarUrl: null
      };

      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([mockUser]);

      const result = await authService.updateProfile('user-123', {});

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('getLlmSettings & updateLlmSettings', () => {
    it('should encrypt settings on update and decrypt on get', async () => {
      let savedEncrypted: string | null = null;
      (prisma.user as any).findUnique = jest.fn().mockImplementation(() => {
        return Promise.resolve({
          encryptedLlmSettings: savedEncrypted
        });
      });

      (prisma.user as any).update = jest.fn().mockImplementation(({ data }: any) => {
        savedEncrypted = data.encryptedLlmSettings;
        return Promise.resolve({});
      });

      const payload = {
        gemini: { keys: [{ value: 'AIzaSyA_test_1234567890' }] },
        openai: { keys: [{ value: 'sk-test-secret-key-123456' }] },
        providerOrder: ['openai', 'gemini']
      };

      const saved = await authService.updateLlmSettings('user-abc', payload);
      expect(saved).toEqual(payload);
      expect(savedEncrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      // Ensure plaintext keys are NOT in the database payload
      expect(savedEncrypted).not.toContain('AIzaSyA_test_1234567890');
      expect(savedEncrypted).not.toContain('sk-test-secret-key-123456');

      const retrieved = await authService.getLlmSettings('user-abc');
      expect(retrieved).toEqual(payload);
    });

    it('should return null when no settings are stored', async () => {
      (prisma.user as any).findUnique = jest.fn().mockResolvedValueOnce({
        encryptedLlmSettings: null
      });

      const res = await authService.getLlmSettings('user-empty');
      expect(res).toBeNull();
    });
  });
});
