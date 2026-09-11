/**
 * AI Service Client — Express.js
 *
 * Interfaces with the FastAPI ai-service running on http://127.0.0.1:8000.
 */

import axios from 'axios';
import logger from './logger';
import type { Server } from 'socket.io';

function getAiServiceUrl(): string {
  const envUrl = process.env.AI_SERVICE_URL?.trim();
  if (envUrl && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) {
    return envUrl;
  }
  if (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.PORT) {
    return 'https://agentmark.onrender.com';
  }
  return envUrl || 'http://127.0.0.1:5002';
}

const AI_SERVICE_URL = getAiServiceUrl();

export interface AIServiceCampaignRequest {
  campaign_name: string;
  brand_name: string;
  industry: string;
  primary_goal: string;
  target_audience: string;
  brand_voice: string;
  brief?: string | null;
  llm_config?: {
    openai_api_key?: string | null;
    gemini_api_key?: string | null;
    groq_api_key?: string | null;
    tavily_api_key?: string | null;
    provider_order?: string[];
  };
  campaign_id: string;
  manager_output?: string | null;
  research_output?: string | null;
  strategy_output?: string | null;
  copy_output?: string | null;
  creative_hook_matrix_output?: string | null;
  image_output?: string | null;
  review_output?: string | null;
  publisher_output?: string | null;
  human_approval_status?: string | null;
  human_feedback?: string | null;
  human_revision_target?: string | null;
  research_revision_count?: number;
  strategy_revision_count?: number;
  copy_revision_count?: number;
  creative_hook_matrix_revision_count?: number;
  image_revision_count?: number;
  client_memory_context?: string | null;
}

interface AIServiceCampaignResponse {
  campaign_id: string;
  status: string;
  message?: string;
  campaign_name?: string;
  brand_name?: string;
  error?: string;
  awaiting_human_approval?: boolean;
  workflow_finished?: boolean;
  outputs?: {
    manager_output?: any;
    research_output?: any;
    strategy_output?: any;
    copy_output?: any;
    creative_hook_matrix_output?: any;
    image_output?: any;
    review_output?: any;
    publisher_output?: any;
  };
}

export interface AiServiceDiagnostics {
  status: number;
  server: string | null;
  cfRay: string | null;
  rndrId: string | null;
  contentType: string | null;
  retryAfterRaw: string | null;
  retryAfterMs: number | null;
  hasDetail: boolean;
  hasError: boolean;
  hasMessage: boolean;
  bodySnippet: string | null;
}

export function parseRetryAfter(header: unknown): number | null {
  if (header === null || header === undefined) return null;
  const raw = String(header).trim();
  if (!raw) return null;

  const seconds = Number(raw);
  if (!isNaN(seconds) && isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const parsedDate = Date.parse(raw);
  if (!isNaN(parsedDate)) {
    return Math.max(0, parsedDate - Date.now());
  }

  return null;
}

function getHeaderCaseInsensitive(headers: Record<string, any> | undefined, name: string): string | null {
  if (!headers || typeof headers !== 'object') return null;
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower && headers[key] != null) {
      return String(headers[key]).trim();
    }
  }
  return null;
}

export function extractAiServiceDiagnostics(error: any): AiServiceDiagnostics {
  const response = error?.response;
  const headers = response?.headers || {};
  const status = Number(response?.status || error?.status || 500);

  const server = getHeaderCaseInsensitive(headers, 'server');
  const cfRay = getHeaderCaseInsensitive(headers, 'cf-ray');
  const rndrId = getHeaderCaseInsensitive(headers, 'rndr-id');
  const contentType = getHeaderCaseInsensitive(headers, 'content-type');
  const retryAfterRaw = getHeaderCaseInsensitive(headers, 'retry-after');
  const retryAfterMs = parseRetryAfter(retryAfterRaw);

  const data = response?.data;
  const hasDetail = Boolean(data && typeof data === 'object' && 'detail' in data && (data as any).detail != null);
  const hasError = Boolean(data && typeof data === 'object' && 'error' in data && (data as any).error != null);
  const hasMessage = Boolean(data && typeof data === 'object' && 'message' in data && (data as any).message != null);

  let bodySnippet: string | null = null;
  if (typeof data === 'string') {
    const cleaned = data.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    bodySnippet = cleaned.length > 180 ? `${cleaned.substring(0, 177)}...` : (cleaned || null);
  } else if (data && typeof data === 'object') {
    if (typeof (data as any).error === 'string') {
      bodySnippet = (data as any).error.substring(0, 180).trim();
    } else if (typeof (data as any).message === 'string') {
      bodySnippet = (data as any).message.substring(0, 180).trim();
    }
  }

  return {
    status,
    server,
    cfRay,
    rndrId,
    contentType,
    retryAfterRaw,
    retryAfterMs,
    hasDetail,
    hasError,
    hasMessage,
    bodySnippet,
  };
}

