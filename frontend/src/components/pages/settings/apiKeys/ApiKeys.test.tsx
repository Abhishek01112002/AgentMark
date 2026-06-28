import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiKeys from './ApiKeys';
import { llmSettingsService } from '../../../../services/llm-settings.service';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
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
    expect(screen.getByText(/Add your provider keys in priority order/i)).toBeInTheDocument();
  });

  it('renders inputs for Gemini, Groq, and OpenAI', () => {
    render(<ApiKeys />);
    expect(screen.getByPlaceholderText(/paste multiple keys separated by commas/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('gsk_...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
  });

  it('allows entering and saving a Gemini API key', () => {
    render(<ApiKeys />);
    const geminiInput = screen.getByPlaceholderText(/paste multiple keys separated by commas/i);
    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    
    fireEvent.change(geminiInput, { target: { value: 'AIzaSyTestKey' } });
    expect(geminiInput).toHaveValue('AIzaSyTestKey');

    // Click the save button for Gemini (the first save button)
    fireEvent.click(saveButtons[0]);

    const savedSettings = llmSettingsService.get();
    expect(savedSettings.gemini.key).toBe('AIzaSyTestKey');
  });
});
