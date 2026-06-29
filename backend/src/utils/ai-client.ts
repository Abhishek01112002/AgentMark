/**
 * AI Service Client
 * 
 * Simple HTTP client for communicating with FastAPI AI Service.
 * Handles campaign creation and health check.
 */

export interface AIServiceCampaignRequest {
  campaign_name: string;
  brand_name: string;
  industry: string;
  primary_goal: string;
  target_audience: string;
  brand_voice: string;
  brief?: string;
  llm_config?: {
    gemini_api_key?: string | null;
    groq_api_key?: string | null;
    openai_api_key?: string | null;
  };
  campaign_id: string;
  manager_output?: string | null;
  research_output?: string | null;
  strategy_output?: string | null;
  copy_output?: string | null;
  image_output?: string | null;
  review_output?: string | null;
  publisher_output?: string | null;
  human_approval_status?: string | null;
  human_feedback?: string | null;
  human_revision_target?: string | null;
  research_revision_count?: number;
  strategy_revision_count?: number;
  copy_revision_count?: number;
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
    image_output?: any;
    review_output?: any;
    publisher_output?: any;
  };
}

const formatAiServiceError = (detail: unknown, fallback: string) => {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const err = item as Record<string, unknown>;
          const field = Array.isArray(err.loc) ? err.loc.join('.') : undefined;
          const message = typeof err.msg === 'string' ? err.msg : 'Invalid value';
          return field ? `${field}: ${message}` : message;
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (messages.length > 0) {
      return `AI Service rejected the request: ${messages.join(', ')}`;
    }
  }

  if (detail && typeof detail === 'object') {
    const err = detail as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.detail === 'string') return err.detail;
  }

  return fallback;
};

class AIServiceClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5002';
    this.timeout = 300000; // 5 minutes timeout for campaign generation
  }

  /**
   * Create a new campaign using AI agents
   * This is a BLOCKING call that waits for all 7 agents to complete
   */
  async createCampaign(data: AIServiceCampaignRequest): Promise<AIServiceCampaignResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log(`🤖 Calling AI Service: ${this.baseUrl}/campaigns/create`);
      console.log(`📊 Campaign: ${data.campaign_name} | Brand: ${data.brand_name}`);

      const response = await fetch(`${this.baseUrl}/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' })) as { detail?: unknown };
        throw new Error(formatAiServiceError(errorData.detail, response.statusText));
      }

      const result = await response.json() as AIServiceCampaignResponse;
      console.log(`✅ AI Service completed: ${result.status}`);
      
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('AI Service request timeout (exceeded 10 minutes)');
      }
      
      throw new Error(error.message || 'AI Service request failed');
    }
  }

  /**
   * Health check for AI Service
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('AI Service health check failed');
      }

      return await response.json() as { status: string; service: string };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI Service health check timed out');
      }
      throw new Error('AI Service is unavailable');
    }
  }

  /**
   * Enhance a prompt using the AI Service
   */
  async enhancePrompt(prompt: string, userInput?: string, llmConfig?: any): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    try {
      const response = await fetch(`${this.baseUrl}/campaigns/enhance-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          user_input: userInput || null,
          llm_config: llmConfig || null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' })) as { detail?: unknown };
        throw new Error(formatAiServiceError(errorData.detail, response.statusText));
      }

      const result = await response.json() as { enhanced_prompt: string };
      return result.enhanced_prompt;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI Service prompt enhancement timed out');
      }
      throw new Error(error.message || 'AI Service prompt enhancement failed');
    }
  }
}

export const aiServiceClient = new AIServiceClient();
