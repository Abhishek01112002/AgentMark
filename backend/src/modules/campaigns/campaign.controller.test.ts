import { Request, Response, NextFunction } from 'express';
import { compareCampaigns, verifyChannelCredentials, exportCampaignPdf } from './campaign.controller';
import prisma from '../../db';
import fs from 'fs/promises';

// Mock dependencies
jest.mock('../../db', () => ({
  __esModule: true,
  default: {
    campaign: {
      findFirst: jest.fn(),
    }
  }
}));

// Removed pdf-generator.service mock

// We only need to mock what exportCampaignPdf uses if it does use any other services
jest.mock('./campaign.service', () => ({
  campaignService: {}
}));

describe('campaign.controller', () => {
  const next: NextFunction = jest.fn();

  function makeReqRes(overrides: Partial<Request> = {}) {
    const req = {
      userId: 'user-123',
      body: {},
      params: {},
      ...overrides,
    } as any;
  
    const json = jest.fn();
    const send = jest.fn();
    const setHeader = jest.fn();
    const status = jest.fn().mockReturnValue({ json, send });
    const res = { json, send, status, setHeader, writeHead: jest.fn(), write: jest.fn(), end: jest.fn() } as any;
  
    return { req, res, json, send, status, setHeader };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compareCampaigns', () => {
    it('should return 422 if target campaign has no reviewScore', async () => {
      const { req, res, status, json } = makeReqRes({
        body: { targetCampaignId: 'target-1', baselineCampaignId: 'base-1' }
      });

      (prisma.campaign.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'target-1', reviewScore: null })
        .mockResolvedValueOnce({ id: 'base-1', reviewScore: 80.0 });

      await compareCampaigns(req, res, next);

      expect(status).toHaveBeenCalledWith(422);
      expect(json).toHaveBeenCalledWith({ campaignStatus: undefined, error: 'Target campaign does not have a review score yet. Only completed campaigns with scores can be compared.' });
    });

    it('should calculate scoreDelta correctly when target and baseline have scores', async () => {
      const { req, res, status, json } = makeReqRes({
        body: { targetCampaignId: 'target-1', baselineCampaignId: 'base-1' }
      });

      (prisma.campaign.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'target-1', reviewScore: 85.0 })
        .mockResolvedValueOnce({ id: 'base-1', reviewScore: 80.0 });

      await compareCampaigns(req, res, next);

      expect(status).not.toHaveBeenCalledWith(422);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        comparison: expect.objectContaining({
          scoreDelta: 5.0
        })
      }));
    });

    it('should return null scoreDelta if baseline has no score', async () => {
      const { req, res, status, json } = makeReqRes({
        body: { targetCampaignId: 'target-1', baselineCampaignId: 'base-1' }
      });

      (prisma.campaign.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'target-1', reviewScore: 85.0 })
        .mockResolvedValueOnce({ id: 'base-1', reviewScore: null });

      await compareCampaigns(req, res, next);

      expect(status).not.toHaveBeenCalledWith(422);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        comparison: expect.objectContaining({
          scoreDelta: null
        })
      }));
    });
  });

  describe('verifyChannelCredentials', () => {
    it('should return UNCONFIGURED status for all requested channels', async () => {
      const { req, res, json } = makeReqRes({
        params: { id: 'camp-123' },
        body: { channels: ['instagram', 'facebook'] }
      });

      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'camp-123', name: 'Test Campaign' });

      await verifyChannelCredentials(req, res, next);

      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        status: 'Unconfigured',
        channels: [
          { channel: 'instagram', status: 'UNCONFIGURED', readyToPublish: false, lastVerifiedAt: null },
          { channel: 'facebook', status: 'UNCONFIGURED', readyToPublish: false, lastVerifiedAt: null }
        ]
      }));
    });
  });

  describe('exportCampaignPdf', () => {
    it('should stream PDF as a binary buffer with correct headers', async () => {
      const { req, res, send, setHeader } = makeReqRes({
        params: { id: 'camp-123' }
      });

      (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce({ 
        id: 'camp-123', 
        name: 'My Awesome Campaign',
        project: { name: 'Proj' }
      });

      await exportCampaignPdf(req, res, next);

      expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="My_Awesome_Campaign-camp-123.pdf"'));
      expect(setHeader).toHaveBeenCalledWith('Content-Length', expect.any(String));
      expect(send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });
});
