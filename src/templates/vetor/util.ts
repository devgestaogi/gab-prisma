// Utilitários do template vetor-chapado-contador: tudo determinístico (o Remotion renderiza fora de ordem).
export const L = 1080;
export const A = 1920;
export const CHAO = 1130; // linha dos pés dos personagens (palco frontal)
export const ZONA = {topo: 270, base: 1248, lateral: 65}; // faixa útil do Reels
export const LARANJA = '#EE7533';
export const VERDE = '#3DDC84';
export const VERMELHO = '#E5484D';
export const TINTA = '#111111';

// gerador pseudo-aleatório com semente (mulberry32)
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
// k > 0 clareia em direção ao branco, k < 0 escurece em direção ao preto
export const tom = (hex: string, k: number) => {
  const [r, g, b] = rgb(hex);
  const alvo = k >= 0 ? 255 : 0;
  const t = Math.abs(k);
  return `#${hex2(r + (alvo - r) * t)}${hex2(g + (alvo - g) * t)}${hex2(b + (alvo - b) * t)}`;
};
export const mistura = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return `#${hex2(r1 + (r2 - r1) * t)}${hex2(g1 + (g2 - g1) * t)}${hex2(b1 + (b2 - b1) * t)}`;
};

export const limita = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const suave = (t: number) => { const x = limita(t, 0, 1); return x * x * (3 - 2 * x); };
export const saida = (t: number) => 1 - Math.pow(1 - limita(t, 0, 1), 3);

// 12.345 -> "12.345" (separador de milhar pt-BR, sem depender de Intl)
export const milhar = (n: number) => {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + s;
};

// quebra um texto em linhas de até `max` caracteres
export const quebra = (txt: string, max: number) => {
  const ps = txt.split(/\s+/).filter(Boolean);
  const ls: string[] = [];
  let at = '';
  ps.forEach((p) => {
    if (at && (at + ' ' + p).length > max) { ls.push(at); at = p; } else at = at ? at + ' ' + p : p;
  });
  if (at) ls.push(at);
  return ls;
};
// divide em exatamente 2 linhas equilibradas (etiqueta do selo)
export const duasLinhas = (txt: string) => {
  const ps = txt.split(/\s+/).filter(Boolean);
  if (ps.length < 2) return [txt, ''];
  let melhor = 1, dif = 1e9;
  for (let i = 1; i < ps.length; i++) {
    const d = Math.abs(ps.slice(0, i).join(' ').length - ps.slice(i).join(' ').length);
    if (d < dif) { dif = d; melhor = i; }
  }
  return [ps.slice(0, melhor).join(' '), ps.slice(melhor).join(' ')];
};

// ── tipos do roteiro ────────────────────────────────────────────────────────────────────────────────────────
export type Cenario = {tipo?: 'rua' | 'escritorio' | 'loja' | 'cidade-noite' | 'casa-noite' | 'estrada' | 'liso'; cores?: Record<string, string>; noite?: boolean; placa?: string; imagem?: string};
export type PersonagemRot = {
  tipo?: string; roupa?: 'social' | 'polo' | 'moletom'; expressao?: 'neutro' | 'feliz' | 'preocupado' | 'bravo' | 'susto';
  anima?: 'balanca' | 'anda' | 'aceno' | 'aponta' | 'nenhuma'; entra?: 'pop' | 'desliza-esq' | 'desliza-dir' | 'nenhuma';
  x: number; y?: number; ate?: number; escala?: number; espelho?: boolean; cor?: string; pele?: string; cabelo?: string; oculos?: boolean; cracha?: boolean; palavra?: string;
};
export type ObjetoRot = {tipo: string; rotulo?: string; x?: number; y?: number; escala?: number; palavra?: string};
export type SeloRot = {numero: number | string; texto: string};
export type ContadorRot = {de: number; para: number; prefixo?: string; sufixo?: string; cor?: 'verde' | 'laranja'; icone?: 'dinheiro' | 'relogio' | 'pedido'; palavra?: string; duracao?: number; y?: number};
export type BalaoRot = {texto: string; de?: number; tipo?: 'fala' | 'pensamento'; x?: number; y?: number; palavra?: string};
export type ImpactoRot = string | {texto: string; cor?: 'laranja' | 'vermelho'; y?: number; palavra?: string};
export type CenaRot = {
  id: string; fala: string; cenario?: Cenario; personagens?: PersonagemRot[]; objeto?: ObjetoRot; selo?: SeloRot; contador?: ContadorRot; balao?: BalaoRot;
  impacto?: ImpactoRot; flash?: boolean | string | {cor?: string; palavra?: string}; hud?: 'mira' | 'visor' | 'radar' | {tipo: 'mira' | 'visor' | 'radar'; x?: number; y?: number; palavra?: string};
  deriva?: 'zoom' | 'pan' | 'nenhuma'; titulo?: boolean; cta?: string;
};
