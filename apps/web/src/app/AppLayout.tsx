import { NavLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logo-icon.png" alt="Pulse FX" className="brand-mark" />
          <div>
            <strong>Pulse FX</strong>
            <p>Macro & FX monitor</p>
          </div>
        </div>
        <nav className="main-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/favorites">Meus indicadores</NavLink>
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="disclaimer">
        <strong>Aviso educacional:</strong> as informações exibidas no Pulse FX têm caráter
        educacional e informativo. Não constituem recomendação de investimento, consultoria
        financeira ou solicitação de operações.
      </footer>
    </div>
  );
}
