// Template vetor-chapado-contador: ilustração vetorial chapada em palco frontal, tudo desenhado por código (SVG).
// Dois modos: "lista" (título fixo + selo numerado, tiktok-05) e "fabula" (contador que acompanha a história, tiktok-04).
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cenas, EstiloLegenda, cenasValidas, FONTE_OSWALD, Fontes, InfoCena, LegendaKaraoke, LogoGI, Narracao, PropsTemplate, Som, quadroDaPalavraT, CorDestaque, destaqueDe, marcaDe, useDestaque} from '../comum';
import {CenarioVetor} from './Cenarios';
import {ObjetoVetor} from './Objetos';
import {Personagem, cabecaDe} from './Personagem';
import {Balao, Contador, Cta, contadorQuadros, Flash, Hud, Impacto, Selo, TituloFixo} from './Elementos';
import {A, L, ZONA, limita} from './util';
import {CenaNorm, normalizaCena, normalizaRoteiro} from './normaliza';

type CenaRot = CenaNorm;

// amarelo das referências: cor de destaque quando o vídeo não é da marca GI
export const PADRAO_LIVRE = '#FFC83D';

const legendaCom = (destaque: string): EstiloLegenda => ({fonte: FONTE_OSWALD, peso: 600, tamanho: 56, cor: '#FFFFFF', destaque, modo: 'cor', caixaAlta: true, contorno: '#000000', centroY: 1110, porBloco: 3});

