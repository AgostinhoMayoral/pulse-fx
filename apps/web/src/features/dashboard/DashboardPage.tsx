import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client.js';
import { IndicatorCard } from './IndicatorCard.js';

export function DashboardPage() {
  const queryClient = useQueryClient();
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['indicators'] });
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

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
        Nenhum indicador disponível. Execute a sincronização administrativa para popular o banco.
      </div>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Indicadores em tempo persistido</h1>
          <p className="page-subtitle">
            Valores exibidos vêm do PostgreSQL, sincronizados periodicamente com BCB e FRED.
          </p>
        </div>
      </header>

      <div className="cards-grid">
        {indicatorsQuery.data.map((indicator) => (
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
    </section>
  );
}
