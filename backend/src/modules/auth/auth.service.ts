import prisma from '../../db';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { encryptUserSecret, decryptUserSecret } from '../../utils/crypto';
import logger from '../../utils/logger';

type UserRow = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  avatarUrl: string | null;
};

export const authService = {
  async signup(email: string, password: string, name?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: hashedPassword, name: name || '' },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = generateToken({ userId: user.id, email: user.email });
    const cleanUser = await this.getUserById(user.id);
    
    return { user: cleanUser!, token };
  },

  async login(email: string, password: string, rememberMe: boolean = false) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await comparePassword(password, user.password);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const expiresIn = rememberMe ? '30d' : '1d';
    const token = generateToken({ userId: user.id, email: user.email }, expiresIn);
    const cleanUser = await this.getUserById(user.id);
    
    return {
      user: cleanUser!,
      token,
    };
  },

  async getUserById(userId: string) {
    const rows = await prisma.$queryRaw<UserRow[]>`
      SELECT id, email, name, "createdAt", "avatarUrl"
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    return rows[0] || null;
  },

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }) {
    const updateData: { name?: string; avatarUrl?: string | null } = {};
    if (typeof data.name === 'string') updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return this.getUserById(userId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.getUserById(userId);
  },

  async getLlmSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptedLlmSettings: true },
    });

    if (!user || !user.encryptedLlmSettings) {
      return null;
    }

    try {
      const decrypted = decryptUserSecret(user.encryptedLlmSettings, userId);
      return JSON.parse(decrypted);
    } catch (err: any) {
      logger.error(`[AuthService] Failed to decrypt LLM settings for user ${userId}:`, err?.message || err);
      return null;
    }
  },

  async updateLlmSettings(userId: string, settings: any) {
    const plaintext = JSON.stringify(settings);
    const encrypted = encryptUserSecret(plaintext, userId);

    await prisma.user.update({
      where: { id: userId },
      data: { encryptedLlmSettings: encrypted },
    });

    return settings;
  },
};

