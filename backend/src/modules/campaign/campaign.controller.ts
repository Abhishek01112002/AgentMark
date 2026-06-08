import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { AuthRequest } from '../../middlewares/auth.middleware';

const createCampaignSchema = z.object({
  campaignName: z.string().min(1),
  brandName: z.string().min(1),
  industry: z.string().min(1),
  goal: z.string().min(1),
  targetAudience: z.string().min(1),
  brandVoice: z.string().min(1),
});

export const createCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        ...data,
        userId: req.userId!,
        status: 'DRAFT',
      } as any,
    });

    // Simulate agent initialization
    const agents = [
      'Manager Agent',
      'Research Agent',
      'Strategy Agent',
      'Copywriter Agent',
      'Image Prompt Agent',
      'Reviewer Agent',
      'Publisher Agent',
    ];

    // Create initial agent logs
    await Promise.all(
      agents.map((agentName, index) =>
        (prisma as any).agentLog.create({
          data: {
            campaignId: campaign.id,
            agentName,
            status: index === 0 ? 'RUNNING' : 'PENDING',
            message: index === 0 ? 'Initializing campaign...' : 'Waiting in queue',
          },
        })
      )
    );

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { agentLogs: true, outputs: true } as any,
        },
      } as any,
    });

    res.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaignById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        agentLogs: {
          orderBy: { createdAt: 'asc' },
        },
        outputs: {
          orderBy: { createdAt: 'asc' },
        },
      } as any,
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await prisma.campaign.delete({
      where: { id },
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAgentLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const logs = await (prisma as any).agentLog.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get agent logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaignOutputs = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const outputs = await (prisma as any).campaignOutput.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ outputs });
  } catch (error) {
    console.error('Get campaign outputs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
