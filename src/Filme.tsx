import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {SORA} from './fonts';
import {Interface, sonsDaInterface} from './Interface';
import {Legenda, Etiqueta, Marcas, Marca, quadrosDasMarcas, camera, pulo, Tela, TelaCheia, sonsDaTela, inicioDaTela} from './Vivo';
import {TEMPLATES} from './templates';

export type Cena = {
  id: string; fala: string; personagem: string | null; texto: string | null;
  interface: any; fundo: 'claro' | 'forte';
  ajuste?: Ajuste;
  personagem2?: string | null; // segundo personagem, lado a lado (ex.: Ítalo e Leo)
  marcas?: Marca[]; // ícones/etiquetas que pulam quando a voz fala a palavra
  tela?: Tela; // tela cheia com arte do designer (processos, vendas…)
};
// Ajuste do personagem na cena (painel MOVIMENTO do estúdio).
export type Ajuste = {x?: number; y?: number; escala?: number; rotacao?: number; opacidade?: number; movimento?: 'quica' | 'pop' | 'balanca' | 'desliza' | 'reta'};

// Sons de uma cena em quadros contados do começo dela (o estúdio usa a mesma conta para a faixa EFEITOS).
export const sonsDaCena = (cena: Cena, primeira: boolean, temPersonagem: boolean, palavras: {p: string; ini: number; f: number}[]) => [
  ...(!primeira ? [{som: 'whoosh', f: 0, vol: 0.5}] : []),
  ...(temPersonagem ? [{som: 'pop', f: 1, vol: 0.8}] : []),
  ...(temPersonagem && cena.personagem2 ? [{som: 'pop', f: 6, vol: 0.7}] : []),
  ...sonsDaInterface(cena.interface, palavras),
  ...quadrosDasMarcas(cena.marcas, palavras).map((f, k) => ({som: cena.marcas![k].som || 'pop', f, vol: 0.55})),
  ...sonsDaTela(cena.tela, palavras),
];
export const palavrasDaCena = (dados: Dados, i: number, fps: number) => {
  const t = dados.tempo.cenas[i];
  return dados.tempo.palavras.filter((w) => w.ini >= t.ini - 0.05 && w.ini < t.fim).map((w) => ({...w, f: Math.round((w.ini - t.ini) * fps)}));
};
export type Palavra = {p: string; ini: number; fim: number};
export type Dados = {
  projeto: string;
  // template: nome do template de edição (DESIGN VIDEOS IA/templates); sem ele, estilo Prisma
  roteiro: {template?: string; formato: {largura: number; altura: number; fps: number}; cores: Record<string, string>; cenas: Cena[]; legenda?: boolean; [k: string]: any};
  tempo: {duracao: number; cenas: {id: string; ini: number; fim: number}[]; palavras: Palavra[]};
  personagens: string[];
  semVoz?: boolean; // estúdio: voz ainda não entrou (tempo estimado)
};

// Fonte embutida em base64, sem delayRender (loadFont trava o render em lote — ver memória do vídeo do Centro).
const FONT_CSS = [300, 400, 500, 600, 700]
  .map((w) => `@font-face{font-family:'Sora';src:url(${SORA[w]}) format('woff2');font-weight:${w};font-display:block;}`)
  .join('');
export const FONT = "'Sora', system-ui, sans-serif";

// Personagens que se mexem diferente do balanço padrão.
const TREMOR: Record<string, number> = {microfone: 7, cafe: 4};
const FOLEGO = new Set(['extintor']);

export const Filme: React.FC<{projeto: string; dados: Dados | null}> = ({dados}) => {
  const {fps} = useVideoConfig();
  if (!dados) return null;
  const T = dados.roteiro.template ? TEMPLATES[dados.roteiro.template] : undefined;
  if (T) return <T dados={dados as any} />;
  const C = dados.roteiro.cores;
  return (
    <AbsoluteFill style={{background: C.fundoClaro, fontFamily: FONT}}>
      <style>{FONT_CSS}</style>
      <div style={{position: 'absolute', opacity: 0, fontFamily: 'Sora', fontWeight: 700}}>Aa Çã é</div>
      <FundoClaro cor={C.destaque} />
      {dados.roteiro.cenas.map((c, i) => {
        const t = dados.tempo.cenas[i];
        const from = Math.round(t.ini * fps);
        const dur = Math.max(1, Math.round(t.fim * fps) - from);
        const palavras = palavrasDaCena(dados, i, fps);
        return (
          <Sequence key={c.id} from={from} durationInFrames={dur} name={`${c.id} · ${c.texto ?? c.interface?.tipo ?? ''}`}>
            <CenaView legenda={dados.roteiro.legenda !== false} cena={c} dur={dur} cores={C} temPersonagem={!!c.personagem && dados.personagens.includes(c.personagem)} projeto={dados.projeto} palavras={palavras} primeira={i === 0} />
          </Sequence>
        );
      })}
      {!dados.semVoz && <Audio src={staticFile(`${dados.projeto}/narracao.wav`)} />}
    </AbsoluteFill>
  );
};

