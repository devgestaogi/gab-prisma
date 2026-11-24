// Peças comuns aos templates de edição (diorama-3d-hud, vetor-chapado-contador, cartoon-2d-cenario-3d).
// O Filme.tsx despacha para o template pelo campo "template" do roteiro; sem o campo, segue o estilo Prisma.
// Regras de todos (CONTEXTO-GI do estúdio): conteúdo importante só dentro da faixa útil do Reels, legenda
// queimada, nada de travessão em texto, logo oficial colado por código.
import React from 'react';
import {Audio, Img, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SORA} from '../fonts';
import {OSWALD} from '../fontsExtra';
import {tempoDasPalavras} from '../Vivo';

export type P = {p: string; ini: number; f: number};
// mesma forma do Dados do Filme.tsx; o roteiro de template carrega campos próprios
export type DadosT = {
  projeto: string;
  roteiro: {template?: string; marca?: string; formato: {largura: number; altura: number; fps: number}; cores: Record<string, string>; cenas: any[]; legenda?: boolean; [k: string]: any};
  tempo: {duracao: number; cenas: {id: string; ini: number; fim: number}[]; palavras: {p: string; ini: number; fim: number}[]};
  personagens: string[];
  // manifesto de public/<projeto>/planos/ (render.mjs e a rota GET projeto do estúdio): arquivos que EXISTEM.
  // Sem ele (undefined) a imagem é aceita sem conferir existência.
  planos?: string[];
  semVoz?: boolean;
};
export type PropsTemplate = {dados: DadosT};

// ── marca: o estúdio serve a Gestão de Impacto e conteúdo próprio do William ─────────────────────────────────
// roteiro.marca = "gi" liga a identidade do GI (logo, laranja da marca); qualquer outro valor ou ausência =
// "livre": o vídeo sai com a cor do próprio template e sem logo. roteiro.cores.destaque, quando vier, manda.
export const LARANJA_GI = '#EE7533';
export const marcaDe = (dados: DadosT): 'gi' | 'livre' => (dados.roteiro.marca === 'gi' ? 'gi' : 'livre');
export const destaqueDe = (dados: DadosT, padraoLivre: string): string => {
  const c = dados.roteiro.cores?.destaque;
  if (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)) return c;
  return marcaDe(dados) === 'gi' ? LARANJA_GI : padraoLivre;
};
// a cor de destaque desce pela árvore por contexto (sem constante fixa nos componentes)
export const CorDestaque = React.createContext<string>(LARANJA_GI);
export const useDestaque = () => React.useContext(CorDestaque);
// mesma cor mais clara (fator > 1) ou mais escura (fator < 1), para degradês e bordas
export const tomDe = (hex: string, fator: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(fator >= 1 ? v + (255 - v) * (fator - 1) : v * fator))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};

// ── faixa útil do 9:16 (Reels e Stories): topo 14%, laterais 6%, base 35% são da interface do Instagram ──
export const faixaUtil = (largura: number, altura: number) => ({
  topo: Math.round(altura * 0.14), // 1080×1920: 269 px
  base: Math.round(altura * 0.65), // 1248 px: abaixo disso o Reels cobre
  lateral: Math.round(largura * 0.06), // 65 px
});

// ── fontes embutidas (sem loadFont, que trava o render em lote) ─────────────────────────────────────────────
export const FONTE_SORA = "'Sora', system-ui, sans-serif";
export const FONTE_OSWALD = "'Oswald', 'Arial Narrow', sans-serif";
const FONTES_CSS =
  [300, 400, 500, 600, 700].map((w) => `@font-face{font-family:'Sora';src:url(${SORA[w]}) format('woff2');font-weight:${w};font-display:block;}`).join('') +
  [500, 600, 700].map((w) => `@font-face{font-family:'Oswald';src:url(${OSWALD[w]}) format('woff2');font-weight:${w};font-display:block;}`).join('');
export const Fontes: React.FC = () => (
  <>
    <style>{FONTES_CSS}</style>
    <div style={{position: 'absolute', opacity: 0, pointerEvents: 'none'}}>
      <span style={{fontFamily: 'Sora', fontWeight: 700}}>Aa Çã é</span>
      <span style={{fontFamily: 'Oswald', fontWeight: 600}}>Aa Çã é</span>
    </div>
  </>
);

