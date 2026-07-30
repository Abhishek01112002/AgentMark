import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  createCampaign,
  getAllCampaigns,
  getCampaign,
  approveCampaign,
} from './campaign.controller';
import { campaignService } from './campaign.service';
import prisma from '../../db';

jest.mock('../../db', () => ({
  campaign: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
  },
  userMemory: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  },
  notification: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('./campaign.service', () => ({
  campaignService: {
    create: jest.fn(),
    updateWithAIOutputs: jest.fn(),
  },
}));

jest.mock('../../utils/ai-client', () => ({
  aiServiceClient: {
    createCampaign: jest.fn().mockResolvedValue({ status: 'processing' }),
  },
}));

describe('Campaign Controller Unit & Contract Tests', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      userId: 'user-uuid-100',
      headers: {
        'x-request-id': 'req-test-123',
        'x-llm-config': JSON.stringify({ gemini_api_key: 'AIzaSyTestKey123' }),
      },
      body: {},
      params: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('createCampaign Handler', () => {
    it('should create campaign when valid request payload is provided', async () => {
      const validProjectId = '11111111-2222-3333-4444-555555555555';
      mockRequest.body = {
        name: 'Launch Campaign 2026',
        brandName: 'AgentMark',
        projectId: validProjectId,
        industry: 'saas',
        primaryGoal: 'lead_gen',
        targetAudience: 'CTOs',
        brandVoice: 'Authoritative',
      };

      const mockProject = { id: validProjectId, userId: 'user-uuid-100', name: 'Default Project' };
      const mockCreatedCampaign = {
        id: 'camp-uuid-123',
        name: 'Launch Campaign 2026',
        brandName: 'AgentMark',
        status: 'processing',
        projectId: validProjectId,
      };

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (campaignService.create as jest.Mock).mockResolvedValue(mockCreatedCampaign);

      await createCampaign(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(campaignService.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign: mockCreatedCampaign,
          requestId: 'req-test-123',
        })
      );
    });

    it('should return 400 Validation Error when required fields are missing', async () => {
      mockRequest.body = {
        name: 'Incomplete Campaign',
      };

      await createCampaign(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.anything(),
        })
      );
    });
  });

  describe('getAllCampaigns Handler (Soft-Delete Filter)', () => {
    it('should exclude soft-deleted campaigns using status: { not: "deleted" }', async () => {
      (prisma.campaign.findMany as jest.Mock).mockResolvedValue([
        { id: 'camp-1', status: 'completed' },
      ]);

      await getAllCampaigns(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project: { userId: 'user-uuid-100' },
            status: { not: 'deleted' },
          }),
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          campaigns: expect.any(Array),
        })
      );
    });
  });

  describe('getCampaign Handler (Tenant Isolation & Exact UUID)', () => {
    it('should query DB by exact campaignId and userId, excluding deleted campaigns', async () => {
      mockRequest.params = { id: 'camp-uuid-123' };

      (prisma.campaign.findFirst as jest.Mock).mockResolvedValue({
        id: 'camp-uuid-123',
        name: 'Target Campaign',
        status: 'completed',
        project: { userId: 'user-uuid-100' },
      });

      await getCampaign(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(prisma.campaign.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'camp-uuid-123',
          project: { userId: 'user-uuid-100' },
          status: { not: 'deleted' },
        },
        include: { project: { select: { userId: true } } },
      });
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign: expect.objectContaining({ id: 'camp-uuid-123' }),
        })
      );
    });

    it('should return 404 Not Found if campaign does not belong to requesting tenant', async () => {
      mockRequest.params = { id: 'camp-other-user' };
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(null);

      await getCampaign(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Campaign not found',
        })
      );
    });
  });

  describe('approveCampaign Handler (Precondition Status Validation)', () => {
    it('should return 409 Conflict if campaign is NOT in awaiting_human_approval status', async () => {
      mockRequest.params = { id: 'camp-already-approved' };
      mockRequest.body = { action: 'approve' };

      (prisma.campaign.findUnique as jest.Mock).mockResolvedValue({
        id: 'camp-already-approved',
        status: 'completed',
        project: { userId: 'user-uuid-100', name: 'Proj' },
      });

      await approveCampaign(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/state and cannot be approved or rejected/i),
        })
      );
    });

    it('should accept creative_hook_matrix as a valid revision target during rejection', async () => {
      mockRequest.params = { id: 'camp-awaiting-review' };
      mockRequest.body = {
        action: 'reject',
        feedback: 'Hooks need stronger emotional resonance',
        revisionTarget: 'creative_hook_matrix',
      };

      (prisma.campaign.findUnique as jest.Mock).mockResolvedValue({
        id: 'camp-awaiting-review',
        status: 'awaiting_human_approval',
        aiOutputs: JSON.stringify({}),
        project: { userId: 'user-uuid-100', name: 'Proj' },
        creativeHookMatrixRevisionCount: 0,
      });

      (prisma.campaign.update as jest.Mock).mockResolvedValue({
        id: 'camp-awaiting-review',
        status: 'processing',
      });

      await approveCampaign(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Campaign approval submitted',
        })
      );
    });
  });
});
