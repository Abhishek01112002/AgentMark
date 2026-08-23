import { Request, Response, NextFunction } from 'express';
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
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
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
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    res.status(401).json({ error: (error as Error).message });
  }
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUserById(req.userId!);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    next(error);
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

const keyEntrySchema = z.object({
  value: z.string().max(256),
  label: z.string().max(100).optional(),
});

const providerStateSchema = z.object({
  keys: z.array(keyEntrySchema).max(20),
});

const llmSettingsPayloadSchema = z.object({
  settings: z.object({
    gemini: providerStateSchema.optional(),
    groq: providerStateSchema.optional(),
    openai: providerStateSchema.optional(),
    tavily: providerStateSchema.optional(),
    providerOrder: z.array(z.enum(['gemini', 'groq', 'openai', 'tavily'])).optional(),
  }),
});

export const getLlmSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await authService.getLlmSettings(req.userId!);
    res.json({ settings: settings || null });
  } catch (error) {
    next(error);
  }
};

export const updateLlmSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { settings } = llmSettingsPayloadSchema.parse(req.body);
    const updated = await authService.updateLlmSettings(req.userId!, settings);
    res.json({ message: 'LLM settings encrypted and synced successfully', settings: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
    }
    next(error);
  }
};