// ── tempo ─────────────────────────────────────────────────────────────────────────────────────────────────
// palavras da cena i com o quadro relativo ao começo dela (igual ao palavrasDaCena do Filme.tsx)
export const palavrasDaCena = (dados: DadosT, i: number, fps: number): P[] => {
  const t = dados.tempo?.cenas?.[i];
  if (!t || !Number.isFinite(t.ini) || !Number.isFinite(t.fim)) return [];
  return lista<{p: string; ini: number; fim: number}>(dados.tempo.palavras).filter((w) => w.ini >= t.ini - 0.05 && w.ini < t.fim).map((w) => ({p: w.p, ini: w.ini, f: Math.round((w.ini - t.ini) * fps)}));
};
// quadro (relativo à cena) em que a voz diz a palavra; padrao se a palavra não aparece
export const quadroDaPalavraT = (palavras: P[], palavra: string | undefined, padrao: number) => {
  if (!palavra) return padrao;
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const alvo = n(palavra);
  const w = palavras.find((x) => { const m = n(x.p); return m && (m === alvo || (alvo.length > 3 && m.startsWith(alvo.slice(0, 4)))); });
  return w ? w.f : padrao;
};

// ── normalização: roteiro vem de agente ou de edição à mão; campo ausente ou malformado nunca derruba o render ──
export const lista = <T = any,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const texto = (v: unknown, padrao = ''): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : padrao);
export const numero = (v: unknown, padrao: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);
export const objeto = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
export const umDe = <T extends string>(v: unknown, opcoes: readonly T[], padrao: T): T => (opcoes.includes(v as T) ? (v as T) : padrao);

// Cenas com intervalo de tempo válido (o alinhamento pode ainda não ter chegado nelas, na montagem ao vivo).
// Todo componente global (que olha todas as cenas) usa esta lista, nunca dados.tempo.cenas[i] direto.
export type CenaTempo = {i: number; cena: Record<string, any>; ini: number; fim: number};
export const cenasValidas = (dados: DadosT): CenaTempo[] =>
  lista(dados.roteiro.cenas)
    .map((c, i) => {
      const t = dados.tempo?.cenas?.[i];
      return t && Number.isFinite(t.ini) && Number.isFinite(t.fim) && t.fim > t.ini ? {i, cena: objeto(c), ini: t.ini, fim: t.fim} : null;
    })
    .filter((x): x is CenaTempo => x !== null);

// Imagem que o roteiro aponta (fundo gerado fora etc.): só dentro de public/<projeto>/<pasta>/, sem "..",
// sem caminho absoluto e só com caracteres seguros. Devolve o staticFile ou null (o template usa o procedural).
// `manifesto` (lista de caminhos relativos a <pasta>, quando existir) exige que o arquivo exista de verdade.
export const imagemDoProjeto = (projeto: string, pasta: string, arquivo: unknown, manifesto?: readonly string[]): string | null => {
  if (typeof arquivo !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(projeto)) return null;
  const partes = arquivo.split('/');
  if (!partes.length || partes.some((p) => !p || p === '.' || p === '..' || !/^[\w.-]{1,120}$/.test(p))) return null;
  if (!/\.(png|jpe?g|webp)$/i.test(arquivo)) return null;
  const rel = partes.join('/');
  if (manifesto && !manifesto.includes(rel)) return null;
  return staticFile(`${projeto}/${pasta}/${rel}`);
};
// Imagem de public/<projeto>/planos/ que o template pode usar: caminho válido E (se há manifesto) existente.
// É a única porta para decidir "modo imagem": o template nunca monta staticFile de plano por conta própria.
export const planoDisponivel = (dados: DadosT, arquivo: unknown): string | null =>
  imagemDoProjeto(dados.projeto, 'planos', arquivo, Array.isArray(dados.planos) ? dados.planos : undefined);

export type InfoCena = {i: number; dur: number; ini: number; palavras: P[]; primeira: boolean; ultima: boolean};
// cada cena numa Sequence, do começo da fala dela até a próxima (tempo.json do alinhar.mjs)
export const Cenas: React.FC<{dados: DadosT; render: (cena: any, info: InfoCena) => React.ReactNode}> = ({dados, render}) => {
  const {fps} = useVideoConfig();
  const validas = cenasValidas(dados);
  const n = lista(dados.roteiro.cenas).length;
  return (
    <>
      {validas.map(({i, cena, ini, fim}) => {
        const from = Math.round(ini * fps);
        const dur = Math.max(1, Math.round(fim * fps) - from);
        return (
          <Sequence key={`${texto(cena.id, '')}:${i}`} from={from} durationInFrames={dur} name={texto(cena.id, String(i))}>
            {render(cena, {i, dur, ini, palavras: palavrasDaCena(dados, i, fps), primeira: i === 0, ultima: i === n - 1})}
          </Sequence>
        );
      })}
    </>
  );
};