export function formatAiServiceError(
  data: unknown,
  status: number,
  diagnostics?: AiServiceDiagnostics
): string {
  // Case 1: FastAPI structured error with detail
  if (data && typeof data === 'object' && 'detail' in (data as any) && (data as any).detail != null) {
    const detail = (data as any).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return `AI service application error (HTTP ${status}): ${detail.trim()}`;
    }
    if (Array.isArray(detail)) {
      const formatted = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            const locStr = Array.isArray((item as any).loc) ? (item as any).loc.join('.') : '';
            return `${locStr ? locStr + ': ' : ''}${(item as any).msg}`;
          }
          return JSON.stringify(item);
        })
        .join(' | ');
      return `AI service validation error (HTTP ${status}): ${formatted}`;
    }
  }

  // Case 2: Structured error/message
  if (data && typeof data === 'object') {
    if ('error' in (data as any) && typeof (data as any).error === 'string' && (data as any).error.trim()) {
      return `AI service application error (HTTP ${status}): ${(data as any).error.trim()}`;
    }
    if ('message' in (data as any) && typeof (data as any).message === 'string' && (data as any).message.trim()) {
      return `AI service application error (HTTP ${status}): ${(data as any).message.trim()}`;
    }
  }

  // Case 3: Gateway / Edge error (no detail property)
  // Derive proven issuer strictly from headers (no speculative claims)
  let issuer = 'upstream gateway';
  if (diagnostics?.cfRay) {
    issuer = 'Cloudflare edge proxy';
  } else if (diagnostics?.rndrId || (diagnostics?.server && diagnostics.server.toLowerCase().includes('render'))) {
    issuer = 'Render edge proxy';
  } else if (diagnostics?.server) {
    issuer = `${diagnostics.server} proxy`;
  }

  const snippet = diagnostics?.bodySnippet || (status === 429 ? 'Too Many Requests' : 'Service Unavailable');
  if (status === 429) {
    return `Upstream gateway rate limit (HTTP 429 via ${issuer}): ${snippet}`;
  }
  return `Upstream gateway error (HTTP ${status} via ${issuer}): ${snippet}`;
}

const DEFAULT_INTERNAL_SECRET = '7b3e9f2a5c8d1e4b7f0a3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7';

const getHeaders = (requestId?: string) => ({
  'Content-Type': 'application/json',
  'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET || DEFAULT_INTERNAL_SECRET,
  ...(requestId ? { 'X-Request-Id': requestId } : {}),
});