const FundoClaro: React.FC<{cor: string}> = ({cor}) => {
  const f = useCurrentFrame();
  const bolha = (x: number, y: number, r: number, v: number, o: number) => (
    <div style={{position: 'absolute', left: x + Math.sin(f / v) * 40, top: y + Math.cos(f / (v * 1.3)) * 50, width: r, height: r, borderRadius: '50%', background: cor, opacity: o, filter: 'blur(120px)'}} />
  );
  return (
    <AbsoluteFill style={{background: 'radial-gradient(120% 80% at 50% 40%, #FFFFFF 0%, #F6F3EF 60%, #EFE8E0 100%)'}}>
      {bolha(-200, 200, 700, 50, 0.16)}
      {bolha(600, 1300, 800, 63, 0.14)}
    </AbsoluteFill>
  );
};

const CenaView: React.FC<{legenda: boolean; cena: Cena; dur: number; cores: Record<string, string>; temPersonagem: boolean; projeto: string; palavras: (Palavra & {f: number})[]; primeira: boolean}> = ({legenda, cena, dur, cores, temPersonagem, projeto, palavras, primeira}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entra = interpolate(f, [0, 9], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const forte = cena.fundo === 'forte';
  const sons = sonsDaCena(cena, primeira, temPersonagem, palavras);
  const semPers = !temPersonagem;
  const qm = quadrosDasMarcas(cena.marcas, palavras);
  const chaves = [...(cena.texto ?? '').split(/\s+/), ...(cena.marcas ?? []).map((m) => m.palavra)];
  // a etiqueta só aparece quando diz algo que a legenda não diz (antes repetia as mesmas palavras em cima da legenda)
  const nt = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const falaN = nt(cena.fala);
  const etiquetaRepete = !!cena.texto && (falaN.includes(nt(cena.texto)) || cena.texto.split(/\s+/).map(nt).filter((w) => w.length > 3).every((w, _, l) => l.length > 0 && falaN.includes(w.slice(0, 5))) && cena.texto.split(/\s+/).some((w) => nt(w).length > 3));
  return (
    <AbsoluteFill style={{transform: `translateY(${entra * 90}px) scale(${1 + entra * 0.04})`}}>
      {forte && <AbsoluteFill style={{background: `radial-gradient(90% 70% at 50% 45%, #F58A4E 0%, ${cores.destaque} 55%, #D9601F 100%)`}} />}
      <AbsoluteFill style={{transform: `scale(${camera(f, dur, qm)})`, transformOrigin: '50% 55%'}}>
      {legenda && cena.fala ? (
        <>
          {cena.texto && !etiquetaRepete && <Etiqueta texto={cena.texto} cor={forte ? cores.destaque : '#FFFFFF'} fundo={forte ? '#FFFFFF' : cores.destaque} />}
          <Legenda fala={cena.fala} palavras={palavras} chaves={chaves} cor={forte ? '#FFFFFF' : cores.tinta} destaque={forte ? '#1A1A1A' : cores.destaque} />
        </>
      ) : cena.texto && <Titulo texto={cena.texto} cor={forte ? '#FFFFFF' : cores.tinta} destaque={forte ? '#1A1A1A' : cores.destaque} />}
      {temPersonagem && <Personagem nome={cena.personagem!} projeto={projeto} baixo={!cena.interface} ajuste={cena.ajuste ?? {}} lado={cena.personagem2 ? -1 : 0} pulos={qm} />}
      {temPersonagem && cena.personagem2 && <Personagem nome={cena.personagem2} projeto={projeto} baixo={!cena.interface} ajuste={cena.ajuste ?? {}} lado={1} pulos={qm} />}
      {cena.marcas?.length ? <Marcas marcas={cena.marcas} quadros={qm} cores={cores} dupla={!!cena.personagem2} /> : null}
      {cena.interface && (
        <div style={{position: 'absolute', left: 70, right: 70, top: semPers ? (cena.texto ? 560 : 420) : 1330, bottom: semPers ? 300 : undefined}}>
          <Interface i={cena.interface} cores={cores} palavras={palavras} grande={semPers} />
        </div>
      )}
      {cena.tela && <TelaCheia tela={cena.tela} projeto={projeto} palavras={palavras} cores={cores} dur={dur} />}
      {cena.tela && legenda && cena.fala && f >= inicioDaTela(cena.tela, palavras) && (
        <div style={{position: 'absolute', inset: 0, zIndex: 9}}>
          <Legenda fala={cena.fala} palavras={palavras} chaves={chaves} cor={cores.tinta} destaque={cores.destaque} cartao />
        </div>
      )}
      </AbsoluteFill>
      {sons.map((s, k) => (
        <Sequence key={k} from={s.f} durationInFrames={Math.round(fps * 1.5)} layout="none">
          <Audio src={staticFile(`sons/${s.som}.wav`)} volume={s.vol ?? 0.7} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const Titulo: React.FC<{texto: string; cor: string; destaque: string}> = ({texto, cor, destaque}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ps = texto.split(' ');
  const tam = texto.length > 20 ? 88 : texto.length > 14 ? 100 : 116;
  return (
    <div style={{position: 'absolute', top: 230, left: 70, right: 70, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.26em', textAlign: 'center', fontSize: tam}}>
      {ps.map((p, i) => {
        const s = spring({frame: f + 2 - i * 3, fps, config: {damping: 12, stiffness: 180}});
        return (
          <span key={i} style={{display: 'inline-block', fontSize: tam, fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.035em', color: i === ps.length - 1 && ps.length > 1 ? destaque : cor, transform: `translateY(${(1 - s) * 50}px) scale(${0.85 + s * 0.15})`, opacity: Math.min(1, s * 1.5)}}>{p}</span>
        );
      })}
    </div>
  );
};

const Personagem: React.FC<{nome: string; projeto: string; baixo: boolean; ajuste: Ajuste; lado?: number; pulos?: number[]}> = ({nome, projeto, baixo, ajuste, lado = 0, pulos = []}) => {
  const f = useCurrentFrame() - (lado === 1 ? 5 : 0);
  const {fps} = useVideoConfig();
  const mov = ajuste.movimento ?? 'quica';
  const cfg = mov === 'pop' ? {damping: 14, stiffness: 260, mass: 0.6} : mov === 'desliza' || mov === 'reta' ? {damping: 200} : {damping: 9, stiffness: 140, mass: 0.8};
  const s = spring({frame: f + 1, fps, config: cfg});
  const parado = mov === 'reta';
  const tr = parado ? 0 : TREMOR[nome] ?? 0;
  const jx = tr ? Math.sin(f * 2.7) * tr : 0;
  const jy = tr ? Math.cos(f * 3.3) * tr * 0.6 : 0;
  const bob = (parado ? 0 : Math.sin(f / 9) * (mov === 'pop' ? 6 : 12)) + pulo(useCurrentFrame(), pulos);
  const rot = (parado ? 0 : Math.sin(f / 14) * (mov === 'balanca' ? 7 : 2.5)) + (ajuste.rotacao ?? 0);
  const folego = FOLEGO.has(nome) && !parado ? 1 + Math.sin(f / 4) * 0.025 : 1;
  const esc = (ajuste.escala ?? 100) / 100;
  const entraX = mov === 'desliza' ? (1 - s) * 700 : 0;
  const sx = mov === 'desliza' || mov === 'reta' ? 1 : s;
  const sy = mov === 'desliza' || mov === 'reta' ? 1 : 0.6 + s * 0.4;
  const op = (ajuste.opacidade ?? 100) / 100 * (mov === 'desliza' || mov === 'reta' ? Math.min(1, s * 1.5) : 1);
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: baixo ? 620 : 540, height: baixo ? 900 : 760, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translate(${(ajuste.x ?? 0) + lado * 225}px, ${(ajuste.y ?? 0) + (lado ? 110 : 0)}px) scale(${esc * (lado ? 0.9 : 1)})`, opacity: op}}>
      <div style={{position: 'absolute', bottom: 10, width: 420, height: 60, borderRadius: '50%', background: 'rgba(60,30,10,0.16)', filter: 'blur(18px)', transform: `scaleX(${0.8 + s * 0.2 - bob / 200})`}} />
      <Img src={staticFile(`${projeto}/personagens/${nome}.png`)} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: `translate(${jx + entraX}px, ${bob + jy}px) rotate(${rot}deg) scale(${sx * folego}, ${sy * folego})`, transformOrigin: '50% 100%'}} />
    </div>
  );
};
