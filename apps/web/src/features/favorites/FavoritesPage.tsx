import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client.js';
import { formatSourceLabel } from '../../shared/lib/format.js';

export function FavoritesPage() {
  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: api.listFavorites,
  });

  if (favoritesQuery.isLoading) {
    return <div className="state-panel">Carregando favoritos...</div>;
  }

  if (favoritesQuery.isError) {
    return <div className="state-panel state-error">Não foi possível carregar seus favoritos.</div>;
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Meus indicadores</p>
          <h1>Favoritos persistidos no backend</h1>
          <p className="page-subtitle">
            Seus favoritos ficam associados a um identificador anônimo de cliente (`client_id`).
          </p>
        </div>
      </header>

      {!favoritesQuery.data?.length ? (
        <div className="state-panel">
          Você ainda não marcou indicadores. Volte ao dashboard e use a estrela nos cards.
        </div>
      ) : (
        <div className="favorites-list">
          {favoritesQuery.data.map((favorite) => (
            <article key={favorite.id} className="card favorite-item">
              <div>
                <p className="eyebrow">{formatSourceLabel(favorite.source)}</p>
                <h2>{favorite.name}</h2>
                <p className="card-description">Código: {favorite.code}</p>
              </div>
              <Link to={`/indicators/${favorite.code}`} className="card-link">
                Abrir detalhe <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
