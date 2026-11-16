import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useAuth } from '../auth';
import { ACCEPTED_TYPES, prepareCover } from '../image';
import { coverPublicUrl, supabase } from '../supabase';
import {
  dbMessage,
  emptyForm,
  fromServer,
  move,
  slugify,
  toPayload,
  validateRecipe,
  type FormErrors,
  type IngredientForm,
  type RecipeForm,
} from '../validation';

interface Category {
  id: string;
  nome: string;
  emoji: string | null;
  ativa: boolean;
}
interface UnitRow {
  id: string;
  singular: string;
  abreviacao: string;
}
type Status = 'rascunho' | 'publicada' | 'despublicada';

export function RecipeEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [form, setForm] = useState<RecipeForm | null>(id ? null : emptyForm());
  const [status, setStatus] = useState<Status>('rascunho');
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categorias_receita')
      .select('id, nome, emoji, ativa')
      .order('ordem')
      .then(({ data }) => setCategories((data ?? []) as Category[]));
    supabase
      .from('unidades')
      .select('id, singular, abreviacao')
      .order('ordem')
      .then(({ data }) => setUnits((data ?? []) as UnitRow[]));
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase.rpc('admin_obter_receita', { p_id: id }).then(({ data, error }) => {
      if (error || !data) {
        setLoadError(dbMessage(error));
        return;
      }
      setForm(fromServer(data as Record<string, unknown>));
      setStatus((data as { status: Status }).status);
    });
  }, [id]);

  if (loadError) return <p className="error">{loadError}</p>;
  if (!form) return <p className="muted">Carregando…</p>;
  const f = form;
  const set = (patch: Partial<RecipeForm>) => setForm({ ...f, ...patch });
  const setIng = (idx: number, patch: Partial<IngredientForm>) =>
    set({ ingredientes: f.ingredientes.map((i, k) => (k === idx ? { ...i, ...patch } : i)) });

  async function save(): Promise<string | null> {
    const e = validateRecipe(f, status === 'publicada');
    setErrors(e);
    if (Object.keys(e).length) {
      setMessage({ kind: 'error', text: 'Revise os campos destacados.' });
      return null;
    }
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase.rpc('admin_salvar_receita', { p: toPayload(f) });
    setBusy(false);
    if (error) {
      setMessage({ kind: 'error', text: dbMessage(error) });
      return null;
    }
    const newId = data as string;
    setMessage({ kind: 'ok', text: 'Receita salva.' });
    if (!f.id) {
      setForm({ ...f, id: newId, slug: f.slug || slugify(f.titulo) });
      navigate(`/receitas/${newId}`, { replace: true });
    }
    return newId;
  }

  async function changeStatus(next: Status) {
    if (next === 'publicada') {
      const e = validateRecipe(f, true);
      setErrors(e);
      if (Object.keys(e).length) {
        setMessage({ kind: 'error', text: 'Para publicar, complete os campos destacados.' });
        return;
      }
    }
    const savedId = await save();
    if (!savedId) return;
    setBusy(true);
    const { error } = await supabase.rpc('admin_definir_status_receita', { p_id: savedId, p_status: next });
    setBusy(false);
    if (error) setMessage({ kind: 'error', text: dbMessage(error) });
    else {
      setStatus(next);
      setMessage({ kind: 'ok', text: next === 'publicada' ? 'Receita publicada no app.' : 'Receita retirada do app.' });
    }
  }

  async function remove() {
    if (!f.id || !window.confirm('Excluir esta receita definitivamente? Favoritos ligados a ela também serão apagados.')) return;
    setBusy(true);
    const { error } = await supabase.rpc('admin_excluir_receita', { p_id: f.id });
    setBusy(false);
    if (error) setMessage({ kind: 'error', text: dbMessage(error) });
    else navigate('/receitas');
  }

  async function uploadCover(file: File) {
    if (!f.id) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await prepareCover(file);
      const path = `capas/${f.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('receitas').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw new Error('Não foi possível enviar a foto.');
      const old = f.capa_path;
      const next = { ...f, capa_path: path };
      setForm(next);
      const saved = await supabase.rpc('admin_salvar_receita', { p: toPayload(next) });
      if (saved.error) throw new Error(dbMessage(saved.error));
      if (old) await supabase.storage.from('receitas').remove([old]);
      setMessage({ kind: 'ok', text: 'Foto atualizada.' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Falha ao enviar a foto.' });
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => (errors[k] ? <span className="field-error">{errors[k]}</span> : null);
  const cover = coverPublicUrl(f.capa_path);

  return (
    <section className="editor">
      <div className="row between">
        <h1>{f.id ? 'Editar receita' : 'Nova receita'}</h1>
        <span className={`pill ${status}`}>
          {status === 'publicada' ? 'Publicada' : status === 'despublicada' ? 'Despublicada' : 'Rascunho'}
        </span>
      </div>
      {message ? <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p> : null}

      <div className="card">
        <h2>Dados principais</h2>
        <label>
          Título *
          <input value={f.titulo} maxLength={120} onChange={(e) => set({ titulo: e.target.value })} />
          {err('titulo')}
        </label>
        <label>
          Endereço (slug)
          <input
            value={f.slug}
            placeholder={slugify(f.titulo) || 'gerado a partir do título'}
            onChange={(e) => set({ slug: e.target.value })}
          />
          {err('slug')}
        </label>
        <label>
          Descrição curta
          <textarea rows={3} maxLength={600} value={f.descricao} onChange={(e) => set({ descricao: e.target.value })} />
          {err('descricao')}
        </label>
        <div className="grid3">
          <label>
            Preparo (min) *
            <input inputMode="numeric" value={f.tempo_preparo_min} onChange={(e) => set({ tempo_preparo_min: e.target.value })} />
            {err('tempo_preparo_min')}
          </label>
          <label>
            Forno/fogo (min)
            <input
              inputMode="numeric"
              value={f.tempo_cozimento_min}
              onChange={(e) => set({ tempo_cozimento_min: e.target.value })}
            />
            {err('tempo_cozimento_min')}
          </label>
          <label>
            Rendimento
            <input
              value={f.rendimento}
              maxLength={60}
              placeholder="ex.: 12 unidades"
              onChange={(e) => set({ rendimento: e.target.value })}
            />
            {err('rendimento')}
          </label>
        </div>
        <div className="row gap wrap">
          <label className="check">
            <input type="checkbox" checked={f.exclusiva} onChange={(e) => set({ exclusiva: e.target.checked })} />
            Exclusiva do Clube (desmarque para amostra grátis)
          </label>
          <label className="check">
            <input type="checkbox" checked={f.destaque} onChange={(e) => set({ destaque: e.target.checked })} />
            Destaque no app
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Foto de capa</h2>
        {cover ? <img className="cover" src={cover} alt="Capa da receita" /> : <p className="muted">Sem foto.</p>}
        {f.id ? (
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadCover(file);
              e.target.value = '';
            }}
          />
        ) : (
          <p className="muted small">Salve a receita uma vez para poder enviar a foto.</p>
        )}
        <p className="muted small">JPEG, PNG ou WebP. A imagem é reduzida e os metadados (como localização) são removidos.</p>
      </div>

      <div className="card">
        <h2>Categorias</h2>
        <div className="row gap wrap">
          {categories.map((c) => (
            <label key={c.id} className={`chip ${f.categorias.includes(c.id) ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={f.categorias.includes(c.id)}
                onChange={(e) =>
                  set({
                    categorias: e.target.checked ? [...f.categorias, c.id] : f.categorias.filter((x) => x !== c.id),
                  })
                }
              />
              {c.emoji} {c.nome}
              {!c.ativa ? ' (inativa)' : ''}
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Ingredientes</h2>
        {err('ingredientes')}
        {f.ingredientes.map((i, idx) => (
          <div key={idx} className="list-row">
            <input
              className="qty"
              placeholder="Qtd."
              value={i.quantidade}
              onChange={(e) => setIng(idx, { quantidade: e.target.value })}
            />
            <select value={i.unidade_id} onChange={(e) => setIng(idx, { unidade_id: e.target.value })}>
              <option value="">—</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.singular}
                </option>
              ))}
            </select>
            <input
              className="grow"
              placeholder="Ingrediente (ex.: farinha de aveia)"
              value={i.nome}
              maxLength={120}
              onChange={(e) => setIng(idx, { nome: e.target.value })}
            />
            <input
              placeholder="Observação (opcional)"
              value={i.observacao}
              maxLength={120}
              onChange={(e) => setIng(idx, { observacao: e.target.value })}
            />
            <RowActions
              onUp={() => set({ ingredientes: move(f.ingredientes, idx, -1) })}
              onDown={() => set({ ingredientes: move(f.ingredientes, idx, 1) })}
              onRemove={() => set({ ingredientes: f.ingredientes.filter((_, k) => k !== idx) })}
            />
            {err(`ingrediente.${idx}`)}
          </div>
        ))}
        <button
          className="btn ghost"
          onClick={() => set({ ingredientes: [...f.ingredientes, { nome: '', quantidade: '', unidade_id: '', observacao: '' }] })}>
          + Ingrediente
        </button>
      </div>

      <div className="card">
        <h2>Modo de preparo</h2>
        {err('passos')}
        {f.passos.map((p, idx) => (
          <div key={idx} className="list-row">
            <span className="step-num">{idx + 1}</span>
            <textarea
              className="grow"
              rows={2}
              maxLength={1000}
              value={p}
              onChange={(e) => set({ passos: f.passos.map((x, k) => (k === idx ? e.target.value : x)) })}
            />
            {err(`passo.${idx}`)}
            <RowActions
              onUp={() => set({ passos: move(f.passos, idx, -1) })}
              onDown={() => set({ passos: move(f.passos, idx, 1) })}
              onRemove={() => set({ passos: f.passos.filter((_, k) => k !== idx) })}
            />
          </div>
        ))}
        <button className="btn ghost" onClick={() => set({ passos: [...f.passos, ''] })}>
          + Etapa
        </button>
      </div>

      <div className="card">
        <h2>Congelamento</h2>
        <label className="check">
          <input type="checkbox" checked={f.pode_congelar} onChange={(e) => set({ pode_congelar: e.target.checked })} />
          Esta receita pode ser congelada
        </label>
        {f.pode_congelar ? (
          <>
            <p className="muted small">Informações de conservação definidas e revisadas pela equipe.</p>
            <label>
              Prazo no congelador (dias) *
              <input
                inputMode="numeric"
                value={f.congelamento.prazo_dias}
                onChange={(e) => set({ congelamento: { ...f.congelamento, prazo_dias: e.target.value } })}
              />
            </label>
            <label>
              Como embalar
              <textarea
                rows={2}
                maxLength={600}
                value={f.congelamento.como_embalar}
                onChange={(e) => set({ congelamento: { ...f.congelamento, como_embalar: e.target.value } })}
              />
            </label>
            <label>
              Como descongelar
              <textarea
                rows={2}
                maxLength={600}
                value={f.congelamento.como_descongelar}
                onChange={(e) => set({ congelamento: { ...f.congelamento, como_descongelar: e.target.value } })}
              />
            </label>
            {err('congelamento')}
          </>
        ) : null}
      </div>

      <div className="card">
        <h2>Vídeo (Cloudflare Stream)</h2>
        <p className="muted small">
          Cole o identificador do vídeo no Cloudflare Stream (configurado com “Require signed URLs”). O identificador nunca é
          enviado ao app: o app recebe só um endereço temporário depois que o servidor confere o acesso.
        </p>
        <div className="grid3">
          <label>
            ID do vídeo
            <input
              value={f.video.provider_video_id}
              onChange={(e) => set({ video: { ...f.video, provider_video_id: e.target.value } })}
            />
          </label>
          <label>
            Situação
            <select
              value={f.video.status}
              onChange={(e) => set({ video: { ...f.video, status: e.target.value as RecipeForm['video']['status'] } })}>
              <option value="pendente">Pendente</option>
              <option value="pronto">Pronto para assistir</option>
              <option value="erro">Com erro</option>
            </select>
          </label>
          <label>
            Duração (segundos)
            <input
              inputMode="numeric"
              value={f.video.duracao_segundos}
              onChange={(e) => set({ video: { ...f.video, duracao_segundos: e.target.value } })}
            />
          </label>
        </div>
        {err('video')}
      </div>

      <div className="actions">
        <button className="btn" disabled={busy} onClick={() => void save()}>
          {status === 'publicada' ? 'Salvar alterações' : 'Salvar rascunho'}
        </button>
        {status !== 'publicada' ? (
          <button className="btn primary" disabled={busy} onClick={() => void changeStatus('publicada')}>
            Publicar
          </button>
        ) : (
          <button className="btn" disabled={busy} onClick={() => void changeStatus('despublicada')}>
            Despublicar
          </button>
        )}
        {isAdmin && f.id ? (
          <button className="btn danger" disabled={busy} onClick={() => void remove()}>
            Excluir
          </button>
        ) : null}
      </div>
    </section>
  );
}

function RowActions({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <span className="row-actions">
      <button type="button" title="Subir" aria-label="Subir" onClick={onUp}>
        ↑
      </button>
      <button type="button" title="Descer" aria-label="Descer" onClick={onDown}>
        ↓
      </button>
      <button type="button" title="Remover" aria-label="Remover" onClick={onRemove}>
        ✕
      </button>
    </span>
  );
}
