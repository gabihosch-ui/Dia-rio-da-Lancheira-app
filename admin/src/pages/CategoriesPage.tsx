import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { supabase } from '../supabase';
import { dbMessage, slugify } from '../validation';

interface Category {
  id: string;
  nome: string;
  slug: string;
  emoji: string | null;
  ordem: number;
  ativa: boolean;
}

/** Categorias administráveis pelo banco (sem depender do código do app). */
export function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [nome, setNome] = useState('');
  const [emoji, setEmoji] = useState('');

  const load = useCallback(() => {
    supabase
      .from('categorias_receita')
      .select('id, nome, slug, emoji, ordem, ativa')
      .order('ordem')
      .then(({ data, error }) => {
        if (error) setMessage({ kind: 'error', text: 'Não foi possível carregar as categorias.' });
        else setRows(data as Category[]);
      });
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (n.length < 2 || n.length > 40) {
      setMessage({ kind: 'error', text: 'O nome deve ter de 2 a 40 caracteres.' });
      return;
    }
    const { error } = await supabase.from('categorias_receita').insert({
      nome: n,
      slug: slugify(n).slice(0, 40),
      emoji: emoji.trim() || null,
      ordem: (rows.at(-1)?.ordem ?? 0) + 1,
    });
    if (error) setMessage({ kind: 'error', text: error.code === '23505' ? 'Já existe uma categoria com este nome.' : dbMessage(error) });
    else {
      setNome('');
      setEmoji('');
      setMessage({ kind: 'ok', text: 'Categoria criada.' });
      load();
    }
  }

  async function update(c: Category, patch: Partial<Category>) {
    const { error } = await supabase.from('categorias_receita').update(patch).eq('id', c.id);
    if (error) setMessage({ kind: 'error', text: dbMessage(error) });
    else load();
  }

  async function swap(a: Category, b: Category | undefined) {
    if (!b) return;
    await update(a, { ordem: b.ordem });
    await update(b, { ordem: a.ordem });
  }

  return (
    <section>
      <h1>Categorias</h1>
      <p className="muted">Categorias inativas somem do app, mas continuam ligadas às receitas.</p>
      {message ? <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p> : null}
      <table>
        <tbody>
          {rows.map((c, idx) => (
            <tr key={c.id}>
              <td>
                <input
                  defaultValue={c.emoji ?? ''}
                  className="emoji"
                  maxLength={8}
                  onBlur={(e) => e.target.value !== (c.emoji ?? '') && update(c, { emoji: e.target.value || null })}
                />
              </td>
              <td>
                <input
                  defaultValue={c.nome}
                  maxLength={40}
                  onBlur={(e) => e.target.value.trim() !== c.nome && update(c, { nome: e.target.value.trim() })}
                />
              </td>
              <td>
                <label className="check">
                  <input type="checkbox" checked={c.ativa} onChange={(e) => update(c, { ativa: e.target.checked })} />
                  Ativa
                </label>
              </td>
              <td className="row-actions">
                <button aria-label="Subir" onClick={() => swap(c, rows[idx - 1])}>
                  ↑
                </button>
                <button aria-label="Descer" onClick={() => swap(c, rows[idx + 1])}>
                  ↓
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="card row gap" onSubmit={add}>
        <input className="emoji" placeholder="🙂" value={emoji} maxLength={8} onChange={(e) => setEmoji(e.target.value)} />
        <input className="grow" placeholder="Nova categoria" value={nome} onChange={(e) => setNome(e.target.value)} />
        <button className="btn primary">Adicionar</button>
      </form>
    </section>
  );
}
