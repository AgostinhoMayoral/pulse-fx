import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { IndicatorSummaryDto } from '@pulse-fx/shared';
import { api } from '../../shared/api/client.js';
import { formatDateTime } from '../../shared/lib/format.js';
import { IndicatorCard } from './IndicatorCard.js';

// The flagship pair (USD/BRL) is what most readers open the app for, so it
// leads its section; anything not listed here falls back to name order
// instead of disappearing, in case a new indicator is added later.
const FX_PRIORITY = ['USD_BRL_PTAX', 'EUR_BRL_PTAX'];
const MACRO_PRIORITY = ['SELIC_META', 'IPCA', 'FEDFUNDS', 'CPI_US'];

function byPriority(order: string[]) {
  return (a: IndicatorSummaryDto, b: IndicatorSummaryDto) => {
    const indexA = order.indexOf(a.code);
    const indexB = order.indexOf(b.code);
    if (indexA === -1 && indexB === -1) {
      return a.name.localeCompare(b.name);
    }
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  };
}

function latestSyncTimestamp(indicators: Array<{ lastSyncedAt: string | null }>): string | null {
  const timestamps = indicators
    .map((item) => item.lastSyncedAt)
    .filter((value): value is string => value !== null);

  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const indicatorsQuery = useQuery({
    queryKey: ['indicators'],
    queryFn: api.listIndicators,
    staleTime: 60_000,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({
      indicatorId,
      isFavorite,
    }: {
      indicatorId: string;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        await api.removeFavorite(indicatorId);
      } else {
        await api.addFavorite(indicatorId);
      }
    },
    onMutate: () => {
      setFavoriteError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['indicators'] });
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: () => {
      setFavoriteError('Não foi possível atualizar o favorito. Tente novamente.');
    },
  });

  const lastSyncedAt = useMemo(
    () => (indicatorsQuery.data ? latestSyncTimestamp(indicatorsQuery.data) : null),
    [indicatorsQuery.data],
  );

  const fxIndicators = useMemo(
    () =>
      (indicatorsQuery.data ?? [])
        .filter((indicator) => indicator.periodicity === 'DAILY')
        .sort(byPriority(FX_PRIORITY)),
    [indicatorsQuery.data],
  );

  const macroIndicators = useMemo(
    () =>
      (indicatorsQuery.data ?? [])
        .filter((indicator) => indicator.periodicity === 'MONTHLY')
        .sort(byPriority(MACRO_PRIORITY)),
    [indicatorsQuery.data],
  );

  if (indicatorsQuery.isLoading) {
    return <div className="state-panel">Carregando indicadores...</div>;
  }

  if (indicatorsQuery.isError) {
    return (
      <div className="state-panel state-error">
        Não foi possível carregar os indicadores. Verifique se a API está disponível.
      </div>
    );
  }

  if (!indicatorsQuery.data?.length) {
    return (
      <div className="state-panel">
        <p>Nenhum indicador cadastrado no banco.</p>
        <p className="state-hint">
          Com Docker, o sync inicial roda automaticamente na subida da API. Em desenvolvimento
          local, execute <code>POST /admin/sync</code> ou defina <code>RUN_INITIAL_SYNC=true</code>.
        </p>
      </div>
    );
  }

  const hasPersistedValues = indicatorsQuery.data.some((indicator) => indicator.latestValue !== null);

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Indicadores em tempo persistido</h1>
          <p className="page-subtitle">
            Valores exibidos vêm do PostgreSQL, sincronizados periodicamente com BCB e FRED.
          </p>
          {lastSyncedAt ? (
            <p className="sync-meta">Última sincronização: {formatDateTime(lastSyncedAt)}</p>
          ) : null}
          {!hasPersistedValues ? (
            <p className="state-hint">
              Indicadores cadastrados, mas ainda sem observações. Aguarde o sync inicial ou dispare
              manualmente <code>POST /admin/sync</code>.
            </p>
          ) : null}
          {favoriteError ? <p className="inline-error">{favoriteError}</p> : null}
        </div>
      </header>

      {fxIndicators.length > 0 ? (
        <div className="dashboard-section">
          <h2 className="section-title">Câmbio</h2>
          <div className="cards-grid">
            {fxIndicators.map((indicator) => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                isUpdating={favoriteMutation.isPending}
                onToggleFavorite={(indicatorId, isFavorite) =>
                  favoriteMutation.mutate({ indicatorId, isFavorite })
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {macroIndicators.length > 0 ? (
        <div className="dashboard-section">
          <h2 className="section-title">Indicadores macroeconômicos</h2>
          <div className="cards-grid">
            {macroIndicators.map((indicator) => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                isUpdating={favoriteMutation.isPending}
                onToggleFavorite={(indicatorId, isFavorite) =>
                  favoriteMutation.mutate({ indicatorId, isFavorite })
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
