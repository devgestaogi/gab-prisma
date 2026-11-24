// Normalização do roteiro do template vetor: o roteiro chega de agente ou de edição à mão, em estados intermediários
// (sem cenas, cena só com {id, fala}) e às vezes malformado. Tudo que entra aqui sai com tipo certo, enum válido,
// número finito e texto com teto de tamanho; o que não tem conserto vira ausência. Nenhum componente lê o roteiro cru.
import {lista, numero, objeto, texto, umDe} from '../comum';
import {TIPOS_OBJETO} from './Objetos';
import {CenaRot, Cenario, ContadorRot, PersonagemRot, SeloRot} from './util';

const TIPOS_CENARIO = ['rua', 'escritorio', 'loja', 'cidade-noite', 'casa-noite', 'estrada', 'liso'] as const;
const TIPOS_PERSONAGEM = ['dono', 'funcionaria', 'funcionario', 'cliente'] as const;
const ROUPAS = ['social', 'polo', 'moletom'] as const;
const EXPRESSOES = ['neutro', 'feliz', 'preocupado', 'bravo', 'susto'] as const;
const ANIMAS = ['balanca', 'anda', 'aceno', 'aponta', 'nenhuma'] as const;
const ENTRADAS = ['pop', 'desliza-esq', 'desliza-dir', 'nenhuma'] as const;
const HUDS = ['mira', 'visor', 'radar'] as const;
const DERIVAS = ['zoom', 'pan', 'nenhuma'] as const;
const MAX_TEXTO = 120; // teto de segurança para qualquer texto que aparece na tela

const opcional = <T extends string>(v: unknown, opcoes: readonly T[]): T | undefined => (opcoes.includes(v as T) ? (v as T) : undefined);
const opcNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const opcBool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const corHex = (v: unknown): string | undefined => (typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? v.trim() : undefined);
const curto = (v: unknown, max = MAX_TEXTO): string => texto(v, '').trim().slice(0, max);
const entre = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const normalizaCenario = (v: unknown): Cenario => {
  const c = objeto(v);
  const cores: Record<string, string> = {};
  Object.entries(objeto(c.cores)).forEach(([k, val]) => { const h = corHex(val); if (h) cores[k] = h; });
  return {
    tipo: umDe(c.tipo, TIPOS_CENARIO, 'liso'),
    cores: Object.keys(cores).length ? cores : undefined,
    noite: opcBool(c.noite),
    placa: curto(c.placa, 24) || undefined,
    imagem: curto(c.imagem, 160) || undefined,
  };
};

export const normalizaPersonagem = (v: unknown): PersonagemRot | null => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const p = objeto(v);
  return {
    tipo: umDe(p.tipo, TIPOS_PERSONAGEM, 'dono'),
    roupa: opcional(p.roupa, ROUPAS),
    expressao: opcional(p.expressao, EXPRESSOES),
    anima: opcional(p.anima, ANIMAS),
    entra: opcional(p.entra, ENTRADAS),
    x: entre(numero(p.x, 540), -400, 1480),
    y: opcNum(p.y) === undefined ? undefined : entre(p.y, 300, 1500),
    ate: opcNum(p.ate) === undefined ? undefined : entre(p.ate, -400, 1480),
    escala: entre(numero(p.escala, 1), 0.2, 3),
    espelho: opcBool(p.espelho),
    cor: corHex(p.cor), pele: corHex(p.pele), cabelo: corHex(p.cabelo),
    oculos: opcBool(p.oculos), cracha: opcBool(p.cracha),
    palavra: curto(p.palavra, 40) || undefined,
  };
};

const normalizaObjeto = (v: unknown) => {
  const o = objeto(v);
  if (!TIPOS_OBJETO.includes(o.tipo)) return undefined;
  return {tipo: o.tipo as string, rotulo: curto(o.rotulo, 24) || undefined, x: opcNum(o.x), y: opcNum(o.y), escala: entre(numero(o.escala, 1), 0.2, 3), palavra: curto(o.palavra, 40) || undefined};
};

const normalizaSelo = (v: unknown): SeloRot | undefined => {
  const s = objeto(v);
  const txt = curto(s.texto);
  const n = typeof s.numero === 'number' && Number.isFinite(s.numero) ? s.numero : curto(s.numero, 8);
  if (n === '' && !txt) return undefined;
  return {numero: n === '' ? '★' : n, texto: txt};
};