export const aiServiceClient = {
  async warmUp(timeoutMs = 75_000): Promise<void> {
    const start = Date.now();
    const pollInterval = 5_000;
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 8_000 });
        if (res.status === 200) return;
      } catch {
        // Service still waking — wait and retry
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    throw new Error(`AI service did not respond within ${timeoutMs}ms`);
  },

  async runCampaign(payload: AIServiceCampaignRequest, requestId?: string): Promise<AIServiceCampaignResponse> {
    try {
      const response = await axios.post<AIServiceCampaignResponse>(
        `${AI_SERVICE_URL}/campaigns/create`,
        payload,
        {
          headers: getHeaders(requestId),
          timeout: 600000,
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const diagnostics = extractAiServiceDiagnostics(error);
        const msg = formatAiServiceError(error.response.data, diagnostics.status, diagnostics);
        logger.error(
          `AI service dispatch failure | status=${diagnostics.status} | server=${diagnostics.server || 'none'} | cfRay=${diagnostics.cfRay || 'none'} | rndrId=${diagnostics.rndrId || 'none'} | retryAfterMs=${diagnostics.retryAfterMs ?? 'none'} | msg=${msg}`
        );
        const err = new Error(msg);
        (err as any).status = diagnostics.status;
        (err as any).retryAfterMs = diagnostics.retryAfterMs;
        (err as any).diagnostics = diagnostics;
        (err as any).response = error.response;
        throw err;
      }
      throw error;
    }
  },

  async createCampaign(payload: AIServiceCampaignRequest, requestId?: string): Promise<AIServiceCampaignResponse> {
    return this.runCampaign(payload, requestId);
  },

  async enhancePrompt(prompt: string, userInput?: string, llmConfig?: Record<string, any>): Promise<string> {
    try {
      const response = await axios.post<{ enhanced_prompt: string }>(
        `${AI_SERVICE_URL}/campaigns/enhance-prompt`,
        { prompt, user_input: userInput, llm_config: llmConfig },
        { headers: getHeaders(), timeout: 30000 }
      );
      return response.data.enhanced_prompt;
    } catch (error: any) {
      logger.error('Enhance prompt API error:', error.message);
      return prompt;
    }
  },

  async generateCopyVariant(payload: {
    campaign_id: string;
    channel: string;
    target_audience: string;
    brand_voice: string;
    brief?: string | null;
    steering_note?: string | null;
    strategy_data?: string | null;
    existing_copy?: string | null;
    focus_group_context?: string | null;
    llm_config?: Record<string, any>;
  }): Promise<{ copy_output: Record<string, any>; copy_versions: any[]; copy_data?: any }> {
    const response = await axios.post(
      `${AI_SERVICE_URL}/campaigns/generate-copy-variant`,
      payload,
      { headers: getHeaders(), timeout: 60000 }
    );
    return response.data;
  },

  async testKey(provider: string, apiKey: string): Promise<{ valid: boolean; message: string }> {
    const response = await axios.post(
      `${AI_SERVICE_URL}/campaigns/test-key`,
      { provider, api_key: apiKey },
      { headers: getHeaders(), timeout: 15000 }
    );
    return response.data;
  },
};

import prisma from '../db';

export async function runAIWorkflowBackground(
  campaignId: string,
  payload: AIServiceCampaignRequest,
  io: Server
): Promise<void> {
  try {
    const response = await aiServiceClient.runCampaign(payload);
    logger.info(`[AI Client Background] AI service response for campaign ${campaignId}: ${response.status}`);

    if (response.status === 'accepted') {
      logger.info(`[AI Client Background] Campaign ${campaignId} accepted by AI service — execution running asynchronously via Redis Pub/Sub`);
      return;
    }

    if (response.status === 'awaiting_human_approval' || response.status === 'completed') {
      const existing = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { aiOutputs: true } });
      const currentOutputs = existing?.aiOutputs
        ? (typeof existing.aiOutputs === 'string' ? JSON.parse(existing.aiOutputs) : existing.aiOutputs)
        : {};

      const mergedOutputs = {
        ...currentOutputs,
        ...(response.outputs || {}),
      };

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: response.status,
          aiOutputs: mergedOutputs as any,
        },
      });

      const eventName = response.status === 'awaiting_human_approval' ? 'human_approval_required' : 'campaign_complete';
      io.to(`campaign:${campaignId}`).emit(eventName, { campaign_id: campaignId, status: response.status, outputs: mergedOutputs });
      io.to(`campaign:${campaignId}`).emit('awaiting_human_approval', { campaign_id: campaignId, status: response.status, outputs: mergedOutputs });
    }
  } catch (err: any) {
    const errMessage = err.message || 'AI service unavailable';
    logger.error(`[AI Client Background] Error running workflow for ${campaignId}: ${errMessage}`);
    io.to(`campaign:${campaignId}`).emit('campaign_failed', {
      campaign_id: campaignId,
      status: 'failed',
      error: errMessage,
    });
  }
}

/**
 * Warm-up the AI service by polling /health until it responds 200 or the
 * timeout expires. This handles Render free-tier cold-starts (~50 s).
 */
export const warmUpAIService = async (timeoutMs = 75_000): Promise<void> => {
  const start = Date.now();
  const pollInterval = 5_000;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 8_000 });
      if (res.status === 200) return;
    } catch {
      // Service still waking — wait and retry
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`AI service did not respond within ${timeoutMs}ms`);
};

// Attach warmUp to the aiServiceClient object for convenience
(aiServiceClient as any).warmUp = warmUpAIService;
