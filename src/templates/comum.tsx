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
  const t = dados.tempo.cenas[i];
  if (!t) return [];
  return dados.tempo.palavras.filter((w) => w.ini >= t.ini - 0.05 && w.ini < t.fim).map((w) => ({p: w.p, ini: w.ini, f: Math.round((w.ini - t.ini) * fps)}));
};
// quadro (relativo à cena) em que a voz diz a palavra; padrao se a palavra não aparece
export const quadroDaPalavraT = (palavras: P[], palavra: string | undefined, padrao: number) => {
  if (!palavra) return padrao;
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const alvo = n(palavra);
  const w = palavras.find((x) => { const m = n(x.p); return m && (m === alvo || (alvo.length > 3 && m.startsWith(alvo.slice(0, 4)))); });
  return w ? w.f : padrao;
};

export type InfoCena = {i: number; dur: number; ini: number; palavras: P[]; primeira: boolean; ultima: boolean};
// cada cena numa Sequence, do começo da fala dela até a próxima (tempo.json do alinhar.mjs)
export const Cenas: React.FC<{dados: DadosT; render: (cena: any, info: InfoCena) => React.ReactNode}> = ({dados, render}) => {
  const {fps} = useVideoConfig();
  const n = dados.roteiro.cenas.length;
  return (
    <>
      {dados.roteiro.cenas.map((c, i) => {
        const t = dados.tempo.cenas[i];
        if (!t) return null;
        const from = Math.round(t.ini * fps);
        const dur = Math.max(1, Math.round(t.fim * fps) - from);
        return (
          <Sequence key={c.id ?? i} from={from} durationInFrames={dur} name={`${c.id ?? i}`}>
            {render(c, {i, dur, ini: t.ini, palavras: palavrasDaCena(dados, i, fps), primeira: i === 0, ultima: i === n - 1})}
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
export const LegendaKaraoke: React.FC<{fala: string; palavras: P[]; estilo: EstiloLegenda}> = ({fala, palavras, estilo}) => {
  const f = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const tks = tempoDasPalavras(fala, palavras as any);
  const max = estilo.porBloco ?? 4;
  const blocos: (typeof tks)[] = [[]];
  tks.forEach((t) => {
    const b = blocos[blocos.length - 1];
    b.push(t);
    if (/[,.:;?!…]$/.test(t.txt) || b.length >= max) blocos.push([]);
  });
  const bs = blocos.filter((b) => b.length);
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
