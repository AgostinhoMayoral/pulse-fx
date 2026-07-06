import type { IndicatorSummaryDto } from '@pulse-fx/shared';
import { Link } from 'react-router-dom';
import {
  formatDate,
  formatPercent,
  formatSourceLabel,
  variationClassName,
} from '../../shared/lib/format.js';
import { ValueWithUnit } from '../../shared/components/ValueWithUnit.js';
import { Sparkline, type TrendDirection } from './Sparkline.js';

interface IndicatorCardProps {
  indicator: IndicatorSummaryDto;
  onToggleFavorite: (indicatorId: string, isFavorite: boolean) => void;
  isUpdating?: boolean;
}

function trendDirection(percentChange: number | null): TrendDirection {
  if (percentChange === null || percentChange === 0) {
    return 'neutral';
  }
  return percentChange > 0 ? 'up' : 'down';
}

export function IndicatorCard({ indicator, onToggleFavorite, isUpdating }: IndicatorCardProps) {
  return (
    <article className="card indicator-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{formatSourceLabel(indicator.source)}</p>
          <h2>{indicator.name}</h2>
        </div>
        <button
          type="button"
          className={`favorite-button ${indicator.isFavorite ? 'is-active' : ''}`}
          aria-pressed={indicator.isFavorite}
          aria-label={indicator.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          disabled={isUpdating}
          onClick={() => onToggleFavorite(indicator.id, indicator.isFavorite)}
        >
          {indicator.isFavorite ? '★' : '☆'}
        </button>
      </div>

      <p className="card-description">{indicator.description}</p>

      <div className="card-hero">
        <div className="hero-value-block">
          <span className="metric-label">Último valor</span>
          <ValueWithUnit
            className="hero-value"
            value={indicator.latestValue}
            periodicity={indicator.periodicity}
            prefix={indicator.valuePrefix}
            suffix={indicator.valueSuffix}
          />
          <span className="hero-date">{formatDate(indicator.referenceDate)}</span>
        </div>
        <Sparkline values={indicator.sparkline} direction={trendDirection(indicator.percentChange)} />
      </div>

      <div className="variation-row">
        <span className={`variation-chip ${variationClassName(indicator.percentChange)}`}>
          {formatPercent(indicator.percentChange)}
        </span>
        {indicator.comparisonDate ? (
          <span className="comparison-note">vs. {formatDate(indicator.comparisonDate)}</span>
        ) : (
          <span className="comparison-note">Histórico insuficiente para calcular variação.</span>
        )}
      </div>

      <Link to={`/indicators/${indicator.code}`} className="card-link">
        Ver detalhes <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
