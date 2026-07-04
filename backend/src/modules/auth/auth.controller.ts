import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional().default(false),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);
    const result = await authService.signup(email, password, name);
    res.status(201).json({ message: 'User created successfully', ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(400).json({ error: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = loginSchema.parse(req.body);
    const result = await authService.login(email, password, rememberMe);
    res.json({ message: 'Login successful', ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(401).json({ error: (error as Error).message });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.getUserById(req.userId!);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const userId = req.userId!;
    const user = await authService.updateProfile(userId, payload);
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(400).json({ error: (error as Error).message });
  }
};
