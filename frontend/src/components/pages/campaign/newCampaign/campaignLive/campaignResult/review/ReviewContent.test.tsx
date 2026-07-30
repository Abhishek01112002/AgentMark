import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReviewContent from './ReviewContent';

describe('ReviewContent UI Component', () => {
  it('renders overall review score, executive summary, and agent score cards including Creative Hook Matrix', () => {
    const mockReviewData = {
      status: 'approved',
      overall_quality_score: 89.0,
      research_review: { score: 85 },
      strategy_review: { score: 88 },
      copy_review: { score: 90 },
      creative_hook_matrix_review: { score: 94 },
      image_review: { score: 86 },
      overall: {
        quality_score: 89.0,
        summary: 'Strong campaign narrative with top-tier hook variations.',
        strengths: ['High emotional resonance in hooks'],
        critical_improvements: [{ text: 'Expand secondary target audience positioning', action: 'Fix' }],
      },
    };

    render(<ReviewContent data={mockReviewData} reviewScore={89.0} />);

    // Assessment title
    expect(screen.getByText(/Campaign Quality Assessment/i)).toBeInTheDocument();

    // Agent review card titles
    expect(screen.getByText(/Research Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategy Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Hook Matrix Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Image Agent/i)).toBeInTheDocument();
  });
});
