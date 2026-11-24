// Tipos, medidas do mundo e funções de tempo do template diorama-3d-hud.
// O roteiro vem de agente ou de edição ao vivo: estacoesDe e cenasDe devolvem sempre a forma normalizada
// (tipo errado vira ausência), no mesmo índice do roteiro, para o resto do template nunca validar nada.
import {cenasValidas, lista, numero, objeto, texto, umDe} from '../comum';
import type {DadosT} from '../comum';

export type Estacao = {id: string; rotulo: string; palavra?: string};
export const ICONES_HUD = ['pessoas', 'pedido', 'dinheiro', 'relogio', 'estrela', 'carro', 'lista', 'alvo', 'alerta', 'camera'] as const;
export type IconeHud = (typeof ICONES_HUD)[number];
export type HudD = {valor: number; de?: number; rotulo: string; icone?: IconeHud; prefixo?: string; sufixo?: string};
export type LinhaD = {texto: string; estado?: 'ok' | 'erro' | 'neutro'; etiqueta?: string; palavra?: string};
export type CartaoD = {titulo: string; linhas: LinhaD[]};
export const MOVIMENTOS = ['avanco', 'lateral', 'sobe', 'orbita'] as const;
export type Movimento = (typeof MOVIMENTOS)[number];
export type PlanoD = {imagem: string; movimento: Movimento; foco: [number, number]};
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
  // modo imagem: plano gerado do assunto (public/<projeto>/planos/<imagem>) com a câmera animada por cima
  plano?: PlanoD;
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

const normPlano = (v: unknown): PlanoD | undefined => {
  const o = objeto(v);
  if (typeof o.imagem !== 'string' || !o.imagem) return undefined;
  const f = Array.isArray(o.foco) ? o.foco : [];
  const c = (x: unknown) => Math.max(0, Math.min(1, numero(x, 0.5)));
  return {imagem: o.imagem, movimento: umDe(o.movimento, MOVIMENTOS, 'avanco'), foco: [c(f[0]), c(f[1])]};
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
    plano: normPlano(o.plano),
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
  const v = cenasValidas(d);
  if (!v.length) return {atual: null, ant: null, ini: 0, k: -1};
  let k = 0;
  v.forEach((c, j) => { if (c.ini <= t + 1e-6) k = j; });
  return {atual: normCena(v[k].cena), ant: k > 0 ? normCena(v[k - 1].cena) : null, ini: v[k].ini, k};
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
export const CARTAO_FIM_MAX = 1230; // nada abaixo disto (a interface do Reels cobre o resto)
export const GAP_PILHA = 18; // espaço vertical fixo entre as caixas da pilha do topo
const LEGENDA_MEIA_ALTURA = 66; // duas linhas de 52 px
const FOLGA = 24;

// medidas das caixas (px) usadas para o cálculo estático; o desenho usa a altura real do DOM (flex), isto só decide o layout
export const ALT_HUD = 104;
export const ALT_ILUSTRATIVO = 36;
export const ALT_CAPITULO = 72;
export const ALT_CAPITULO_PROG = 90;
export const ALT_PILULA = 92;
export const alturaCartao = (c: CartaoD) => 2 + 26 + 18 + (c.titulo ? 40 : 0) + c.linhas.length * (c.linhas.length > 3 ? 76 : 88);
export const topoDaPilha = (cenas: CenaDio[]) => (cenas.some((c) => c.hud) ? 330 - ALT_HUD / 2 : 285);

export type PosCena = {legenda: number; cartao: number; fimPilha: number};
export const layoutDasCenas = (cenas: CenaDio[]): PosCena[] => {
  const topo = topoDaPilha(cenas);
  let hud: CenaDio | null = null;
  let cap: CenaDio | null = null;
  return cenas.map((c) => {
    if (c.hud) hud = c;
    if (c.capitulo) cap = c;
    const alturas: number[] = [];
    if (hud) alturas.push(ALT_HUD + (hud.ilustrativo ? ALT_ILUSTRATIVO : 0));
    if (cap) alturas.push(cap.progresso ? ALT_CAPITULO_PROG : ALT_CAPITULO);
    [c.alerta, c.correcao, c.cta].forEach((p) => { if (p) alturas.push(ALT_PILULA); });
    const fimPilha = alturas.length ? topo + alturas.reduce((a, b) => a + b, 0) + GAP_PILHA * (alturas.length - 1) : 0;
    // legenda: a faixa pedida; se a pilha do topo chegar nela, desce até folgar
    const pedida = LEGENDA_Y[c.layout?.legenda ?? 'baixo'];
    const legenda = fimPilha ? Math.min(LEGENDA_Y.baixo, Math.max(pedida, fimPilha + FOLGA + LEGENDA_MEIA_ALTURA)) : pedida;
    // cartão: a faixa pedida; cede para a outra livre se bater na legenda, na pilha ou no limite de baixo
    let cartao = CARTAO_TOPO[c.layout?.cartao ?? 'meio'];
    if (c.cartao) {
      const h = alturaCartao(c.cartao);
      const pedido = c.layout?.cartao ?? 'meio';
      const ordem = [pedido, ...FAIXAS.filter((f) => f !== pedido).sort((a, b) => Math.abs(CARTAO_TOPO[a] - CARTAO_TOPO[pedido]) - Math.abs(CARTAO_TOPO[b] - CARTAO_TOPO[pedido]))];
      // a faixa nunca entra na pilha do topo: começa logo abaixo dela quando a pilha chega lá
      const minimo = fimPilha ? fimPilha + GAP_PILHA : 0;
      const topos = ordem.map((f) => Math.min(Math.max(CARTAO_TOPO[f], minimo), CARTAO_FIM_MAX - h));
      const livre = (t: number) => t + h <= legenda - LEGENDA_MEIA_ALTURA - FOLGA || t >= legenda + LEGENDA_MEIA_ALTURA + FOLGA;
      const achou = topos.find(livre);
      cartao = achou ?? topos[0];
    }
    return {legenda, cartao, fimPilha};
  });
};
