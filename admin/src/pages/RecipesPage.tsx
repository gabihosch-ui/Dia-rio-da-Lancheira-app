import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { supabase } from '../supabase';

interface Row {
  id: string;
  titulo: string;
  status: 'rascunho' | 'publicada' | 'despublicada';
  exclusiva: boolean;
  destaque: boolean;
  atualizado_em: string;
}

const STATUS_LABEL: Record<Row['status'], string> = {
  rascunho: 'Rascunho',
  publicada: 'Publicada',
  despublicada: 'Despublicada',
};

export function RecipesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'todas' | Row['status']>('todas');
  const [text, setText] = useState('');

  useEffect(() => {
    let q = supabase
      .from('receitas')
      .select('id, titulo, status, exclusiva, destaque, atualizado_em')
      .order('atualizado_em', { ascending: false })
      .limit(500);
    if (status !== 'todas') q = q.eq('status', status);
    q.then(({ data, error: err }) => {
      if (err) setError('Não foi possível carregar as receitas.');
      else setRows(data as Row[]);
    });
  }, [status]);

  const filtered = (rows ?? []).filter((r) => r.titulo.toLowerCase().includes(text.trim().toLowerCase()));

  return (
    <section>
      <div className="row between">
        <h1>Receitas</h1>
        <Link className="btn primary" to="/receitas/nova">
          + Nova receita
        </Link>
      </div>
      <div className="row gap">
        <input placeholder="Buscar pelo título" value={text} onChange={(e) => setText(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="todas">Todos os status</option>
          <option value="rascunho">Rascunhos</option>
          <option value="publicada">Publicadas</option>
          <option value="despublicada">Despublicadas</option>
        </select>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {!rows && !error ? <p className="muted">Carregando…</p> : null}
      {rows && filtered.length === 0 ? <p className="muted">Nenhuma receita encontrada.</p> : null}
      <table>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td>
                <Link to={`/receitas/${r.id}`}>{r.titulo}</Link>
              </td>
              <td>
                <span className={`pill ${r.status}`}>{STATUS_LABEL[r.status]}</span>
              </td>
              <td className="muted small">{r.exclusiva ? 'Clube' : 'Amostra grátis'}</td>
              <td className="muted small">{r.destaque ? '★ Destaque' : ''}</td>
              <td className="muted small">{new Date(r.atualizado_em).toLocaleString('pt-BR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