// ── som ───────────────────────────────────────────────────────────────────────────────────────────────────
export const Narracao: React.FC<{dados: DadosT}> = ({dados}) => (dados.semVoz ? null : <Audio src={staticFile(`${dados.projeto}/narracao.wav`)} />);
// efeito sintetizado do motor (public/sons): pop, whoosh, toque, ding, apito, risco, boom
export const Som: React.FC<{som: string; f: number; vol?: number}> = ({som, f, vol = 0.6}) => {
  const {fps} = useVideoConfig();
  return (
    <Sequence from={Math.max(0, f)} durationInFrames={Math.round(fps * 1.5)} layout="none">
      <Audio src={staticFile(`sons/${som}.wav`)} volume={vol} />
    </Sequence>
  );
};

// ── legenda karaokê ───────────────────────────────────────────────────────────────────────────────────────
// O texto é a FALA do roteiro (nunca a transcrição); o whisper só dá o quadro de cada palavra.
export type EstiloLegenda = {
  fonte: string;
  peso?: number;
  tamanho?: number; // px a 1080 de largura
  cor: string;
  destaque: string; // cor da caixa (modo caixa) ou do texto (modo cor) da palavra falada agora
  modo: 'caixa' | 'cor';
  corNaCaixa?: string; // cor do texto dentro da caixa
  caixaAlta?: boolean;
  contorno?: string; // cor do contorno do texto (legível sobre qualquer fundo)
  centroY: number; // px; tem de ficar dentro da faixa útil
  porBloco?: number; // palavras por bloco (quebra também na pontuação)
  largura?: number; // px de largura máxima do bloco
};
// palavras que nunca terminam um bloco de legenda (artigos, preposições, contrações, conjunções e pronomes átonos), sem acento
const FRACAS = new Set(['a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'num', 'numa', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'pra', 'pro', 'com', 'sem', 'sob', 'sobre', 'entre', 'ate', 'apos', 'ante', 'e', 'ou', 'mas', 'que', 'se', 'nem', 'como', 'quando', 'ao', 'aos', 'lhe', 'me', 'te']);
const PONTUA = /[,.:;?!…]$/;
const semAcento = (txt: string) => txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const fraca = (txt: string) => !PONTUA.test(txt) && FRACAS.has(semAcento(txt));
// Agrupa a fala em blocos de legenda. Restrições DURAS (só cedem se for impossível cumpri-las, ex.: fala de uma palavra):
//  (a) nenhum bloco de 1 palavra; trecho de 1 palavra isolado pela pontuação ("Atenção!") se junta ao trecho seguinte
//      (ou ao anterior, se for o último), atravessando a pontuação;
//  (b) nenhum bloco termina em palavra fraca (lista FRACAS), salvo o último da fala;
//  (c) bloco com no máximo `max + 1` palavras.
// Dentro dessas restrições, quebra na pontuação sempre que possível e escolhe os cortes de menor custo (blocos parecidos).
export const blocosDeLegenda = <T extends {txt: string}>(tks: T[], max: number): T[][] => {
  const n = Math.max(1, Math.floor(max));
  const trechos: T[][] = [[]];
  tks.forEach((t) => { trechos[trechos.length - 1].push(t); if (PONTUA.test(t.txt)) trechos.push([]); });
  // trecho de uma palavra só: junta ao seguinte; se for o último, ao anterior
  const grupos: T[][] = [];
  let carga: T[] = [];
  trechos.filter((tr) => tr.length).forEach((tr) => {
    const g = [...carga, ...tr];
    carga = [];
    if (tr.length === 1 && g.length === 1) carga = g; // ainda sozinho: espera o próximo
    else grupos.push(g);
  });
  if (carga.length) { if (grupos.length) grupos[grupos.length - 1].push(...carga); else grupos.push(carga); }
  const BARRA = 1e5;
  const blocos: T[][] = [];
  grupos.forEach((tr) => {
    const L = tr.length;
    // melhor[i] = menor custo para cobrir as i primeiras palavras; corte[i] = onde começa o último bloco
    const melhor: number[] = [0];
    const corte: number[] = [0];
    for (let i = 1; i <= L; i++) {
      melhor[i] = Infinity;
      for (let tam = 1; tam <= n + 1 && tam <= i; tam++) {
        const ini = i - tam;
        const cruza = tr.slice(ini, i - 1).filter((t) => PONTUA.test(t.txt)).length; // bloco que atravessa pontuação
        const custo = melhor[ini] + 10 + (n - tam) * (n - tam) + (tam > n ? 24 : 0) + cruza * 30 + (tam === 1 && L > 1 ? BARRA : 0) + (i < L && fraca(tr[i - 1].txt) ? BARRA : 0);
        if (custo < melhor[i]) { melhor[i] = custo; corte[i] = ini; }
      }
    }
    const partes: T[][] = [];
    for (let i = L; i > 0; i = corte[i]) partes.unshift(tr.slice(corte[i], i));
    partes.forEach((b) => blocos.push(b));
  });
  return blocos;
};
export const LegendaKaraoke: React.FC<{fala: string; palavras: P[]; estilo: EstiloLegenda}> = ({fala, palavras, estilo}) => {
  const f = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const tks = tempoDasPalavras(fala, palavras as any);
  const max = estilo.porBloco ?? 4;
  const bs = blocosDeLegenda(tks, max);
  let atual = 0;
  bs.forEach((b, i) => { if (f >= b[0].f - 1) atual = i; });
  const bloco = bs[atual] ?? [];
  let falada = -1;
  bloco.forEach((t, i) => { if (f >= t.f) falada = i; });
  const tam = estilo.tamanho ?? 58;
  const contorno = estilo.contorno
    ? {WebkitTextStroke: `${Math.max(2, Math.round(tam / 9))}px ${estilo.contorno}`, paintOrder: 'stroke fill' as any}
    : {};
  const larg = estilo.largura ?? width - 2 * Math.round(width * 0.09);
  return (
    <div style={{position: 'absolute', left: (width - larg) / 2, width: larg, top: estilo.centroY, transform: 'translateY(-50%)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: '0.22em', rowGap: '0.12em', fontFamily: estilo.fonte, fontWeight: estilo.peso ?? 700, fontSize: tam, lineHeight: 1.15, textAlign: 'center', textTransform: estilo.caixaAlta ? 'uppercase' : 'none'}}>
      {bloco.map((t, i) => {
        const s = spring({frame: f - t.f + 2, fps, config: {damping: 13, stiffness: 240}});
        const visivel = f >= t.f - 2;
        const agora = i === falada;
        const naCaixa = agora && estilo.modo === 'caixa';
        return (
          <span key={`${atual}:${i}`} style={{display: 'inline-block', position: 'relative', opacity: visivel ? Math.min(1, s * 1.5) : 0, transform: `translateY(${(1 - s) * 18}px) scale(${(0.88 + s * 0.12) * (agora && estilo.modo === 'cor' ? 1.06 : 1)})`, color: naCaixa ? estilo.corNaCaixa ?? '#0B0B0D' : agora ? estilo.destaque : estilo.cor, padding: naCaixa ? '0 0.14em' : '0', borderRadius: naCaixa ? '0.14em' : 0, background: naCaixa ? estilo.destaque : 'transparent', ...(naCaixa ? {} : contorno)}}>
            {t.txt}
          </span>
        );
      })}
    </div>
  );
};

// ── marca: logo oficial colado por código, nunca desenhado (logo-gi.png já tem fundo transparente) ─────────────────────────────────────────────────
export const LogoGI: React.FC<{altura?: number; direita: number; baixo: number; opacidade?: number}> = ({altura = 56, direita, baixo, opacidade = 1}) => (
  <Img src={staticFile('logo-gi.png')} style={{position: 'absolute', right: direita, bottom: baixo, height: altura, opacity: opacidade}} />
);

// ── planos de imagem: mecanismo comum (normalização, segmentos, agenda de sons) ───────────────────────────────
// COMO USAR (diorama, vetor e cartoon só mudam a câmera e a transição; o resto é daqui):
//  1. normPlano(cena.plano, MOVIMENTOS, 'zoom') -> {imagem, movimento, foco} ou null. Foco 0..1 ([0.5,0.5] se faltar).
//  2. segmentosDePlanos(dados, {fps, movimentos, padrao, quebra?}) -> segmentos {imagem, src, movimento, foco, ini, fim, cenas}
//     em quadros ABSOLUTOS, só sobre cenasValidas. Cena sem plano herda o anterior (a 1ª, o próximo). Cenas seguidas com a
//     mesma imagem viram um segmento (câmera sem emenda); quebra(cena) força um corte antes daquela cena. Só imagens que
//     existem (planoDisponivel + manifesto dados.planos) entram: lista vazia = nenhuma imagem = o template usa o modo procedural.
//  3. agendaDeSons(eventos, {folga: 3}) -> mesmos eventos {f, som, vol, prioridade?} sem dois no mesmo quadro nem a menos de
//     `folga` quadros; o de menor prioridade vai para frente, nunca para antes de 0. Passe TODOS os efeitos do vídeo juntos.
//  Memorize com useMemo por [dados, fps]; tudo é puro e determinístico (nada de relógio, nada de estado entre quadros).
export type PlanoNorm<M extends string = string> = {imagem: string; movimento: M; foco: [number, number]};
export const normPlano = <M extends string>(v: unknown, movimentos: readonly M[], padrao: M): PlanoNorm<M> | null => {
  const o = objeto(v);
  const imagem = typeof o.imagem === 'string' ? o.imagem.trim() : '';
  if (!imagem) return null;
  const f = lista(o.foco);
  const lim01 = (x: unknown) => Math.max(0, Math.min(1, numero(x, 0.5)));
  return {imagem, movimento: umDe(o.movimento, movimentos, padrao), foco: [lim01(f[0]), lim01(f[1])]};
};

export type SegmentoPlano<M extends string = string> = PlanoNorm<M> & {src: string; ini: number; fim: number; cenas: number[]};
export const segmentosDePlanos = <M extends string>(dados: DadosT, opc: {fps: number; movimentos: readonly M[]; padrao: M; quebra?: (cena: Record<string, any>, i: number) => boolean}): SegmentoPlano<M>[] => {
  const validas = cenasValidas(dados);
  const proprio = validas.map((v) => {
    const p = normPlano(v.cena.plano, opc.movimentos, opc.padrao);
    return p && planoDisponivel(dados, p.imagem) ? p : null;
  });
  if (!proprio.some(Boolean)) return [];
  const res = proprio.slice();
  let ult: PlanoNorm<M> | null = null;
  res.forEach((p, k) => { if (p) ult = p; else res[k] = ult; });
  let prox: PlanoNorm<M> | null = null;
  for (let k = res.length - 1; k >= 0; k--) { if (res[k]) prox = res[k]; else res[k] = prox; }
  const segs: SegmentoPlano<M>[] = [];
  validas.forEach((v, k) => {
    const p = res[k];
    const src = p && planoDisponivel(dados, p.imagem);
    if (!p || !src) return;
    const a = Math.round(v.ini * opc.fps);
    const b = Math.max(a + 1, Math.round(v.fim * opc.fps));
    const u = segs[segs.length - 1];
    if (u && u.imagem === p.imagem && !(opc.quebra && opc.quebra(v.cena, v.i))) { u.fim = b; u.cenas.push(v.i); }
    else segs.push({...p, src, ini: a, fim: b, cenas: [v.i]});
  });
  return segs;
};

export type EventoSom = {f: number; som: string; vol?: number; prioridade?: number};
export const agendaDeSons = <E extends EventoSom>(eventos: E[], opc: {folga?: number} = {}): E[] => {
  const folga = Math.max(1, Math.floor(opc.folga ?? 3));
  // maior prioridade primeiro (fica no quadro pedido); empate: o mais cedo, depois a ordem de entrada
  const ordem = eventos.map((e, k) => ({e, k, f: Math.max(0, Math.round(numero(e.f, 0)))})).sort((x, y) => (y.e.prioridade ?? 0) - (x.e.prioridade ?? 0) || x.f - y.f || x.k - y.k);
  const postos: number[] = [];
  const saida = ordem.map(({e, f}) => {
    let q = f;
    for (let mudou = true; mudou; ) {
      mudou = false;
      for (const c of postos) if (Math.abs(q - c) < folga && c + folga > q) { q = c + folga; mudou = true; }
    }
    postos.push(q);
    return {...e, f: q};
  });
  return saida.sort((x, y) => x.f - y.f);
};