const normalizaContador = (v: unknown): ContadorRot | undefined => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const c = objeto(v);
  const dur = opcNum(c.duracao);
  return {
    de: numero(c.de, 0), para: numero(c.para, 0),
    prefixo: curto(c.prefixo, 10) || undefined, sufixo: curto(c.sufixo, 10) || undefined,
    cor: opcional(c.cor, ['verde', 'laranja'] as const),
    icone: opcional(c.icone, ['dinheiro', 'relogio', 'pedido'] as const),
    palavra: curto(c.palavra, 40) || undefined,
    duracao: dur === undefined || dur < 1 ? undefined : Math.min(600, Math.round(dur)),
    y: opcNum(c.y),
  };
};

const normalizaBalao = (v: unknown) => {
  const b = objeto(v);
  const txt = curto(b.texto, 80);
  if (!txt) return undefined;
  return {texto: txt, de: Math.max(0, Math.round(numero(b.de, 0))), tipo: umDe(b.tipo, ['fala', 'pensamento'] as const, 'fala'), x: opcNum(b.x), y: opcNum(b.y), palavra: curto(b.palavra, 40) || undefined};
};

const normalizaImpacto = (v: unknown) => {
  const i = typeof v === 'string' ? {texto: v} : objeto(v);
  const txt = curto(i.texto, 60);
  if (!txt) return undefined;
  return {texto: txt, cor: opcional(i.cor, ['laranja', 'vermelho'] as const), y: opcNum(i.y), palavra: curto(i.palavra, 40) || undefined};
};

const normalizaFlash = (v: unknown) => {
  if (v === true) return {};
  if (typeof v === 'string') return {cor: corHex(v)};
  if (v && typeof v === 'object' && !Array.isArray(v)) { const f = objeto(v); return {cor: corHex(f.cor), palavra: curto(f.palavra, 40) || undefined}; }
  return undefined;
};

const normalizaHud = (v: unknown) => {
  if (typeof v === 'string') { const t = opcional(v, HUDS); return t ? {tipo: t} : undefined; }
  const h = objeto(v);
  const t = opcional(h.tipo, HUDS);
  return t ? {tipo: t, x: opcNum(h.x), y: opcNum(h.y), palavra: curto(h.palavra, 40) || undefined} : undefined;
};

export type CenaNorm = Omit<CenaRot, 'flash' | 'hud' | 'impacto' | 'balao'> & {
  flash?: {cor?: string; palavra?: string}; hud?: {tipo: 'mira' | 'visor' | 'radar'; x?: number; y?: number; palavra?: string};
  impacto?: {texto: string; cor?: 'laranja' | 'vermelho'; y?: number; palavra?: string};
  balao?: {texto: string; de: number; tipo: 'fala' | 'pensamento'; x?: number; y?: number; palavra?: string};
};

export const normalizaCena = (v: unknown): CenaNorm => {
  const c = objeto(v);
  return {
    id: curto(c.id, 60), fala: texto(c.fala, ''),
    cenario: normalizaCenario(c.cenario),
    personagens: lista(c.personagens).map(normalizaPersonagem).filter((p): p is PersonagemRot => p !== null),
    objeto: normalizaObjeto(c.objeto),
    selo: normalizaSelo(c.selo),
    contador: normalizaContador(c.contador),
    balao: normalizaBalao(c.balao),
    impacto: normalizaImpacto(c.impacto),
    flash: normalizaFlash(c.flash),
    hud: normalizaHud(c.hud),
    deriva: opcional(c.deriva, DERIVAS),
    titulo: c.titulo === false ? false : undefined,
    cta: curto(c.cta, 80) || undefined,
  };
};

export const normalizaRoteiro = (r: Record<string, any>) => {
  // título fixo: [linha1, linha2]; texto solto vira uma linha só
  const t = typeof r.titulo === 'string' ? [r.titulo] : lista(r.titulo);
  const l1 = curto(t[0], 70), l2 = curto(t[1], 70);
  return {
    modo: umDe(r.modo, ['lista', 'fabula'] as const, 'lista') as string,
    contorno: r.estilo === 'contorno',
    titulo: l1 || l2 ? ([l1, l2] as [string, string]) : undefined,
    cenas: lista(r.cenas).map(normalizaCena),
  };
};
