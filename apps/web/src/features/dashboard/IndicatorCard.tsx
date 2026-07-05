import type { IndicatorSummaryDto } from '@pulse-fx/shared';
import { Link } from 'react-router-dom';
import {
  formatDate,
  formatPercent,
  formatValue,
  variationClassName,
} from '../../shared/lib/format.js';

interface IndicatorCardProps {
  indicator: IndicatorSummaryDto;
  onToggleFavorite: (indicatorId: string, isFavorite: boolean) => void;
  isUpdating?: boolean;
}

export function IndicatorCard({ indicator, onToggleFavorite, isUpdating }: IndicatorCardProps) {
  return (
    <article className="card indicator-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{indicator.source.replace('_', ' ')}</p>
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

      <div className="metric-grid">
        <div>
          <span className="metric-label">Último valor</span>
          <strong className="metric-value">
            {formatValue(indicator.latestValue, indicator.periodicity)}
          </strong>
        </div>
        <div>
          <span className="metric-label">Data de referência</span>
          <strong className="metric-value">{formatDate(indicator.referenceDate)}</strong>
        </div>
        <div>
          <span className="metric-label">Variação %</span>
          <strong className={`metric-value ${variationClassName(indicator.percentChange)}`}>
            {formatPercent(indicator.percentChange)}
          </strong>
        </div>
      </div>

      {indicator.comparisonDate ? (
        <p className="comparison-note">
          Comparado com {formatDate(indicator.comparisonDate)}
        </p>
      ) : (
        <p className="comparison-note">Histórico insuficiente para calcular variação.</p>
      )}

      <Link to={`/indicators/${indicator.code}`} className="card-link">
        Ver detalhes
      </Link>
    </article>
  );
}
