import { useState, type FormEvent } from 'react';
import { NavLink, Outlet } from 'react-router';

import { useAuth } from '../auth';
import { ENV_LABEL, supabase } from '../supabase';

export function Layout() {
  const { loading, session, canEditRecipes, isAdmin, roles, signOut } = useAuth();

  if (loading) return <div className="center muted">Carregando…</div>;
  if (!session) return <LoginForm />;
  if (!canEditRecipes) {
    return (
      <div className="center">
        <div className="card narrow">
          <h1>Sem permissão</h1>
          <p className="muted">
            Esta conta não faz parte da equipe do Diário da Lancheira. O acesso ao painel é concedido somente por um
            administrador.
          </p>
          <button className="btn" onClick={signOut}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo-placeholder">Diário da Lancheira</span>
          <span className="muted">Painel</span>
          {ENV_LABEL ? <span className="env">{ENV_LABEL}</span> : null}
        </div>
        <nav>
          <NavLink to="/receitas">Receitas</NavLink>
          <NavLink to="/categorias">Categorias</NavLink>
          {isAdmin ? <NavLink to="/acessos">Acessos de teste</NavLink> : null}
        </nav>
        <div className="user">
          <span className="muted small">
            {session.user.email} · {roles.join(', ')}
          </span>
          <button className="btn ghost" onClick={signOut}>
            Sair
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.code === 'invalid_credentials' ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar.');
  }

  return (
    <div className="center">
      <form className="card narrow" onSubmit={submit}>
        <span className="logo-placeholder">Diário da Lancheira</span>
        <h1>Painel da equipe</h1>
        {ENV_LABEL ? <p className="env">{ENV_LABEL}</p> : null}
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
