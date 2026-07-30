import axios from 'axios';
import { aiServiceClient } from './ai-client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AI Client Utility (ai-client)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enhancePrompt', () => {
    it('should call /campaigns/enhance-prompt endpoint and return enhanced prompt string', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { enhanced_prompt: 'Cinematic 8k resolution detailed commercial scene...' },
      });

      const result = await aiServiceClient.enhancePrompt('A modern office space', 'Add warm lighting');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/campaigns/enhance-prompt'),
        {
          prompt: 'A modern office space',
          user_input: 'Add warm lighting',
          llm_config: undefined,
        },
        expect.objectContaining({ timeout: 30000 })
      );
      expect(result).toBe('Cinematic 8k resolution detailed commercial scene...');
    });

    it('should return original prompt fallback if enhancePrompt API call fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await aiServiceClient.enhancePrompt('Fallback prompt test');
      expect(result).toBe('Fallback prompt test');
    });
  });

  describe('runCampaign Error Formatting', () => {
    it('should format HTTP status code in error message when AI service returns HTTP 429', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { detail: 'Rate limit exceeded. Try again later.' },
        },
      });

      await expect(
        aiServiceClient.runCampaign({
          campaign_id: 'c1',
          campaign_name: 'Test',
          brand_name: 'Brand',
          industry: 'tech',
          primary_goal: 'awareness',
          target_audience: 'all',
          brand_voice: 'bold',
        })
      ).rejects.toThrow('HTTP 429: Rate limit exceeded. Try again later.');
    });
  });

  describe('testKey', () => {
    it('should return valid=true when API key verification succeeds', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { valid: true, message: 'Gemini API key is valid' },
      });

      const result = await aiServiceClient.testKey('gemini', 'AIzaSyValidKey123');

      expect(result).toEqual({
        valid: true,
        message: 'Gemini API key is valid',
      });
    });

    it('should return valid=false when API key verification fails', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { valid: false, message: 'Invalid API key' },
      });

      const result = await aiServiceClient.testKey('groq', 'gsk_invalidKey');

      expect(result).toEqual({
        valid: false,
        message: 'Invalid API key',
      });
    });
  });
});
