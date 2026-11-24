// Template diorama-3d-hud: maquete 3D de brinquedo (estações, peões, câmera contínua) com HUD, pílulas,
// cartão de vidro e carimbo por cima. Receita em DESIGN VIDEOS IA/templates/diorama-3d-hud/TEMPLATE.md.
import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Sequence, useDelayRender, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CorDestaque, Cenas, Fontes, FONTE_SORA, LegendaKaraoke, LogoGI, Narracao, PropsTemplate, Som, destaqueDe, faixaUtil, marcaDe, quadroDaPalavraT, useDestaque} from '../comum';
import type {EstiloLegenda, InfoCena} from '../comum';
import {Mundo} from './mundo';
import {Capitulo, CartaoVidro, Carimbo, Hud, Pilula, segmentosHud} from './hud';
import {temVoo} from './camera';
import {FUNDO, cenasDe, revelacoes} from './tipos';
import type {CenaDio} from './tipos';

// amarelo das referências: cor de destaque quando o vídeo não é da marca GI
export const PADRAO_LIVRE = '#FFC83D';

const legendaCom = (destaque: string): EstiloLegenda => ({fonte: FONTE_SORA, peso: 600, tamanho: 52, cor: '#FFFFFF', destaque, modo: 'caixa', corNaCaixa: '#0B0B0D', centroY: 1110, porBloco: 4});

// espera as fontes embutidas antes de desenhar as placas no canvas (e segura o render até lá)
const useFontesProntas = () => {
  const {delayRender, continueRender} = useDelayRender();
  const [handle] = useState(() => delayRender('fontes do diorama'));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let vivo = true;
    Promise.all([document.fonts.load('700 64px Sora'), document.fonts.load('600 64px Sora'), document.fonts.load('700 64px Oswald')])
      .catch(() => null)
      .then(() => { if (vivo) { setOk(true); continueRender(handle); } });
    return () => { vivo = false; };
  }, [continueRender, handle]);
  return ok;
};

// camadas 2D de uma cena (pílulas, cartão, carimbo e legenda); HUD e capítulo são globais
const CamadasCena: React.FC<{c: CenaDio; info: InfoCena; legenda: boolean}> = ({c, info, legenda}) => {
  const destaque = useDestaque();
  const q = (palavra: string | undefined, padrao: number) => quadroDaPalavraT(info.palavras, palavra, padrao);
  const fAlerta = q(c.quando?.alerta, 12);
  const fCorrecao = q(c.quando?.correcao, 12);
  const fCta = q(c.quando?.cta, 12);
  const fCartao = q(c.quando?.cartao, 14);
  const fCarimbo = q(c.quando?.carimbo, Math.max(18, Math.round(info.dur * 0.5)));
  return (
    <>
      {c.alerta ? <><Pilula texto={c.alerta} tipo="alerta" f0={fAlerta} y={600} /><Som som="apito" f={fAlerta} vol={0.42} /></> : null}
      {c.correcao ? <><Pilula texto={c.correcao} tipo="correcao" f0={fCorrecao} y={600} /><Som som="ding" f={fCorrecao} vol={0.5} /></> : null}
      {c.cta ? <><Pilula texto={c.cta} tipo="cta" f0={fCta} y={600} /><Som som="pop" f={fCta} vol={0.45} /></> : null}
      {c.cartao ? (
        <>
          <CartaoVidro cartao={c.cartao} f0={fCartao} palavras={Object.fromEntries(c.cartao.linhas.map((l, i) => [i, q((l as any).palavra, 10 + i * 9)]))} />
          <Som som="pop" f={fCartao} vol={0.4} />
        </>
      ) : null}
      {c.carimbo ? <><Carimbo texto={c.carimbo} f0={fCarimbo} /><Som som="boom" f={fCarimbo} vol={0.5} /></> : null}
      {legenda ? <LegendaKaraoke fala={c.fala} palavras={info.palavras} estilo={legendaCom(destaque)} /> : null}
    </>
  );
};

export const Diorama: React.FC<PropsTemplate> = ({dados}) => {
  const {fps, width, height} = useVideoConfig();
  const fontesOk = useFontesProntas();
  const cor = useMemo(() => destaqueDe(dados, PADRAO_LIVRE), [dados]);
  const cenas = cenasDe(dados);
  const reveal = useMemo(() => revelacoes(dados), [dados]);
  const huds = useMemo(() => segmentosHud(dados), [dados]);
  const faixa = faixaUtil(width, height);
  const dur = dados.tempo.duracao;

  // sons que não pertencem a uma cena: nascimento das estações, voo da câmera, contador e capítulo
  const sons: {som: string; f: number; vol: number}[] = [
    ...reveal.map((t) => ({som: 'pop', f: Math.round(t * fps), vol: 0.4})),
    ...cenas.map((_, i) => i).filter((i) => temVoo(dados, i)).map((i) => ({som: 'whoosh', f: Math.round(dados.tempo.cenas[i].ini * fps), vol: 0.4})),
    ...huds.map((h) => ({som: 'toque', f: Math.round(h.ini * fps), vol: 0.35})),
    ...cenas.map((c, i) => ({c, i})).filter((x) => x.c.capitulo).map((x) => ({som: 'pop', f: Math.round((dados.tempo.cenas[x.i].ini + 0.1) * fps), vol: 0.35})),
  ];

  return (
    <CorDestaque.Provider value={cor}>
    <AbsoluteFill style={{background: FUNDO, fontFamily: FONTE_SORA}}>
      <Fontes />
      {fontesOk ? (
        <ThreeCanvas width={width} height={height} flat dpr={1} gl={{antialias: true}} camera={{fov: 40, near: 0.1, far: 220, position: [0, 20, 20]}}>
          <Mundo dados={dados} cor={cor} />
        </ThreeCanvas>
      ) : null}
      {/* vinheta e escurecimento da base (a legenda precisa de fundo calmo) */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 40%, rgba(11,11,13,0) 58%, rgba(11,11,13,0.5) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(11,11,13,0) ${Math.round(faixa.base * 0.72)}px, rgba(11,11,13,0.55) ${faixa.base - 20}px, rgba(11,11,13,0.8) ${height}px)`, pointerEvents: 'none'}} />
      <Hud dados={dados} />
      <Capitulo dados={dados} />
      <Cenas dados={dados} render={(c: CenaDio, info) => <CamadasCena c={c} info={info} legenda={dados.roteiro.legenda !== false} />} />
      {sons.map((s, i) => <Som key={i} som={s.som} f={s.f} vol={s.vol} />)}
      {marcaDe(dados) === 'gi' ? (
        <Sequence from={Math.max(0, Math.round((dur - 3) * fps))} layout="none">
          <LogoGI direita={faixa.lateral} baixo={height - faixa.base + 24} />
        </Sequence>
      ) : null}
      <Narracao dados={dados} />
    </AbsoluteFill>
    </CorDestaque.Provider>
  );
};
