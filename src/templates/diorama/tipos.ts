// Tipos, medidas do mundo e funções de tempo do template diorama-3d-hud.
// O roteiro vem de agente ou de edição ao vivo: estacoesDe e cenasDe devolvem sempre a forma normalizada
// (tipo errado vira ausência), no mesmo índice do roteiro, para o resto do template nunca validar nada.
import {cenasValidas, lista, numero, objeto, texto} from '../comum';
import type {CenaTempo, DadosT} from '../comum';
import {ajustePilula, ajusteCapitulo, textoCapitulo} from './ajuste';

export type Estacao = {id: string; rotulo: string; palavra?: string};
export const ICONES_HUD = ['pessoas', 'pedido', 'dinheiro', 'relogio', 'estrela', 'carro', 'lista', 'alvo', 'alerta', 'camera'] as const;
export type IconeHud = (typeof ICONES_HUD)[number];
export type HudD = {valor: number; de?: number; rotulo: string; icone?: IconeHud; prefixo?: string; sufixo?: string};
export type LinhaD = {texto: string; estado?: 'ok' | 'erro' | 'neutro'; etiqueta?: string; palavra?: string};
export type CartaoD = {titulo: string; linhas: LinhaD[]};
export const MOVIMENTOS = ['avanco', 'lateral', 'sobe', 'orbita'] as const;
export type Movimento = (typeof MOVIMENTOS)[number];
// posição vertical por cena (em 1080x1920): legenda (centro 600, 900, 1130) e cartão de vidro (topo 420, 640, 860)
export const FAIXAS = ['alto', 'meio', 'baixo'] as const;
export type Faixa = (typeof FAIXAS)[number];
export type LayoutD = {legenda?: Faixa; cartao?: Faixa};
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
  layout?: LayoutD;
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

// ── normalização do roteiro ──────────────────────────────────────────────────────────────────────────────
const opcional = (v: unknown): string | undefined => { const s = texto(v, ''); return s ? s : undefined; };
const VISOES = ['geral', 'perto', 'cima'] as const;
const ESTADOS = ['ok', 'erro', 'neutro'] as const;

const normEstacao = (e: unknown, k: number): Estacao => {
  const o = typeof e === 'string' ? {rotulo: e} : objeto(e);
  const id = texto(o.id, '') || `e${k}`;
  return {id, rotulo: texto(o.rotulo, '') || id, palavra: opcional(o.palavra)};
};

const normHud = (v: unknown): HudD | undefined => {
  const o = objeto(v);
  if (typeof o.valor !== 'number' || !Number.isFinite(o.valor)) return undefined;
  return {
    valor: o.valor,
    de: typeof o.de === 'number' && Number.isFinite(o.de) ? o.de : undefined,
    rotulo: texto(o.rotulo, ''),
    icone: ICONES_HUD.includes(o.icone) ? o.icone : undefined,
    prefixo: opcional(o.prefixo),
    sufixo: opcional(o.sufixo),
  };
};

const normCartao = (v: unknown): CartaoD | undefined => {
  const o = objeto(v);
  const titulo = texto(o.titulo, '');
  const linhas: LinhaD[] = lista(o.linhas).slice(0, 6).map((l) => {
    const x = typeof l === 'string' ? {texto: l} : objeto(l);
    return {texto: texto(x.texto, ''), estado: ESTADOS.includes(x.estado) ? x.estado : undefined, etiqueta: opcional(x.etiqueta), palavra: opcional(x.palavra)};
  });
  return titulo || linhas.length ? {titulo, linhas} : undefined;
};

const normLayout = (v: unknown): LayoutD | undefined => {
  const o = objeto(v);
  const f = (x: unknown): Faixa | undefined => (FAIXAS.includes(x as Faixa) ? (x as Faixa) : undefined);
  const l = {legenda: f(o.legenda), cartao: f(o.cartao)};
  return l.legenda || l.cartao ? l : undefined;
};

const normProgresso = (v: unknown): [number, number] | undefined => {
  if (!Array.isArray(v) || v.length < 2) return undefined;
  const b = Math.round(numero(v[1], 0));
  if (b < 1 || b > 12) return undefined;
  return [Math.max(0, Math.min(b, Math.round(numero(v[0], 0)))), b];
};

const normFluxo = (v: unknown): CenaDio['fluxo'] => {
  const o = objeto(v);
  if (typeof o.ate !== 'string' || !o.ate) return undefined;
  return {ate: o.ate, travados: typeof o.travados === 'number' && Number.isFinite(o.travados) ? Math.max(0, Math.min(60, Math.floor(o.travados))) : undefined};
};

