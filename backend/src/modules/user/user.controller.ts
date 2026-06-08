import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { hashPassword, comparePassword } from '../../utils/password';
import { AuthRequest } from '../../middlewares/auth.middleware';

const updateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, currentPassword, newPassword } = updateProfileSchema.parse(req.body);
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    let hashedPassword: string | undefined;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      const isValidPassword = await comparePassword(currentPassword, currentUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      hashedPassword = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
