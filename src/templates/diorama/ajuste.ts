// Medida e ajuste de texto do diorama: nenhum texto transborda a caixa. Mede com a fonte real (canvas), quebra em até
// 2 linhas, reduz o corpo até um mínimo legível (18 px) e, se ainda não couber, corta com reticências.
// Puro e determinístico DEPOIS que as fontes carregam (Diorama.tsx só desenha depois disso e chama fontesProntas()).
import {FONTE_SORA} from '../comum';

export const LARG_PILHA = 950; // 65..1015, faixa útil do 9:16
export const CORPO_MIN = 18; // menor corpo legível

let _g: CanvasRenderingContext2D | null | undefined;
let _prontas = false;
const _cache = new Map<string, number>();
// chamado quando as fontes embutidas carregaram: só a partir daí as medidas entram no cache (antes seriam da fonte substituta)
export const fontesProntas = () => { _prontas = true; _cache.clear(); };

// largura de um texto (px) na fonte CSS dada; sem canvas, estima pelo corpo
export const medir = (texto: string, fonte: string, folgaPorLetra = 0.58): number => {
  const chave = `${fonte}|${texto}`;
  const guardada = _cache.get(chave);
  if (guardada !== undefined) return guardada;
  let w: number | null = null;
  try {
    if (_g === undefined) _g = document.createElement('canvas').getContext('2d');
    if (_g) { _g.font = fonte; w = _g.measureText(texto).width; }
  } catch { /* sem canvas */ }
  if (w === null) w = texto.length * parseFloat(fonte.match(/(\d+)px/)?.[1] ?? '30') * folgaPorLetra;
  if (_prontas) { if (_cache.size > 4000) _cache.clear(); _cache.set(chave, w); }
  return w;
};

export type Ajuste = {linhas: string[]; fs: number; cortado: boolean};
export type OpcAjuste = {
  peso: number;
  fsMax: number;
  piso1: number; // menor corpo aceito para uma linha só; abaixo disso prefere quebrar em duas
  fsMin?: number; // padrão CORPO_MIN
  largura: number; // px disponíveis para o texto
  espaco?: number; // letterSpacing em px por letra
  maxLinhas?: 1 | 2;
};

export const ajustarTexto = (bruto: string, o: OpcAjuste): Ajuste => {
  const texto = bruto.replace(/\s+/g, ' ').trim();
  const fsMin = Math.max(CORPO_MIN, o.fsMin ?? CORPO_MIN);
  const piso1 = Math.max(fsMin, o.piso1);
  const larg = (t: string, fs: number) => medir(t, `${o.peso} ${fs}px ${FONTE_SORA}`) + (o.espaco ?? 0) * t.length;
  if (!texto) return {linhas: [''], fs: o.fsMax, cortado: false};
  for (let fs = o.fsMax; fs >= piso1; fs -= 2) if (larg(texto, fs) <= o.largura) return {linhas: [texto], fs, cortado: false};
  const palavras = texto.split(' ');
  if ((o.maxLinhas ?? 2) === 2 && palavras.length > 1) {
    for (let fs = o.fsMax; fs >= fsMin; fs -= 2) {
      let melhor: string[] | null = null;
      let custo = Infinity;
      for (let k = 1; k < palavras.length; k++) {
        const par = [palavras.slice(0, k).join(' '), palavras.slice(k).join(' ')];
        const c = Math.max(larg(par[0], fs), larg(par[1], fs));
        if (c < custo) { custo = c; melhor = par; }
      }
      if (melhor && custo <= o.largura) return {linhas: melhor, fs, cortado: false};
    }
  }
  // não coube nem no mínimo: corpo mínimo, o que sobra é cortado com reticências
  const fs = fsMin;
  const corta = (t: string) => {
    if (larg(t, fs) <= o.largura) return t;
    let s = t;
    while (s.length > 1 && larg(`${s.trimEnd()}…`, fs) > o.largura) s = s.slice(0, -1);
    return `${s.trimEnd()}…`;
  };
  if ((o.maxLinhas ?? 2) === 1) return {linhas: [corta(texto)], fs, cortado: true};
  let l1 = '';
  let i = 0;
  while (i < palavras.length && larg(l1 ? `${l1} ${palavras[i]}` : palavras[i], fs) <= o.largura) { l1 = l1 ? `${l1} ${palavras[i]}` : palavras[i]; i++; }
  let resto = palavras.slice(i).join(' ');
  if (!l1) { // primeira palavra maior que a linha: corta no meio da palavra
    let n = palavras[0].length;
    while (n > 1 && larg(palavras[0].slice(0, n), fs) > o.largura) n--;
    l1 = palavras[0].slice(0, n);
    resto = [palavras[0].slice(n), ...palavras.slice(1)].join(' ').trim();
  }
  return {linhas: resto ? [l1, corta(resto)] : [l1], fs, cortado: !!resto && larg(resto, fs) > o.largura};
};

// ── medidas das caixas da pilha do topo (o desenho em hud.tsx e a conta de layout em tipos.ts usam as mesmas) ────
export const ALT_PILULA = 92; // uma linha
export const larguraTextoPilula = (comIcone: boolean) => LARG_PILHA - 80 - (comIcone ? 56 : 0);
export const ajustePilula = (texto: string, comIcone: boolean): Ajuste & {alt: number} => {
  const a = ajustarTexto(texto, {peso: 700, fsMax: 36, piso1: 26, largura: larguraTextoPilula(comIcone)});
  return {...a, alt: a.linhas.length === 1 ? ALT_PILULA : 2 * Math.round(a.fs * 1.15) + 40};
};

export const ALT_CAPITULO = 72; // uma linha, sem progresso
export const ALT_BARRAS = 18; // espaço extra das barras de progresso
export const larguraTextoCapitulo = LARG_PILHA - 80 - 2;
export const ajusteCapitulo = (texto: string, comProgresso: boolean): Ajuste & {lh: number; alt: number} => {
  const a = ajustarTexto(texto, {peso: 700, fsMax: 30, piso1: 24, largura: larguraTextoCapitulo, espaco: 1.5});
  const lh = Math.round(a.fs * 1.25);
  return {...a, lh, alt: 34 + a.linhas.length * lh + (comProgresso ? ALT_BARRAS : 0)};
};
// capítulo "A · B" normalizado (espaço certo em volta do ponto); sem ponto, o texto todo
export const textoCapitulo = (cap: string): string => {
  const p = cap.split('·').map((x) => x.trim());
  return p.length > 1 ? `${p[0]} · ${p.slice(1).join(' · ')}` : p[0];
};
