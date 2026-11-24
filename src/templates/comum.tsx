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
export const imagemDoProjeto = (projeto: string, pasta: string, arquivo: unknown): string | null => {
  if (typeof arquivo !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(projeto)) return null;
  const partes = arquivo.split('/');
  if (!partes.length || partes.some((p) => !p || p === '.' || p === '..' || !/^[\w.-]{1,120}$/.test(p))) return null;
  if (!/\.(png|jpe?g|webp)$/i.test(arquivo)) return null;
  return staticFile(`${projeto}/${pasta}/${partes.join('/')}`);
};

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
// palavras que nunca terminam um bloco de legenda (artigo, preposição curta, conjunção)
const FRACAS = new Set(['a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'e', 'que', 'pra', 'para', 'por', 'com', 'se']);
const PONTUA = /[,.:;?!…]$/;
const FIM_FRASE = /[.?!…]$/;
const fraca = (txt: string) => !PONTUA.test(txt) && FRACAS.has(txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''));
// Agrupa em blocos de até `max` palavras (até max+1 só para fugir de palavra fraca no fim): quebra na pontuação e, dentro de
// cada trecho, escolhe os cortes de menor custo (blocos parecidos, nunca terminando em palavra fraca, sem bloco de uma palavra).
// O que sobrar de uma palavra só se junta ao vizinho quando o total cabe em max+1.
export const blocosDeLegenda = <T extends {txt: string}>(tks: T[], max: number): T[][] => {
  const n = Math.max(1, Math.floor(max));
  const trechos: T[][] = [[]];
  tks.forEach((t) => { trechos[trechos.length - 1].push(t); if (PONTUA.test(t.txt)) trechos.push([]); });
  const blocos: T[][] = [];
  trechos.filter((tr) => tr.length).forEach((tr) => {
    const L = tr.length;
    // melhor[i] = menor custo para cobrir as i primeiras palavras do trecho; corte[i] = onde começa o último bloco
    const melhor: number[] = [0];
    const corte: number[] = [0];
    for (let i = 1; i <= L; i++) {
      melhor[i] = Infinity;
      for (let tam = 1; tam <= n + 1 && tam <= i; tam++) {
        const ini = i - tam;
        const ultima = tr[i - 1].txt;
        const custo = melhor[ini] + 10 + (n - tam) * (n - tam) + (tam > n ? 24 : 0) + (tam === 1 && L > 1 ? 60 : 0) + (i < L && fraca(ultima) ? 40 : 0);
        if (custo < melhor[i]) { melhor[i] = custo; corte[i] = ini; }
      }
    }
    const partes: T[][] = [];
    for (let i = L; i > 0; i = corte[i]) partes.unshift(tr.slice(corte[i], i));
    partes.forEach((b) => blocos.push(b));
  });
  for (let i = 0; i < blocos.length; i++) {
    if (blocos[i].length !== 1) continue;
    const ant = blocos[i - 1];
    const seg = blocos[i + 1];
    if (ant && !FIM_FRASE.test(ant[ant.length - 1].txt) && ant.length + 1 <= n + 1) { ant.push(blocos[i][0]); blocos.splice(i, 1); i--; }
    else if (!FIM_FRASE.test(blocos[i][0].txt) && seg && seg.length + 1 <= n + 1) { seg.unshift(blocos[i][0]); blocos.splice(i, 1); i--; }
  }
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
