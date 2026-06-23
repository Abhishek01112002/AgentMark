import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { campaignService } from './campaign.service';
import { aiServiceClient } from '../../utils/ai-client';
import prisma from '../../db';

const createCampaignSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  brandName: z.string().min(1).optional(),
  industry: z.string().min(1),
  primaryGoal: z.string().min(1),
  targetAudience: z.string().min(1),
  brandVoice: z.string().min(1),
});

const formatFriendlyError = (message: string) => {
  if (!message) return 'Something went wrong while generating your campaign. Please try again.';
  if (message.toLowerCase().includes('validation')) {
    return 'Campaign setup looks incomplete. Please review your inputs and try again.';
  }
  if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('key')) {
    return 'One of your API keys is missing or invalid. Please check Settings > API Keys.';
  }
  if (message.toLowerCase().includes('timeout')) {
    return 'The AI service took too long to respond. Please try again in a moment.';
  }
  return 'We could not generate this campaign right now. Please try again.';
};

export const createCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    const llmConfigHeader = req.headers['x-llm-config'];
    let llmConfig: any = undefined;
    if (typeof llmConfigHeader === 'string') {
      try {
        llmConfig = JSON.parse(llmConfigHeader);
      } catch {
        llmConfig = undefined;
      }
    }
    
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId: req.userId! },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const { projectId, ...campaignData } = data;
    const brandName = campaignData.brandName || project.name;
    const briefParts = [];
    if (!['saas', 'ecommerce', 'finance', 'healthcare', 'other'].includes(campaignData.industry.trim().toLowerCase())) {
      briefParts.push(`Custom industry: ${campaignData.industry}`);
    }
    if (!['awareness', 'lead_gen', 'sales', 'retention'].includes(campaignData.primaryGoal.trim().toLowerCase())) {
      briefParts.push(`Custom goal: ${campaignData.primaryGoal}`);
    }

    // Step 1: Create campaign record in database (status: "processing")
    const campaign = await campaignService.create(projectId, { ...campaignData, brandName });
    console.log(`📝 Campaign created in DB: ${campaign.id} | Status: ${campaign.status}`);
    
    try {
      // Step 2: Call FastAPI AI Service (BLOCKS for 2-3 minutes)
      console.log(`🚀 Triggering AI agents for campaign: ${campaign.name}`);
      
      const aiResult = await aiServiceClient.createCampaign({
        campaign_name: campaign.name,
        brand_name: campaign.brandName || brandName,
        industry: campaign.industry,
        primary_goal: campaign.primaryGoal,
        target_audience: campaign.targetAudience,
        brand_voice: campaign.brandVoice,
        brief: briefParts.length > 0 ? briefParts.join('. ') : undefined,
        llm_config: llmConfig,
      });
      
      console.log(`✅ AI workflow completed: ${aiResult.status}`);
      
      // Step 3: Update campaign with AI outputs (status: "completed")
      const updatedCampaign = await campaignService.updateWithAIOutputs(
        campaign.id,
        aiResult.campaign_id,
        aiResult.outputs,
        'completed'
      );
      
      console.log(`💾 Campaign updated with AI outputs: ${updatedCampaign.id}`);
      
      // Step 4: Return complete campaign to frontend
      return res.status(201).json({ campaign: updatedCampaign });
      
    } catch (aiError: any) {
      // AI Service failed - update campaign status to "failed"
      console.error(`❌ AI Service error: ${aiError.message}`);
      
      await campaignService.updateWithAIOutputs(
        campaign.id,
        '',
        {},
        'failed',
        aiError.message
      );
      
      return res.status(500).json({ 
        error: 'AI campaign generation failed',
        details: formatFriendlyError(aiError.message),
        campaignId: campaign.id // Return campaign ID so user can retry later
      });
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Campaign creation error:', error);
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
