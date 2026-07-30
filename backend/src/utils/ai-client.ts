/**
 * AI Service Client — Express.js
 *
 * Interfaces with the FastAPI ai-service running on http://127.0.0.1:8000.
 */

import axios from 'axios';
import type { Server } from 'socket.io';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

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
  campaign_name: string;
  brand_name: string;
  error?: string;
  awaiting_human_approval: boolean;
  workflow_finished: boolean;
  outputs: {
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

const formatAiServiceError = (detail: unknown, status: number, fallback: string) => {
  let innerMsg = fallback;
  if (typeof detail === 'string') {
    innerMsg = detail;
  } else if (Array.isArray(detail)) {
    innerMsg = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          const locStr = Array.isArray((item as any).loc) ? (item as any).loc.join('.') : '';
          return `${locStr ? locStr + ': ' : ''}${(item as any).msg}`;
        }
        return JSON.stringify(item);
      })
      .join(' | ');
  } else if (detail && typeof detail === 'object') {
    innerMsg = JSON.stringify(detail);
  }
  return `HTTP ${status}: ${innerMsg}`;
};

const getHeaders = (requestId?: string) => ({
  'Content-Type': 'application/json',
  ...(process.env.INTERNAL_SERVICE_SECRET ? { 'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET } : {}),
  ...(requestId ? { 'X-Request-Id': requestId } : {}),
});

export const aiServiceClient = {
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
        const status = error.response.status || 500;
        const detail = error.response.data?.detail;
        const msg = formatAiServiceError(detail, status, `AI service HTTP ${status}`);
        console.error(`AI service error: ${msg}`);
        const err = new Error(msg);
        (err as any).status = status;
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
      console.error('Enhance prompt API error:', error.message);
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
    console.log(`[AI Client Background] Workflow complete for campaign ${campaignId} with status: ${response.status}`);

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
    console.error(`[AI Client Background] Error running workflow for ${campaignId}: ${errMessage}`);
    io.to(`campaign:${campaignId}`).emit('campaign_failed', {
      campaign_id: campaignId,
      status: 'failed',
      error: errMessage,
    });
  }
}
