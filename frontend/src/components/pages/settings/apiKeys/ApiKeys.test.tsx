import { render, screen, fireEvent } from '@testing-library/react';
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

describe('ApiKeys Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the API Keys heading and description', () => {
    render(<ApiKeys />);
    expect(screen.getByRole('heading', { name: /api keys/i })).toBeInTheDocument();
    expect(screen.getByText(/Add your provider API keys/i)).toBeInTheDocument();
  });

  it('renders inputs for Gemini, Groq, and OpenAI', () => {
    render(<ApiKeys />);
    expect(screen.getByPlaceholderText(/Paste your Gemini API key/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste your Groq API key/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste your OpenAI API key/i)).toBeInTheDocument();
  });

  it('allows entering and saving a Gemini API key', () => {
    render(<ApiKeys />);
    const geminiInput = screen.getByPlaceholderText(/Paste your Gemini API key/i);

    fireEvent.change(geminiInput, { target: { value: 'AIzaSyTestKey123456789012345678901234567' } });
    expect(geminiInput).toHaveValue('AIzaSyTestKey123456789012345678901234567');

    // Click Save — triggers confirmation dialog
    const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
    fireEvent.click(saveButtons[1]);

    // Dialog asks "Test this key first?" — click "Save Anyway"
    const saveAnyway = screen.getByRole('button', { name: /save anyway/i });
    fireEvent.click(saveAnyway);

    const savedSettings = llmSettingsService.get();
    expect(savedSettings.gemini.keys[0].value).toBe('AIzaSyTestKey123456789012345678901234567');
  });
});
