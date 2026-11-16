import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '../auth';
import { supabase } from '../supabase';
import { dbMessage } from '../validation';

interface Grant {
  id: string;
  email: string;
  tipo: 'teste' | 'assinatura';
  valido_ate: string;
  revogado_em: string | null;
  motivo: string | null;
  criado_em: string;
}

/**
 * Acessos de TESTE ao conteúdo do Clube (somente administradores).
 * Não é assinatura, não é cobrança e não é comprovante de pagamento.
 */
export function AccessPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Grant[]>([]);
  const [email, setEmail] = useState('');
  const [dias, setDias] = useState('7');
  const [motivo, setMotivo] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    supabase.rpc('admin_listar_acessos').then(({ data, error }) => {
      if (error) setMessage({ kind: 'error', text: dbMessage(error) });
      else setRows(data as Grant[]);
    });
  }, []);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) return <p className="error">Somente administradores.</p>;

  async function grant(e: FormEvent) {
    e.preventDefault();
    const n = Number(dias);
    if (!Number.isInteger(n) || n < 1 || n > 90) {
      setMessage({ kind: 'error', text: 'O prazo deve ser de 1 a 90 dias.' });
      return;
    }
    const { error } = await supabase.rpc('admin_conceder_acesso_teste', {
      p_email: email.trim(),
      p_dias: n,
      p_motivo: motivo.trim(),
    });
    if (error) setMessage({ kind: 'error', text: dbMessage(error) });
    else {
      setEmail('');
      setMotivo('');
      setMessage({ kind: 'ok', text: 'Acesso de teste concedido.' });
      load();
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('Revogar este acesso agora?')) return;
    const { error } = await supabase.rpc('admin_revogar_acesso', { p_id: id });
    if (error) setMessage({ kind: 'error', text: dbMessage(error) });
    else load();
  }

  const now = Date.now();
  return (
    <section>
      <h1>Acessos de teste</h1>
      <p className="notice">
        Libera o conteúdo exclusivo para uma conta durante testes. <strong>Não é assinatura</strong>, não gera cobrança e não
        serve como comprovante de pagamento. Toda concessão e revogação fica registrada na auditoria.
      </p>
      {message ? <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p> : null}
      <form className="card row gap wrap" onSubmit={grant}>
        <input type="email" required placeholder="E-mail da conta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="qty" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} aria-label="Dias" />
        <span className="muted">dias</span>
        <input className="grow" placeholder="Motivo (ex.: homologação)" maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <button className="btn primary">Conceder</button>
      </form>
      <table>
        <tbody>
          {rows.map((g) => {
            const active = !g.revogado_em && new Date(g.valido_ate).getTime() > now;
            return (
              <tr key={g.id}>
                <td>{g.email}</td>
                <td>
                  <span className={`pill ${active ? 'publicada' : 'despublicada'}`}>
                    {g.revogado_em ? 'Revogado' : active ? 'Ativo' : 'Expirado'}
                  </span>
                </td>
                <td className="muted small">{g.tipo === 'teste' ? 'Teste' : 'Assinatura'}</td>
                <td className="muted small">até {new Date(g.valido_ate).toLocaleDateString('pt-BR')}</td>
                <td className="muted small">{g.motivo}</td>
                <td>{active ? <button className="btn ghost" onClick={() => revoke(g.id)}>Revogar</button> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
