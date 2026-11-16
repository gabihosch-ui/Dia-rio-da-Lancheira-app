/**
 * Formulário de receita do painel: validação (espelha as restrições do banco)
 * e conversão para o formato aceito por admin_salvar_receita.
 * O banco valida de novo — esta camada só dá respostas rápidas e claras.
 */

export interface IngredientForm {
  nome: string;
  quantidade: string;
  unidade_id: string;
  observacao: string;
}

export interface RecipeForm {
  id: string | null;
  titulo: string;
  slug: string;
  descricao: string;
  capa_path: string | null;
  tempo_preparo_min: string;
  tempo_cozimento_min: string;
  rendimento: string;
  pode_congelar: boolean;
  exclusiva: boolean;
  destaque: boolean;
  categorias: string[];
  ingredientes: IngredientForm[];
  passos: string[];
  congelamento: { prazo_dias: string; como_embalar: string; como_descongelar: string };
  video: { provider_video_id: string; status: 'pendente' | 'pronto' | 'erro'; duracao_segundos: string };
}

export const LIMITS = {
  titulo: [3, 120],
  descricao: 600,
  rendimento: 60,
  minutos: 1440,
  ingredienteNome: 120,
  observacao: 120,
  passo: 1000,
  ingredientes: 60,
  passos: 40,
  congelamentoDias: [1, 365],
  texto: 600,
} as const;

export function emptyForm(): RecipeForm {
  return {
    id: null,
    titulo: '',
    slug: '',
    descricao: '',
    capa_path: null,
    tempo_preparo_min: '',
    tempo_cozimento_min: '0',
    rendimento: '',
    pode_congelar: false,
    exclusiva: true,
    destaque: false,
    categorias: [],
    ingredientes: [{ nome: '', quantidade: '', unidade_id: '', observacao: '' }],
    passos: [''],
    congelamento: { prazo_dias: '', como_embalar: '', como_descongelar: '' },
    video: { provider_video_id: '', status: 'pendente', duracao_segundos: '' },
  };
}

/** Aceita "1,5", "1.5", "1/2" e "1 1/2". */
export function parseQuantity(raw: string): number | null | 'invalid' {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(t);
  if (frac) return Number(frac[2]) === 0 ? 'invalid' : Number(frac[1]) / Number(frac[2]);
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 'invalid';
}

function parseInt0(raw: string): number | 'invalid' {
  const t = raw.trim();
  if (!/^\d{1,4}$/.test(t)) return 'invalid';
  return Number(t);
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export type FormErrors = Record<string, string>;

export function validateRecipe(f: RecipeForm, forPublishing = false): FormErrors {
  const e: FormErrors = {};
  const titulo = f.titulo.trim();
  if (titulo.length < LIMITS.titulo[0] || titulo.length > LIMITS.titulo[1]) e.titulo = 'O título deve ter de 3 a 120 caracteres.';
  const slug = f.slug.trim() || slugify(titulo);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) e.slug = 'Use apenas letras minúsculas, números e hífens.';
  if (f.descricao.length > LIMITS.descricao) e.descricao = 'Descrição muito longa (máx. 600).';
  const prep = parseInt0(f.tempo_preparo_min);
  if (prep === 'invalid' || prep > LIMITS.minutos) e.tempo_preparo_min = 'Informe os minutos (0 a 1440).';
  const cook = parseInt0(f.tempo_cozimento_min || '0');
  if (cook === 'invalid' || cook > LIMITS.minutos) e.tempo_cozimento_min = 'Informe os minutos (0 a 1440).';
  if (f.rendimento.length > LIMITS.rendimento) e.rendimento = 'Máximo de 60 caracteres.';

  const ingredientes = f.ingredientes.filter((i) => i.nome.trim() || i.quantidade.trim());
  if (ingredientes.length > LIMITS.ingredientes) e.ingredientes = 'Máximo de 60 ingredientes.';
  f.ingredientes.forEach((i, idx) => {
    if (!i.nome.trim() && !i.quantidade.trim()) return; // linha vazia é ignorada
    if (!i.nome.trim()) e[`ingrediente.${idx}`] = 'Informe o nome do ingrediente.';
    else if (i.nome.trim().length > LIMITS.ingredienteNome) e[`ingrediente.${idx}`] = 'Nome muito longo.';
    const q = parseQuantity(i.quantidade);
    if (q === 'invalid') e[`ingrediente.${idx}`] = 'Quantidade inválida (ex.: 2, 1,5 ou 1/2).';
    else if (q === null && i.unidade_id) e[`ingrediente.${idx}`] = 'Informe a quantidade para usar uma unidade.';
    if (i.observacao.length > LIMITS.observacao) e[`ingrediente.${idx}`] = 'Observação muito longa.';
  });

  const passos = f.passos.filter((p) => p.trim());
  if (passos.length > LIMITS.passos) e.passos = 'Máximo de 40 etapas.';
  f.passos.forEach((p, idx) => {
    if (p.trim().length > LIMITS.passo) e[`passo.${idx}`] = 'Etapa muito longa (máx. 1000).';
  });

  if (f.pode_congelar) {
    const d = parseInt0(f.congelamento.prazo_dias);
    if (d === 'invalid' || d < LIMITS.congelamentoDias[0] || d > LIMITS.congelamentoDias[1]) {
      e.congelamento = 'Informe o prazo de congelamento definido pela equipe (1 a 365 dias).';
    }
    if (f.congelamento.como_embalar.length > LIMITS.texto || f.congelamento.como_descongelar.length > LIMITS.texto) {
      e.congelamento = 'Texto de congelamento muito longo (máx. 600).';
    }
  }

  const vid = f.video.provider_video_id.trim();
  if (vid && !/^[A-Za-z0-9]{8,64}$/.test(vid)) e.video = 'ID do vídeo inválido (só letras e números, 8 a 64).';
  if (f.video.duracao_segundos.trim() && parseInt0(f.video.duracao_segundos) === 'invalid') {
    e.video = 'Duração em segundos inválida.';
  }

  if (forPublishing) {
    if (ingredientes.length === 0) e.ingredientes = 'Para publicar, cadastre ao menos um ingrediente.';
    if (passos.length === 0) e.passos = 'Para publicar, cadastre ao menos uma etapa.';
  }
  return e;
}