export const normCena = (c: unknown): CenaDio => {
  const o = objeto(c);
  const q = objeto(o.quando);
  return {
    id: texto(o.id, ''),
    fala: texto(o.fala, ''),
    foco: opcional(o.foco),
    visao: VISOES.includes(o.visao) ? o.visao : undefined,
    hud: normHud(o.hud),
    ilustrativo: o.ilustrativo === true,
    fluxo: normFluxo(o.fluxo),
    alerta: opcional(o.alerta),
    correcao: opcional(o.correcao),
    cta: opcional(o.cta),
    cartao: normCartao(o.cartao),
    capitulo: opcional(o.capitulo),
    progresso: normProgresso(o.progresso),
    carimbo: opcional(o.carimbo),
    layout: normLayout(o.layout),
    quando: {hud: opcional(q.hud), alerta: opcional(q.alerta), correcao: opcional(q.correcao), cta: opcional(q.cta), cartao: opcional(q.cartao), carimbo: opcional(q.carimbo)},
  };
};

export const estacoesDe = (d: DadosT): Estacao[] => lista(d.roteiro?.estacoes).map(normEstacao);
export const cenasDe = (d: DadosT): CenaDio[] => lista(d.roteiro?.cenas).map(normCena);
export const palavrasDe = (d: DadosT) => lista<{p: string; ini: number; fim: number}>(d.tempo?.palavras).filter((w) => w && typeof w.p === 'string' && Number.isFinite(w.ini));
export const idxEstacao = (est: Estacao[], id?: string) => (id ? est.findIndex((e) => e.id === id) : -1);

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// cena ativa no instante t (s), só entre as que já têm tempo; sem nenhuma, atual é null (palco vazio)
export type Contexto = {atual: CenaDio | null; ant: CenaDio | null; ini: number; k: number};
export const contextoCena = (d: DadosT, t: number): Contexto => {
  const {validas: v} = planejamentoDe(d);
  if (!v.length) return {atual: null, ant: null, ini: 0, k: -1};
  let k = 0;
  v.forEach((c, j) => { if (c.ini <= t + 1e-6) k = j; });
  const cs = planejamentoDe(d).cenas;
  return {atual: cs[v[k].i], ant: k > 0 ? cs[v[k - 1].i] : null, ini: v[k].ini, k};
};

// maior índice de estação que a cena toca (foco ou fim do fluxo); -1 se nenhum
const alcance = (est: Estacao[], c: CenaDio) => Math.max(idxEstacao(est, c.foco), idxEstacao(est, c.fluxo?.ate));

// instante (s) em que cada estação nasce: na palavra falada, nunca depois de a câmera chegar nela
export const revelacoes = (d: DadosT): number[] => {
  const est = estacoesDe(d);
  const cenas = cenasDe(d);
  const validas = cenasValidas(d);
  const palavras = palavrasDe(d);
  return est.map((e, k) => {
    const alvo = norm(e.palavra ?? e.rotulo);
    const chave = alvo.length > 5 ? alvo.slice(0, 5) : alvo;
    const w = palavras.find((x) => { const m = norm(x.p); return m && (m === alvo || m.startsWith(chave)); });
    const ref = validas.find((c) => alcance(est, cenas[c.i]) >= k);
    const tRef = ref ? ref.ini + 0.3 : Infinity;
    const t = Math.min(w ? w.ini : Infinity, tRef);
    if (k === 0 && t < 1.2) return -0.5; // a primeira estação já está de pé no quadro 0 (o gancho não começa vazio)
    return Number.isFinite(t) ? Math.max(0.1, t) : 0.1;
  });
};

// fluxo por cena (mesmo índice do roteiro): até onde os peões andam e quantos ficam travados (a cena sem "fluxo" herda a anterior)
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

// ── posição por cena: legenda e cartão de vidro sem cobrir o assunto, sem se tocar e sem bater na pilha do topo ──
export const LEGENDA_Y: Record<Faixa, number> = {alto: 600, meio: 900, baixo: 1130};
export const CARTAO_TOPO: Record<Faixa, number> = {alto: 420, meio: 640, baixo: 860};
export const CARTAO_TOPO_MIN = 270; // nada acima disto (a interface do Reels cobre o resto)
export const CARTAO_FIM_MAX = 1230; // nada abaixo disto (a interface do Reels cobre o resto)
export const CARTAO_ESCALA_MIN = 0.7; // o cartão encolhe até 70% antes de perder linhas
export const GAP_PILHA = 18; // espaço vertical fixo entre as caixas da pilha do topo
const LEGENDA_MEIA_ALTURA = 66; // duas linhas de 52 px
const FOLGA = 24;

// medidas das caixas (px) usadas para o cálculo estático; o desenho usa a altura real do DOM (flex), isto só decide o layout.
// Pílula e capítulo têm altura que depende do texto (até 2 linhas): vêm de ajuste.ts, a mesma conta do desenho.
export const ALT_HUD = 104;
export const ALT_ILUSTRATIVO = 36;
// altura do cartão (px, sem escala) com n linhas visíveis; a linha encolhe de 88 para 76 acima de 3
export const alturaCartaoN = (temTitulo: boolean, n: number) => 2 + 26 + 18 + (temTitulo ? 40 : 0) + n * (n > 3 ? 76 : 88);
export const alturaCartao = (c: CartaoD) => alturaCartaoN(!!c.titulo, c.linhas.length);
export const topoDaPilha = (cenas: CenaDio[]) => (cenas.some((c) => c.hud) ? 330 - ALT_HUD / 2 : 285);