// objeto no palco: pop com mola + flutuação leve
const ObjetoNoPalco: React.FC<{cena: CenaRot; inicioQ: number}> = ({cena, inicioQ}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o = cena.objeto!;
  const s = spring({frame: f - inicioQ, fps, config: {damping: 10, stiffness: 180, mass: 0.8}});
  const e = o.escala ?? 1;
  const flut = Math.sin(f * 0.07) * 6;
  if (f < inicioQ) return null;
  return (
    <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(${o.x ?? 540} ${(o.y ?? 760) + flut}) scale(${e * Math.max(0.001, s)})`}>
        <ObjetoVetor tipo={o.tipo} f={f - inicioQ} rotulo={o.rotulo} />
      </g>
    </svg>
  );
};

// uma cena: palco (cenário, objeto, personagens) com deriva de câmera; por cima, os elementos gráficos fixos na tela
const CenaVetor: React.FC<{dados: PropsTemplate['dados']; cena: CenaRot; info: InfoCena; anterior?: CenaRot; modo: string; contorno: boolean; temTitulo: boolean}> = ({dados, cena, info, anterior, modo, contorno, temTitulo}) => {
  const f = useCurrentFrame();
  const destaque = useDestaque();
  const pal = info.palavras;
  const q = (p: string | undefined, padrao: number) => quadroDaPalavraT(pal, p, padrao);
  const personagens = cena.personagens ?? [];
  // deriva de câmera
  const deriva = cena.deriva ?? (info.i % 2 === 0 ? 'zoom' : 'pan');
  const t = limita(f / Math.max(1, info.dur), 0, 1);
  const zoom = deriva === 'zoom' ? 1 + 0.035 * t : deriva === 'pan' ? 1.03 : 1;
  const pan = deriva === 'pan' ? (t - 0.5) * 44 : 0;
  const flash = cena.flash ?? null;
  const flashCor = flash?.cor ?? destaque;
  const flashQ = flash ? q(flash.palavra, 0) : 0;
  const impacto = cena.impacto ?? null;
  const hud = cena.hud ?? null;
  const balao = cena.balao;
  const selo = cena.selo;
  const seloRepete = !!(selo && anterior?.selo && String(anterior.selo.numero) === String(selo.numero));
  const topoSelo = temTitulo ? 472 : ZONA.topo + 40;
  const contador = cena.contador;
  const contQ = contador ? q(contador.palavra, 8) : 0;
  const balaoQ = balao ? q(balao.palavra, 16) : 0;
  const impQ = impacto ? q(impacto.palavra, 12) : 0;
  const hudQ = hud ? q(hud.palavra, 8) : 0;
  const objQ = cena.objeto ? q(cena.objeto.palavra, 3) : 0;
  const alvoBalao = balao && personagens.length ? (() => { const p = personagens[limita(balao.de, 0, personagens.length - 1)]; const c = cabecaDe(p); return {x: c.x, y: c.topo + 40}; })() : null;
  const ultima = info.ultima;
  const gi = marcaDe(dados) === 'gi';

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${-pan}px) scale(${zoom})`, transformOrigin: '50% 58%'}}>
        <CenarioVetor cenario={cena.cenario} projeto={dados.projeto} />
        {cena.objeto && <ObjetoNoPalco cena={cena} inicioQ={objQ} />}
        <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} style={{position: 'absolute', left: 0, top: 0}}>
          {personagens.map((p, i) => <Personagem key={i} dados={p} contorno={contorno} f={f} dur={info.dur} inicio={p.palavra ? q(p.palavra, 2 + i * 5) : 2 + i * 5} />)}
        </svg>
      </div>
      {/* vinheta suave nas bordas */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)', pointerEvents: 'none'}} />
      {hud && <Hud tipo={hud.tipo} x={hud.x ?? cena.objeto?.x ?? 540} y={hud.y ?? cena.objeto?.y ?? 760} inicioQ={hudQ} />}
      {balao && <Balao b={balao} alvo={alvoBalao} inicioQ={balaoQ} />}
      {contador && <Contador c={contador} inicioQ={contQ} dur={info.dur} direita={!!selo || modo === 'lista'} topo={selo ? topoSelo + 2 : temTitulo ? 480 : 330} />}
      {selo && <Selo numero={selo.numero} texto={selo.texto} topo={topoSelo} repete={seloRepete} inicio={2} />}
      {impacto && <Impacto texto={impacto.texto} vermelho={impacto.cor === 'vermelho'} y={impacto.y ?? 560} inicioQ={impQ} />}
      {flash && <Flash cor={flashCor} inicioQ={flashQ} />}
      {cena.cta && <Cta texto={cena.cta} topo={temTitulo ? 480 : 440} inicioQ={14} />}
      <LegendaKaraoke fala={cena.fala} palavras={pal} estilo={legendaCom(destaque)} />
      {ultima && gi && <LogoGI altura={60} direita={ZONA.lateral} baixo={A - ZONA.base + 24} opacidade={interpolate(f, [10, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />}
      {/* sons: whoosh na troca, pop em selo, balão e personagem, toque no contador, boom no flash, apito na mira */}
      {!info.primeira && <Som som="whoosh" f={0} vol={0.4} />}
      {selo && !seloRepete && <Som som="pop" f={2} vol={0.5} />}
      {balao && <Som som="pop" f={balaoQ} vol={0.45} />}
      {personagens.length > 0 && <Som som="pop" f={2} vol={0.35} />}
      {cena.objeto && <Som som="pop" f={objQ} vol={0.4} />}
      {contador && [0, 1, 2, 3, 4, 5].map((k) => <Som key={k} som="toque" f={contQ + Math.round(k * (contadorQuadros(contador, info.dur).dura / 6))} vol={0.35} />)}
      {flash && <Som som="boom" f={flashQ} vol={0.55} />}
      {hud && <Som som="apito" f={hudQ + 8} vol={0.3} />}
      {impacto && <Som som="boom" f={impQ} vol={0.4} />}
    </AbsoluteFill>
  );
};

export const Vetor: React.FC<PropsTemplate> = ({dados}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const r = normalizaRoteiro(dados.roteiro as any);
  const cor = destaqueDe(dados, PADRAO_LIVRE);
  const {modo, contorno, titulo, cenas} = r;
  // só as cenas com tempo válido contam (na montagem ao vivo o alinhamento pode não ter chegado nas últimas)
  const validas = cenasValidas(dados);
  const ultimaValida = validas.length ? validas[validas.length - 1].i : -1;
  // cena ativa no quadro atual (o título fixo some nas cenas com titulo:false); sem cena ativa, o título fica
  let ativa = -1;
  validas.forEach(({i, ini}) => { if (f >= Math.round(ini * fps)) ativa = i; });
  const tituloVisivel = !!titulo && cenas[ativa]?.titulo !== false;
  return (
    <CorDestaque.Provider value={cor}>
    <AbsoluteFill style={{background: '#10142B', fontFamily: FONTE_OSWALD}}>
      <Fontes />
      {/* palco vazio (sem cenas, antes da primeira ou depois da última): fundo liso por baixo de tudo */}
      <CenarioVetor cenario={undefined} projeto={dados.projeto} />
      <Cenas dados={dados} render={(cenaCrua, info) => {
        const cena = cenas[info.i] ?? normalizaCena(cenaCrua);
        return <CenaVetor dados={dados} cena={cena} info={{...info, ultima: info.i === ultimaValida}} anterior={cenas[info.i - 1]} modo={modo} contorno={contorno} temTitulo={!!titulo && cena.titulo !== false} />;
      }} />
      {titulo && <TituloFixo linhas={titulo} visivel={tituloVisivel} />}
      <Narracao dados={dados} />
    </AbsoluteFill>
    </CorDestaque.Provider>
  );
};
