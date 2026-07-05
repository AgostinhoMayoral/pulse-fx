import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../shared/api/client.js';
import { formatDate, formatPercent, formatValue, variationClassName } from '../../shared/lib/format.js';

export function IndicatorDetailPage() {
  const { code = '' } = useParams();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const detailQuery = useQuery({
    queryKey: ['indicator', code],
    queryFn: () => api.getIndicator(code),
    enabled: Boolean(code),
  });

  const chartData = useMemo(
    () =>
      detailQuery.data?.observations.map((item) => ({
        date: formatDate(item.referenceDate),
        value: item.value,
      })) ?? [],
    [detailQuery.data],
  );

  if (detailQuery.isLoading) {
    return <div className="state-panel">Carregando detalhe do indicador...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <div className="state-panel state-error">Indicador não encontrado ou indisponível.</div>;
  }

  const indicator = detailQuery.data;

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">{indicator.source.replace('_', ' ')}</p>
          <h1>{indicator.name}</h1>
          <p className="page-subtitle">{indicator.description}</p>
        </div>
      </header>

      <div className="detail-summary card">
        <div>
          <span className="metric-label">Último valor</span>
          <strong className="metric-value large">
            {formatValue(indicator.latestValue, indicator.periodicity)}
          </strong>
        </div>
        <div>
          <span className="metric-label">Referência</span>
          <strong className="metric-value">{formatDate(indicator.referenceDate)}</strong>
        </div>
        <div>
          <span className="metric-label">Variação %</span>
          <strong className={`metric-value ${variationClassName(indicator.percentChange)}`}>
            {formatPercent(indicator.percentChange)}
          </strong>
        </div>
        <div>
          <span className="metric-label">Janela histórica</span>
          <strong className="metric-value">{indicator.historyWindowDays} dias</strong>
        </div>
      </div>

      <div className="view-toggle">
        <button
          type="button"
          className={viewMode === 'chart' ? 'is-active' : ''}
          onClick={() => setViewMode('chart')}
        >
          Gráfico
        </button>
        <button
          type="button"
          className={viewMode === 'table' ? 'is-active' : ''}
          onClick={() => setViewMode('table')}
        >
          Tabela
        </button>
      </div>

      {viewMode === 'chart' ? (
        <div className="card chart-card">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" />
              <XAxis
                dataKey="date"
                minTickGap={24}
                stroke="var(--gridline)"
                tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
              />
              <YAxis
                stroke="var(--gridline)"
                tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
                width={64}
              />
              <Tooltip
                cursor={{ stroke: 'var(--ink-muted)', strokeDasharray: '3 3' }}
                contentStyle={{
                  background: 'var(--surface-card-solid)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '0.75rem',
                  padding: '0.6rem 0.85rem',
                }}
                labelStyle={{ color: 'var(--ink-secondary)', marginBottom: 4, fontSize: '0.8rem' }}
                itemStyle={{ color: 'var(--ink-primary)', fontWeight: 600 }}
                formatter={(value: number) => [
                  value.toLocaleString('pt-BR', { maximumFractionDigits: 4 }),
                  'Valor',
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: 'var(--surface-card-solid)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {[...indicator.observations].reverse().map((item) => (
                <tr key={item.referenceDate}>
                  <td>{formatDate(item.referenceDate)}</td>
                  <td>{formatValue(item.value, indicator.periodicity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="limitations card">
        <h2>Limitações dos dados</h2>
        <p>{indicator.dataLimitations}</p>
      </div>
    </section>
  );
}
