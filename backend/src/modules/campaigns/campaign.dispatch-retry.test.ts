import {
  parseRetryAfter,
  extractAiServiceDiagnostics,
  formatAiServiceError,
} from '../../utils/ai-client';
import {
  isHttp429,
  isRetryableError,
  MAX_RETRIES,
  RETRY_DELAYS_MS,
  MAX_429_RETRIES,
  DEFAULT_429_RETRY_DELAY_MS,
  MAX_429_RETRY_DELAY_MS,
  runAIWorkflowBackground,
} from './campaign.controller';
import prisma from '../../db';
import { redis } from '../../utils/redis';
import { aiServiceClient } from '../../utils/ai-client';
import { campaignService } from './campaign.service';

// Mock external dependencies
jest.mock('../../db', () => ({
  __esModule: true,
  default: {
    campaign: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../../utils/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../utils/ai-client', () => {
  const actual = jest.requireActual('../../utils/ai-client');
  return {
    ...actual,
    aiServiceClient: {
      warmUp: jest.fn().mockResolvedValue(undefined),
      createCampaign: jest.fn(),
    },
  };
});

jest.mock('./campaign.service', () => ({
  campaignService: {
    updateWithAIOutputs: jest.fn().mockResolvedValue({}),
  },
}));

describe('Campaign Dispatch & HTTP 429 Policy Tests', () => {
  let mockIo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };
  });

  describe('parseRetryAfter', () => {
    it('should parse integer seconds into milliseconds', () => {
      expect(parseRetryAfter('5')).toBe(5000);
      expect(parseRetryAfter('10')).toBe(10000);
      expect(parseRetryAfter('0')).toBe(0);
    });

    it('should parse decimal seconds into milliseconds', () => {
      expect(parseRetryAfter('2.5')).toBe(2500);
    });

    it('should return null for invalid or missing values', () => {
      expect(parseRetryAfter(null)).toBeNull();
      expect(parseRetryAfter(undefined)).toBeNull();
      expect(parseRetryAfter('')).toBeNull();
      expect(parseRetryAfter('invalid-date')).toBeNull();
    });

    it('should parse HTTP-date in the future into positive milliseconds', () => {
      const futureDate = new Date(Date.now() + 8000).toUTCString();
      const ms = parseRetryAfter(futureDate);
      expect(typeof ms).toBe('number');
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(10000);
    });
  });

  describe('extractAiServiceDiagnostics', () => {
    it('should capture status, headers, and safe body snippet without secrets', () => {
      const error = {
        response: {
          status: 429,
          headers: {
            'server': 'cloudflare',
            'cf-ray': '8e123456789-BOM',
            'content-type': 'text/html; charset=UTF-8',
            'retry-after': '3',
          },
          data: '<html><head><title>429 Too Many Requests</title></head><body><h1>Rate limit</h1></body></html>',
        },
      };

      const diag = extractAiServiceDiagnostics(error);
      expect(diag.status).toBe(429);
      expect(diag.server).toBe('cloudflare');
      expect(diag.cfRay).toBe('8e123456789-BOM');
      expect(diag.rndrId).toBeNull();
      expect(diag.contentType).toBe('text/html; charset=UTF-8');
      expect(diag.retryAfterRaw).toBe('3');
      expect(diag.retryAfterMs).toBe(3000);
      expect(diag.hasDetail).toBe(false);
      expect(diag.bodySnippet).toBe('429 Too Many Requests Rate limit');
    });

    it('should capture Render edge headers correctly', () => {
      const error = {
        response: {
          status: 502,
          headers: {
            'server': 'render',
            'rndr-id': 'rnd_abc123',
            'content-type': 'application/json',
          },
          data: { error: 'Bad Gateway' },
        },
      };

      const diag = extractAiServiceDiagnostics(error);
      expect(diag.status).toBe(502);
      expect(diag.server).toBe('render');
      expect(diag.rndrId).toBe('rnd_abc123');
      expect(diag.cfRay).toBeNull();
      expect(diag.hasError).toBe(true);
      expect(diag.bodySnippet).toBe('Bad Gateway');
    });
  });

  describe('formatAiServiceError', () => {
    it('should format FastAPI application errors when detail is present', () => {
      const formatted = formatAiServiceError({ detail: 'Custom validation failed' }, 400);
      expect(formatted).toBe('AI service application error (HTTP 400): Custom validation failed');
    });

    it('should format FastAPI validation error arrays', () => {
      const detail = [
        { loc: ['body', 'campaign_name'], msg: 'field required' },
        { loc: ['body', 'brand_name'], msg: 'field required' },
      ];
      const formatted = formatAiServiceError({ detail }, 422);
      expect(formatted).toContain('body.campaign_name: field required');
      expect(formatted).toContain('body.brand_name: field required');
    });

    it('should format edge proxy 429 attributing to Cloudflare when cfRay is present', () => {
      const diag = {
        status: 429,
        server: 'cloudflare',
        cfRay: '92384920384',
        rndrId: null,
        contentType: 'text/html',
        retryAfterRaw: null,
        retryAfterMs: null,
        hasDetail: false,
        hasError: false,
        hasMessage: false,
        bodySnippet: 'Too Many Requests',
      };
      const formatted = formatAiServiceError('html error', 429, diag);
      expect(formatted).toBe('Upstream gateway rate limit (HTTP 429 via Cloudflare edge proxy): Too Many Requests');
    });

    it('should format edge proxy 429 attributing to Render when rndrId is present', () => {
      const diag = {
        status: 429,
        server: null,
        cfRay: null,
        rndrId: 'rnd_xyz',
        contentType: 'text/html',
        retryAfterRaw: null,
        retryAfterMs: null,
        hasDetail: false,
        hasError: false,
        hasMessage: false,
        bodySnippet: 'Too Many Requests',
      };
      const formatted = formatAiServiceError('html error', 429, diag);
      expect(formatted).toBe('Upstream gateway rate limit (HTTP 429 via Render edge proxy): Too Many Requests');
    });

    it('should format edge proxy 429 with generic upstream gateway when no proxy header proves issuer', () => {
      const diag = {
        status: 429,
        server: null,
        cfRay: null,
        rndrId: null,
        contentType: 'text/html',
        retryAfterRaw: null,
        retryAfterMs: null,
        hasDetail: false,
        hasError: false,
        hasMessage: false,
        bodySnippet: 'Too Many Requests',
      };
      const formatted = formatAiServiceError('html error', 429, diag);
      expect(formatted).toBe('Upstream gateway rate limit (HTTP 429 via upstream gateway): Too Many Requests');
    });
  });

  describe('isHttp429 and isRetryableError classification', () => {
    it('identifies 429 correctly via status code', () => {
      expect(isHttp429({ status: 429 })).toBe(true);
      expect(isHttp429({ response: { status: 429 } })).toBe(true);
      expect(isHttp429({ statusCode: 429 })).toBe(true);
      expect(isHttp429(new Error('Request failed with HTTP 429'))).toBe(true);
      expect(isHttp429(new Error('Too Many Requests'))).toBe(true);
    });

    it('ensures isRetryableError excludes HTTP 429', () => {
      expect(isRetryableError({ status: 429 })).toBe(false);
      expect(isRetryableError({ response: { status: 429 } })).toBe(false);
      expect(isRetryableError(new Error('HTTP 429: AI service HTTP 429'))).toBe(false);
      expect(isRetryableError(new Error('Upstream gateway rate limit (HTTP 429 via Cloudflare edge proxy): Too Many Requests'))).toBe(false);
    });

    it('ensures isRetryableError includes 5xx and connection drops', () => {
      expect(isRetryableError({ status: 500 })).toBe(true);
      expect(isRetryableError({ status: 502 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ status: 504 })).toBe(true);
      expect(isRetryableError(new Error('connect ECONNREFUSED 127.0.0.1:5002'))).toBe(true);
      expect(isRetryableError(new Error('timeout of 600000ms exceeded'))).toBe(true);
    });

    it('ensures isRetryableError excludes client validation errors', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 401 })).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
      expect(isRetryableError({ status: 422 })).toBe(false);
      expect(isRetryableError(new Error('Invalid project ID'))).toBe(false);
    });
  });

  describe('runAIWorkflowBackground HTTP 429 Policy', () => {
    const campaignId = 'camp-test-429';
    const payload: any = {
      campaign_name: 'Test Campaign',
      brand_name: 'Brand',
      industry: 'saas',
      primary_goal: 'awareness',
      target_audience: 'founders',
      brand_voice: 'bold',
      campaign_id: campaignId,
    };

    it('retries once after DEFAULT_429_RETRY_DELAY_MS (5s) when Retry-After is absent, then fails fast', async () => {
      const err429: any = new Error('Upstream gateway rate limit (HTTP 429 via Cloudflare edge proxy): Too Many Requests');
      err429.status = 429;
      err429.retryAfterMs = null;

      (aiServiceClient.createCampaign as jest.Mock)
        .mockRejectedValueOnce(err429)
        .mockRejectedValueOnce(err429);

      // Fast-forward or use short delay by testing execution
      const runPromise = runAIWorkflowBackground(campaignId, payload, mockIo, 'req-429-1');
      await runPromise;

      // createCampaign should be called exactly twice (1 initial + 1 retry)
      expect(aiServiceClient.createCampaign).toHaveBeenCalledTimes(2);

      // Should mark campaign as failed with descriptive message
      expect(campaignService.updateWithAIOutputs).toHaveBeenCalledWith(
        campaignId,
        '',
        {},
        'failed',
        expect.stringContaining('HTTP 429')
      );

      // WebSocket should emit failure
      expect(mockIo.to(`campaign:${campaignId}`).emit).toHaveBeenCalledWith(
        'campaign_failed',
        expect.objectContaining({
          campaign_id: campaignId,
          status: 'failed',
          error: expect.stringContaining('HTTP 429'),
        })
      );
    }, 15000);

    it('honors Retry-After header when <= 10s (e.g. 1000ms) and succeeds on retry', async () => {
      const err429: any = new Error('Upstream gateway rate limit (HTTP 429 via Render edge proxy): Too Many Requests');
      err429.status = 429;
      err429.retryAfterMs = 1000; // 1 second <= 10s

      (aiServiceClient.createCampaign as jest.Mock)
        .mockRejectedValueOnce(err429)
        .mockResolvedValueOnce({ campaign_id: campaignId, status: 'accepted' });

      await runAIWorkflowBackground(campaignId, payload, mockIo, 'req-429-2');

      // Called twice: attempt 0 failed with 429, attempt 1 succeeded
      expect(aiServiceClient.createCampaign).toHaveBeenCalledTimes(2);

      // Should NOT have marked as failed in DB
      expect(campaignService.updateWithAIOutputs).not.toHaveBeenCalled();
      expect(mockIo.to(`campaign:${campaignId}`).emit).not.toHaveBeenCalled();
    }, 10000);

    it('fails fast immediately with 0 retries when Retry-After > 10s (e.g. 30s)', async () => {
      const err429: any = new Error('Upstream gateway rate limit (HTTP 429 via Cloudflare edge proxy): Too Many Requests');
      err429.status = 429;
      err429.retryAfterMs = 30000; // 30s > 10s threshold

      (aiServiceClient.createCampaign as jest.Mock).mockRejectedValueOnce(err429);

      await runAIWorkflowBackground(campaignId, payload, mockIo, 'req-429-3');

      // Should have made ONLY 1 attempt (0 retries)
      expect(aiServiceClient.createCampaign).toHaveBeenCalledTimes(1);

      // Fails immediately
      expect(campaignService.updateWithAIOutputs).toHaveBeenCalledWith(
        campaignId,
        '',
        {},
        'failed',
        expect.stringContaining('HTTP 429')
      );
    }, 5000);

    it('fails immediately with 0 retries for non-retryable 4xx errors', async () => {
      const err400: any = new Error('AI service application error (HTTP 400): Missing required field');
      err400.status = 400;

      (aiServiceClient.createCampaign as jest.Mock).mockRejectedValueOnce(err400);

      await runAIWorkflowBackground(campaignId, payload, mockIo, 'req-400-1');

      expect(aiServiceClient.createCampaign).toHaveBeenCalledTimes(1);
      expect(campaignService.updateWithAIOutputs).toHaveBeenCalledWith(
        campaignId,
        '',
        {},
        'failed',
        expect.stringContaining('Missing required field')
      );
    }, 5000);
  });
});
