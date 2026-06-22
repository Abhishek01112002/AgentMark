import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { projectService } from './project.service';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await projectService.create(req.userId!, data);
    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
  const projects = await projectService.getAll(req.userId!);
  res.json({ projects });
};

export const getProject = async (req: AuthRequest, res: Response) => {
  const project = await projectService.getById(req.params.id, req.userId!);
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  res.json({ project });
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  const project = await projectService.delete(req.params.id, req.userId!);
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  res.json({ message: 'Project deleted successfully' });
};
