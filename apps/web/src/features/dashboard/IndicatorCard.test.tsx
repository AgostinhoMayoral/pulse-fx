import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { IndicatorSummaryDto } from '@pulse-fx/shared';
import { IndicatorCard } from './IndicatorCard.js';

const baseIndicator: IndicatorSummaryDto = {
  id: '1',
  code: 'USD_BRL_PTAX',
  name: 'USD/BRL PTAX',
  description: 'Test indicator',
  source: 'BCB_OLINDA',
  periodicity: 'DAILY',
  historyWindowDays: 90,
  latestValue: 5.6,
  referenceDate: '2026-01-12',
  percentChange: 2.5,
  comparisonDate: '2026-01-05',
  lastSyncedAt: '2026-01-12T12:00:00.000Z',
  isFavorite: false,
};

function renderCard(indicator: IndicatorSummaryDto) {
  return render(
    <MemoryRouter>
      <IndicatorCard indicator={indicator} onToggleFavorite={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('IndicatorCard', () => {
  it('renders positive variation', () => {
    renderCard(baseIndicator);
    expect(screen.getByText('+2.50%')).toHaveClass('variation-positive');
  });

  it('renders negative variation', () => {
    renderCard({ ...baseIndicator, percentChange: -1.2 });
    expect(screen.getByText('-1.20%')).toHaveClass('variation-negative');
  });

  it('handles missing variation data', () => {
    renderCard({
      ...baseIndicator,
      percentChange: null,
      comparisonDate: null,
    });
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('Histórico insuficiente para calcular variação.')).toBeInTheDocument();
  });
});
