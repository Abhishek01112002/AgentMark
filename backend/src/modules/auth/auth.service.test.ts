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
});