export function toPayload(f: RecipeForm) {
  const titulo = f.titulo.trim();
  return {
    id: f.id,
    titulo,
    slug: f.slug.trim() || slugify(titulo),
    descricao: f.descricao.trim(),
    capa_path: f.capa_path,
    tempo_preparo_min: Number(f.tempo_preparo_min.trim()),
    tempo_cozimento_min: Number((f.tempo_cozimento_min || '0').trim()),
    rendimento: f.rendimento.trim(),
    pode_congelar: f.pode_congelar,
    exclusiva: f.exclusiva,
    destaque: f.destaque,
    categorias: f.categorias,
    ingredientes: f.ingredientes
      .filter((i) => i.nome.trim())
      .map((i) => {
        const q = parseQuantity(i.quantidade);
        return {
          nome: i.nome.trim(),
          quantidade: typeof q === 'number' ? q : null,
          unidade_id: typeof q === 'number' && i.unidade_id ? i.unidade_id : null,
          observacao: i.observacao.trim() || null,
        };
      }),
    passos: f.passos.map((p) => p.trim()).filter(Boolean),
    congelamento: f.pode_congelar
      ? {
          prazo_dias: Number(f.congelamento.prazo_dias.trim()),
          como_embalar: f.congelamento.como_embalar.trim(),
          como_descongelar: f.congelamento.como_descongelar.trim(),
        }
      : null,
    video: f.video.provider_video_id.trim()
      ? {
          provider_video_id: f.video.provider_video_id.trim(),
          status: f.video.status,
          duracao_segundos: f.video.duracao_segundos.trim() ? Number(f.video.duracao_segundos.trim()) : null,
        }
      : null,
  };
}

/** Converte o JSON de admin_obter_receita em formulário. */
export function fromServer(r: Record<string, unknown>): RecipeForm {
  const g = <T,>(k: string) => r[k] as T;
  const cong = g<{ prazo_dias: number; como_embalar: string; como_descongelar: string } | null>('congelamento');
  const vid = g<{ provider_video_id: string; status: 'pendente' | 'pronto' | 'erro'; duracao_segundos: number | null } | null>('video');
  const ings = g<{ nome: string; quantidade: number | null; unidade_id: string | null; observacao: string | null }[]>('ingredientes');
  const passos = g<string[]>('passos');
  return {
    id: g<string>('id'),
    titulo: g<string>('titulo'),
    slug: g<string>('slug'),
    descricao: g<string>('descricao'),
    capa_path: g<string | null>('capa_path'),
    tempo_preparo_min: String(g<number>('tempo_preparo_min')),
    tempo_cozimento_min: String(g<number>('tempo_cozimento_min')),
    rendimento: g<string>('rendimento'),
    pode_congelar: g<boolean>('pode_congelar'),
    exclusiva: g<boolean>('exclusiva'),
    destaque: g<boolean>('destaque'),
    categorias: g<string[]>('categorias'),
    ingredientes: ings.length
      ? ings.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade == null ? '' : String(i.quantidade).replace('.', ','),
          unidade_id: i.unidade_id ?? '',
          observacao: i.observacao ?? '',
        }))
      : [{ nome: '', quantidade: '', unidade_id: '', observacao: '' }],
    passos: passos.length ? passos : [''],
    congelamento: cong
      ? { prazo_dias: String(cong.prazo_dias), como_embalar: cong.como_embalar, como_descongelar: cong.como_descongelar }
      : { prazo_dias: '', como_embalar: '', como_descongelar: '' },
    video: vid
      ? {
          provider_video_id: vid.provider_video_id,
          status: vid.status,
          duracao_segundos: vid.duracao_segundos == null ? '' : String(vid.duracao_segundos),
        }
      : { provider_video_id: '', status: 'pendente', duracao_segundos: '' },
  };
}

/** Move um item da lista uma posição para cima (-1) ou para baixo (+1). */
export function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/** Mensagem amigável a partir do erro do banco. */
export function dbMessage(error: { message?: string; code?: string } | null): string {
  const m = error?.message ?? '';
  if (error?.code === '42501' || m.includes('permissao_negada')) return 'Você não tem permissão para esta ação.';
  if (m.startsWith('publicacao_invalida:')) return m.replace('publicacao_invalida: ', 'Não foi possível publicar: ') + '.';
  if (m.includes('receitas_slug_key') || (error?.code === '23505' && m.includes('slug'))) return 'Já existe uma receita com este endereço (slug).';
  if (m.includes('usuario_nao_encontrado')) return 'Nenhuma conta encontrada com este e-mail.';
  if (m.includes('dados_invalidos')) return 'Dados inválidos. Revise os campos.';
  if (error?.code === '23514') return 'Algum campo está fora do formato permitido.';
  return 'Não foi possível concluir. Tente novamente.';
}
