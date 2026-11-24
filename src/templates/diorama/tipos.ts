// Tipos, medidas do mundo e funções de tempo do template diorama-3d-hud.
import type {DadosT} from '../comum';

export type Estacao = {id: string; rotulo: string; palavra?: string};
export type HudD = {valor: number; de?: number; rotulo: string; icone?: 'pessoas' | 'pedido' | 'dinheiro' | 'relogio'; prefixo?: string; sufixo?: string};
export type LinhaD = {texto: string; estado?: 'ok' | 'erro' | 'neutro'; etiqueta?: string};
export type CartaoD = {titulo: string; linhas: LinhaD[]};
export type CenaDio = {
  id: string;
  fala: string;
  foco?: string;
  visao?: 'geral' | 'perto' | 'cima';
  hud?: HudD;
  ilustrativo?: boolean;
  fluxo?: {ate: string; travados?: number};
  alerta?: string;
  correcao?: string;
  cta?: string;
  cartao?: CartaoD;
  capitulo?: string;
  progresso?: [number, number];
  carimbo?: string;
  // palavra da fala que dispara cada elemento (senão entra alguns quadros depois do início da cena)
  quando?: {hud?: string; alerta?: string; correcao?: string; cta?: string; cartao?: string; carimbo?: string};
};

export const LARANJA = '#EE7533';
export const VERMELHO = '#E5484D';
export const VERDE = '#3DDC84';
export const FUNDO = '#0B0B0D';

// ── mundo: as estações ficam numa reta ao longo de -z; os peões nascem em z = Z_SPAWN e andam para -z ──
export const ESPACO = 7;
export const Z_SPAWN = 15;
export const zEstacao = (k: number) => -k * ESPACO;
export const uEstacao = (k: number) => Z_SPAWN + k * ESPACO; // distância andada desde o nascimento até a estação k

export const estacoesDe = (d: DadosT): Estacao[] => (d.roteiro.estacoes as Estacao[]) ?? [];
export const cenasDe = (d: DadosT): CenaDio[] => d.roteiro.cenas as CenaDio[];
export const idxEstacao = (est: Estacao[], id?: string) => (id ? est.findIndex((e) => e.id === id) : -1);

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// índice da cena ativa no instante t (s)
export const cenaEm = (d: DadosT, t: number) => {
  let i = 0;
  d.tempo.cenas.forEach((c, k) => { if (c.ini <= t + 1e-6) i = k; });
  return i;
};

// maior índice de estação que a cena toca (foco ou fim do fluxo); -1 se nenhum
const alcance = (d: DadosT, c: CenaDio) => {
  const est = estacoesDe(d);
  return Math.max(idxEstacao(est, c.foco), idxEstacao(est, c.fluxo?.ate));
};

// instante (s) em que cada estação nasce: na palavra falada, nunca depois de a câmera chegar nela
export const revelacoes = (d: DadosT): number[] => {
  const est = estacoesDe(d);
  const cenas = cenasDe(d);
  return est.map((e, k) => {
    const alvo = norm(e.palavra ?? e.rotulo);
    const chave = alvo.length > 5 ? alvo.slice(0, 5) : alvo;
    const w = d.tempo.palavras.find((x) => { const m = norm(x.p); return m && (m === alvo || m.startsWith(chave)); });
    const iRef = cenas.findIndex((c) => alcance(d, c) >= k);
    const tRef = iRef >= 0 ? d.tempo.cenas[iRef].ini + 0.3 : Infinity;
    const t = Math.min(w ? w.ini : Infinity, tRef);
    if (k === 0 && t < 1.2) return -0.5; // a primeira estação já está de pé no quadro 0 (o gancho não começa vazio)
    return Number.isFinite(t) ? Math.max(0.1, t) : 0.1;
  });
};

// fluxo por cena: até onde os peões andam e quantos ficam travados (a cena sem "fluxo" herda a anterior)
export type CfgFluxo = {ate: number; trav: number};
export const fluxoPorCena = (d: DadosT): CfgFluxo[] => {
  const est = estacoesDe(d);
  let ate = est.length - 1;
  let trav = 0;
  return cenasDe(d).map((c) => {
    if (c.fluxo) {
      const k = idxEstacao(est, c.fluxo.ate);
      if (k >= 0) ate = k;
      trav = c.fluxo.travados ?? 0;
    }
    return {ate, trav};
  });
};
