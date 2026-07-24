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
    tavily_api_key?: string | null;
    provider_order?: string[];
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

const aiServiceHeaders = () => {
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
  if (!internalSecret) {
    throw new Error('INTERNAL_SERVICE_SECRET environment variable must be set');
  }

  return {
    'Content-Type': 'application/json',
    'X-Internal-Secret': internalSecret,
  };
};

class AIServiceClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5002';
    this.timeout = 600000; // 10 minutes timeout for campaign generation
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
        headers: aiServiceHeaders(),
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
   * Test an API key by making a minimal LLM call
   */
  async testKey(provider: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.baseUrl}/campaigns/test-key`, {
        method: 'POST',
        headers: aiServiceHeaders(),
        body: JSON.stringify({ provider, api_key: apiKey }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' })) as { detail?: unknown };
        return { success: false, message: formatAiServiceError(errorData.detail, response.statusText) };
      }

      return await response.json() as { success: boolean; message: string };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { success: false, message: 'Request timed out' };
      }
      return { success: false, message: error.message || 'Connection failed' };
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
        headers: aiServiceHeaders(),
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

  /**
   * Generate copy variant from AI Service
   */
  async generateCopyVariant(data: {
    campaign_id: string;
    channel: string;
    steering_note: string;
    existing_copy: string | null;
    strategy_data: string | null;
    brief: string;
    brand_voice: string;
    target_audience: string;
    llm_config?: any;
    focus_group_context?: string | null;
  }): Promise<{ channel: string; copy_data: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(`${this.baseUrl}/campaigns/generate-copy-variant`, {
        method: 'POST',
        headers: aiServiceHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' })) as { detail?: unknown };
        throw new Error(formatAiServiceError(errorData.detail, response.statusText));
      }
      return await response.json() as { channel: string; copy_data: any };
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw new Error(error.message || 'AI Service copy variant generation failed');
    }
  }
}

export const aiServiceClient = new AIServiceClient();
