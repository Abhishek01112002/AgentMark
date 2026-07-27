import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiKeys from './ApiKeys';
import { llmSettingsService } from '../../../../services/llm-settings.service';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../services/notifications.service', () => ({
  notificationsService: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

// Mock API calls — auto-test will hit /campaigns/test-key and fail
vi.mock('../../../../services/api', () => ({
  default: {
    post: vi.fn().mockRejectedValue(new Error('Network error')),
  },
}));

// ApiKeys now calls useAuth() to scope API keys per user.
// Provide a stable mock so tests don't need a real AuthProvider tree.
const MOCK_USER_ID = 'test-user-ci';
vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: MOCK_USER_ID, email: 'ci@test.com', name: 'CI User' } }),
}));

describe('ApiKeys Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the API Keys heading and description', () => {
    render(<ApiKeys />);
    expect(screen.getByRole('heading', { name: /llm & search api credentials/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage API keys for Gemini, Groq, OpenAI, and Tavily/i)).toBeInTheDocument();
  });

  it('renders inputs for Gemini, Groq, and OpenAI', () => {
    render(<ApiKeys />);
    expect(screen.getByPlaceholderText(/Paste your Gemini API key/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste your Groq API key/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste OpenAI API key/i)).toBeInTheDocument();
  });

  it('allows entering and saving a Gemini API key', async () => {
    render(<ApiKeys />);
    const geminiInput = screen.getByPlaceholderText(/Paste your Gemini API key/i);

    fireEvent.change(geminiInput, { target: { value: 'AIzaSyTestKey123456789012345678901234567' } });
    expect(geminiInput).toHaveValue('AIzaSyTestKey123456789012345678901234567');

    // Click Save — triggers auto-test, which fails (mocked), then shows "Save Anyway?" dialog
    const saveButtons = screen.getAllByRole('button', { name: /save key/i });
    fireEvent.click(saveButtons[1]);

    // Wait for the async test to fail and the confirmation modal to appear
    const saveAnyway = await screen.findByRole('button', { name: /save anyway/i });
    fireEvent.click(saveAnyway);

    // Keys are now scoped per userId — pass the same mocked userId used above
    await waitFor(() => {
      const savedSettings = llmSettingsService.get(MOCK_USER_ID);
      expect(savedSettings.gemini.keys[0].value).toBe('AIzaSyTestKey123456789012345678901234567');
    });
  });
});