export type CartaoPos = {topo: number; escala: number; linhas: number};
// cartao é null quando a cena não tem cartão OU quando nada cabe sem invadir a pilha do topo ou a legenda (o cartão some)
export type PosCena = {legenda: number; cartao: CartaoPos | null; fimPilha: number};
export const layoutDasCenas = (cenas: CenaDio[]): PosCena[] => {
  const topo = topoDaPilha(cenas);
  let hud: CenaDio | null = null;
  let cap: CenaDio | null = null;
  return cenas.map((c) => {
    if (c.hud) hud = c;
    if (c.capitulo) cap = c;
    const alturas: number[] = [];
    if (hud) alturas.push(ALT_HUD + (hud.ilustrativo ? ALT_ILUSTRATIVO : 0));
    if (cap) alturas.push(ajusteCapitulo(textoCapitulo(cap.capitulo ?? ''), !!cap.progresso).alt);
    [[c.alerta, true], [c.correcao, true], [c.cta, false]].forEach(([p, ico]) => { if (p) alturas.push(ajustePilula(p as string, ico as boolean).alt); });
    const fimPilha = alturas.length ? topo + alturas.reduce((a, b) => a + b, 0) + GAP_PILHA * (alturas.length - 1) : 0;
    // legenda: a faixa pedida; se a pilha do topo chegar nela, desce até folgar
    const pedida = LEGENDA_Y[c.layout?.legenda ?? 'baixo'];
    const legenda = fimPilha ? Math.min(LEGENDA_Y.baixo, Math.max(pedida, fimPilha + FOLGA + LEGENDA_MEIA_ALTURA)) : pedida;
    return {legenda, cartao: c.cartao ? posicaoDoCartao(c, legenda, fimPilha) : null, fimPilha};
  });
};

// Cartão: tenta a faixa pedida e as outras (da mais próxima à mais distante); se nenhuma servir, encolhe a escala até 70%
// e, se ainda não servir, tira linhas visíveis (as últimas saem). Toda tentativa revalida TODAS as restrições:
// abaixo da pilha do topo (+18 px), dentro de 270..1230 e fora da faixa da legenda (± meia altura + folga).
const posicaoDoCartao = (c: CenaDio, legenda: number, fimPilha: number): CartaoPos | null => {
  const cartao = c.cartao as CartaoD;
  const minimo = Math.max(CARTAO_TOPO_MIN, fimPilha ? fimPilha + GAP_PILHA : 0);
  const pedido = c.layout?.cartao ?? 'meio';
  const ordem = [pedido, ...FAIXAS.filter((f) => f !== pedido).sort((a, b) => Math.abs(CARTAO_TOPO[a] - CARTAO_TOPO[pedido]) - Math.abs(CARTAO_TOPO[b] - CARTAO_TOPO[pedido]))];
  const bandaIni = legenda - LEGENDA_MEIA_ALTURA - FOLGA;
  const bandaFim = legenda + LEGENDA_MEIA_ALTURA + FOLGA;
  const serve = (t: number, h: number) => t >= minimo - 1e-6 && t + h <= CARTAO_FIM_MAX + 1e-6 && (t + h <= bandaIni + 1e-6 || t >= bandaFim - 1e-6);
  const escalas = [1, 0.95, 0.9, 0.85, 0.8, 0.75, CARTAO_ESCALA_MIN];
  const total = cartao.linhas.length;
  const tentar = (n: number, esc: number): CartaoPos | null => {
    const h = alturaCartaoN(!!cartao.titulo, n) * esc;
    const candidatos = [
      ...ordem.map((f) => Math.min(Math.max(CARTAO_TOPO[f], minimo), CARTAO_FIM_MAX - h)), // faixas pedidas, empurradas para caber
      minimo, // logo abaixo da pilha
      bandaIni - h, // logo acima da legenda
      bandaFim, // logo abaixo da legenda
    ];
    const t = candidatos.find((x) => serve(x, h));
    return t === undefined ? null : {topo: Math.round(t), escala: esc, linhas: n};
  };
  for (let n = total; n >= (total ? 1 : 0); n--) {
    // com as linhas todas só a escala cede; só depois de esgotar a escala (70%) uma linha sai
    const esc = n === total ? escalas : [CARTAO_ESCALA_MIN];
    for (const e of esc) { const r = tentar(n, e); if (r) return r; }
  }
  return null;
};

// ── planejamento por frame, sem refazer a normalização a cada quadro ───────────────────────────────────────────────
// cache por objeto de dados (o estúdio entrega um objeto novo a cada edição); só guarda resultado puro
const _doDados = new WeakMap<DadosT, {validas: CenaTempo[]; cenas: CenaDio[]; est: Estacao[]}>();
export const planejamentoDe = (d: DadosT) => {
  let p = _doDados.get(d);
  if (!p) { p = {validas: cenasValidas(d), cenas: cenasDe(d), est: estacoesDe(d)}; _doDados.set(d, p); }
  return p;
};
