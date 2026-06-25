import prisma from '../../db';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';

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

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await comparePassword(password, user.password);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({ userId: user.id, email: user.email });
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
    const updateData: Record<string, unknown> = {};
    if (typeof data.name === 'string') updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updateData.name !== undefined) {
      values.push(updateData.name);
      setClauses.push(`"name" = $${values.length}`);
    }

    if (updateData.avatarUrl !== undefined) {
      values.push(updateData.avatarUrl);
      setClauses.push(`"avatarUrl" = $${values.length}`);
    }

    if (setClauses.length === 0) {
      return this.getUserById(userId);
    }

    values.push(userId);
    const rows = await prisma.$queryRawUnsafe<UserRow[]>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING id, email, name, "createdAt", "avatarUrl"`,
      ...values
    );

    return rows[0] || null;
  },
};
