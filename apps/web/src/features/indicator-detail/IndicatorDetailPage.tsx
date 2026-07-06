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
import {
  formatDate,
  formatPercent,
  formatSourceLabel,
  formatValue,
  formatValueWithUnit,
  variationClassName,
} from '../../shared/lib/format.js';
import { ValueWithUnit } from '../../shared/components/ValueWithUnit.js';

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

  // Financial time series are read as relative movement, not distance from
  // zero (an FX rate or interest rate of "0" isn't a meaningful reference).
  // Zoom the axis to the data's own range instead of forcing a zero baseline,
  // the same convention used by market-data charts (Bloomberg, TradingView).
  const yDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) {
      return [0, 1];
    }
    const values = chartData.map((item) => item.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const padding = (dataMax - dataMin) * 0.12 || Math.abs(dataMax) * 0.05 || 1;
    return [dataMin - padding, dataMax + padding];
  }, [chartData]);

  if (detailQuery.isLoading) {
    return <div className="state-panel">Carregando detalhe do indicador...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <div className="state-panel state-error">Indicador não encontrado ou indisponível.</div>;
  }

  const indicator = detailQuery.data;
  const valueUnitHint = indicator.valuePrefix ?? indicator.valueSuffix;
  const valueColumnLabel = valueUnitHint ? `Valor (${valueUnitHint})` : 'Valor';

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">{formatSourceLabel(indicator.source)}</p>
          <h1>{indicator.name}</h1>
          <p className="page-subtitle">{indicator.description}</p>
        </div>
      </header>

      <div className="detail-summary card">
        <div>
          <span className="metric-label">Último valor</span>
          <ValueWithUnit
            className="metric-value large"
            value={indicator.latestValue}
            periodicity={indicator.periodicity}
            prefix={indicator.valuePrefix}
            suffix={indicator.valueSuffix}
          />
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
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
                domain={yDomain}
                tickFormatter={(value: number) =>
                  value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                }
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
                  formatValueWithUnit(value, indicator.periodicity, indicator.valuePrefix, indicator.valueSuffix),
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
                <th>{valueColumnLabel}</th>
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
