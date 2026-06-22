import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { campaignService } from './campaign.service';
import prisma from '../../db';

const createCampaignSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  industry: z.string().min(1),
  primaryGoal: z.string().min(1),
  targetAudience: z.string().min(1),
  brandVoice: z.string().min(1),
});

export const createCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId: req.userId! },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const { projectId, ...campaignData } = data;
    const campaign = await campaignService.create(projectId, campaignData);
    res.status(201).json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const getCampaigns = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required' });
  }
  
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.userId! },
  });
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const campaigns = await campaignService.getAll(projectId);
  res.json({ campaigns });
};

export const getCampaign = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required' });
  }
  
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.userId! },
  });
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const campaign = await campaignService.getById(req.params.id, projectId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  res.json({ campaign });
};

export const deleteCampaign = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required' });
  }
  
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.userId! },
  });
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const campaign = await campaignService.delete(req.params.id, projectId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  res.json({ message: 'Campaign deleted successfully' });
};
