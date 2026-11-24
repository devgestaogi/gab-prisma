// Template diorama-3d-hud: maquete 3D de brinquedo (estações, peões, câmera contínua) com HUD, pílulas,
// cartão de vidro e carimbo por cima. Receita em DESIGN VIDEOS IA/templates/diorama-3d-hud/TEMPLATE.md.
import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Sequence, useDelayRender, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CorDestaque, Cenas, Fontes, FONTE_SORA, cenasValidas, LegendaKaraoke, LogoGI, Narracao, PropsTemplate, Som, destaqueDe, faixaUtil, marcaDe, palavrasDaCena, quadroDaPalavraT, useDestaque} from '../comum';
import type {DadosT, EstiloLegenda, InfoCena, P} from '../comum';
import {Mundo} from './mundo';
import {CartaoVidro, Carimbo, Pilula, PilhaTopo, segmentosHud} from './hud';
import {temposDeVoo} from './camera';
import {FUNDO, cenasDe, layoutDasCenas, revelacoes} from './tipos';
import {Planos, modoImagem, trocasDePlanos} from './planos';
import type {CenaDio, PosCena} from './tipos';

// amarelo das referências: cor de destaque quando o vídeo não é da marca GI
export const PADRAO_LIVRE = '#FFC83D';

const legendaCom = (destaque: string, centroY: number): EstiloLegenda => ({fonte: FONTE_SORA, peso: 600, tamanho: 52, cor: '#FFFFFF', destaque, modo: 'caixa', corNaCaixa: '#0B0B0D', centroY, porBloco: 4});

// espera as fontes embutidas antes de desenhar as placas no canvas (e segura o render até lá).
// O handle é sempre liberado: ao carregar, ao falhar, no limite de tempo ou se o componente desmontar antes.
const LIMITE_FONTES_MS = 8000;
const useFontesProntas = () => {
  const {delayRender, continueRender} = useDelayRender();
  const [handle] = useState(() => delayRender('fontes do diorama'));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let vivo = true;
    let liberado = false;
    const liberar = () => { if (!liberado) { liberado = true; continueRender(handle); } };
    const pronto = () => { if (vivo) setOk(true); liberar(); };
    const limite = setTimeout(pronto, LIMITE_FONTES_MS);
    Promise.all([document.fonts.load('700 64px Sora'), document.fonts.load('600 64px Sora'), document.fonts.load('700 64px Oswald')])
      .catch(() => null)
      .then(() => { clearTimeout(limite); pronto(); });
    return () => { vivo = false; clearTimeout(limite); liberar(); };
  }, [continueRender, handle]);
  return ok;
};

// quadro (relativo à cena) em que cada elemento de uma cena entra: na palavra falada ou num padrão
const temposDaCena = (c: CenaDio, palavras: P[], dur: number) => {
  const q = (palavra: string | undefined, padrao: number) => quadroDaPalavraT(palavras, palavra, padrao);
  return {
    alerta: q(c.quando?.alerta, 12),
    correcao: q(c.quando?.correcao, 12),
    cta: q(c.quando?.cta, 12),
    cartao: q(c.quando?.cartao, 14),
    carimbo: q(c.quando?.carimbo, Math.max(18, Math.round(dur * 0.5))),
    linhas: (c.cartao?.linhas ?? []).map((l, i) => q(l.palavra, 10 + i * 9)),
  };
};

// pílulas de alerta, correção e CTA da cena: entram na pilha do topo, abaixo do HUD e do capítulo
const PilulasCena: React.FC<{c: CenaDio; info: InfoCena}> = ({c, info}) => {
  const t = temposDaCena(c, info.palavras, info.dur);
  return (
    <>
      {c.alerta ? <Pilula texto={c.alerta} tipo="alerta" f0={t.alerta} /> : null}
      {c.correcao ? <Pilula texto={c.correcao} tipo="correcao" f0={t.correcao} /> : null}
      {c.cta ? <Pilula texto={c.cta} tipo="cta" f0={t.cta} /> : null}
    </>
  );
};

// camadas 2D de uma cena (cartão, carimbo e legenda); HUD, capítulo e pílulas ficam na pilha do topo
const CamadasCena: React.FC<{c: CenaDio; info: InfoCena; legenda: boolean; pos: PosCena}> = ({c, info, legenda, pos}) => {
  const destaque = useDestaque();
  const t = temposDaCena(c, info.palavras, info.dur);
  return (
    <>
      {c.cartao ? <CartaoVidro cartao={c.cartao} f0={t.cartao} palavras={Object.fromEntries(t.linhas.map((x, i) => [i, x]))} topo={pos.cartao} /> : null}
      {c.carimbo ? <Carimbo texto={c.carimbo} f0={t.carimbo} /> : null}
      {legenda ? <LegendaKaraoke fala={c.fala} palavras={info.palavras} estilo={legendaCom(destaque, pos.legenda)} /> : null}
    </>
  );
};

// todos os efeitos sonoros do vídeo em quadros absolutos; dois efeitos a menos de 2 quadros um do outro nunca soam juntos:
// o que vem depois é deslocado 3 quadros (volumes entre 0,25 e 0,5, sempre abaixo da voz)
type Efeito = {som: string; f: number; vol: number};
const planejarSons = (dados: DadosT, imagem: boolean, fps: number): Efeito[] => {
  const cenas = cenasDe(dados);
  const validas = cenasValidas(dados);
  const lista: Efeito[] = [];
  if (!imagem) revelacoes(dados).forEach((t) => lista.push({som: 'pop', f: Math.round(t * fps), vol: 0.4}));
  (imagem ? trocasDePlanos(dados, fps) : temposDeVoo(dados).map((ini) => Math.round(ini * fps))).forEach((f) => lista.push({som: 'whoosh', f, vol: imagem ? 0.35 : 0.4}));
  segmentosHud(dados).forEach((h) => lista.push({som: 'toque', f: Math.round(h.ini * fps), vol: 0.35}));
  validas.forEach((x) => {
    const c = cenas[x.i];
    const from = Math.round(x.ini * fps);
    const dur = Math.max(1, Math.round(x.fim * fps) - from);
    const t = temposDaCena(c, palavrasDaCena(dados, x.i, fps), dur);
    if (c.capitulo) lista.push({som: 'pop', f: Math.round((x.ini + 0.1) * fps), vol: 0.35});
    if (c.alerta) lista.push({som: 'apito', f: from + t.alerta, vol: 0.42});
    if (c.correcao) lista.push({som: 'ding', f: from + t.correcao, vol: 0.5});
    if (c.cta) lista.push({som: 'pop', f: from + t.cta, vol: 0.45});
    if (c.cartao) lista.push({som: 'pop', f: from + t.cartao, vol: 0.4});
    if (c.carimbo) lista.push({som: 'boom', f: from + t.carimbo, vol: 0.5});
  });
  const postos: Efeito[] = [];
  lista.sort((a, b) => a.f - b.f).forEach((e) => {
    const x = {...e, f: Math.max(0, e.f)};
    for (let n = 0; n < 40; n++) {
      const batida = postos.find((p) => Math.abs(p.f - x.f) < 2);
      if (!batida) break;
      x.f = batida.f + 3;
    }
    postos.push(x);
  });
  return postos;
};

export const Diorama: React.FC<PropsTemplate> = ({dados}) => {
  const {fps, width, height} = useVideoConfig();
  const fontesOk = useFontesProntas();
  const cor = useMemo(() => destaqueDe(dados, PADRAO_LIVRE), [dados]);
  const cenas = cenasDe(dados);
  const validas = cenasValidas(dados);
  const imagem = useMemo(() => modoImagem(dados), [dados]);
  const reveal = useMemo(() => (imagem ? [] : revelacoes(dados)), [dados, imagem]);
  const huds = useMemo(() => segmentosHud(dados), [dados]);
  const faixa = faixaUtil(width, height);
  const dur = Number.isFinite(dados.tempo?.duracao) ? dados.tempo.duracao : 0;

  const sons = useMemo(() => planejarSons(dados, imagem, fps), [dados, imagem, fps]);
  const posicoes = useMemo(() => layoutDasCenas(cenasDe(dados)), [dados]);

  return (
    <CorDestaque.Provider value={cor}>
    <AbsoluteFill style={{background: FUNDO, fontFamily: FONTE_SORA}}>
      <Fontes />
      {imagem ? <Planos dados={dados} /> : (
        <>
          {fontesOk ? (
            <ThreeCanvas width={width} height={height} flat dpr={1} gl={{antialias: true}} camera={{fov: 40, near: 0.1, far: 220, position: [0, 20, 20]}}>
              <Mundo dados={dados} cor={cor} />
            </ThreeCanvas>
          ) : null}
          {/* vinheta e escurecimento da base (a legenda precisa de fundo calmo) */}
          <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 40%, rgba(11,11,13,0) 58%, rgba(11,11,13,0.5) 100%)', pointerEvents: 'none'}} />
          <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(11,11,13,0) ${Math.round(faixa.base * 0.72)}px, rgba(11,11,13,0.55) ${faixa.base - 20}px, rgba(11,11,13,0.8) ${height}px)`, pointerEvents: 'none'}} />
        </>
      )}
      <PilhaTopo dados={dados}>
        {validas.map((x) => {
          const from = Math.round(x.ini * fps);
          const dur = Math.max(1, Math.round(x.fim * fps) - from);
          return (
            <Sequence key={x.i} from={from} durationInFrames={dur} layout="none" name={`pilulas ${x.i}`}>
              <PilulasCena c={cenas[x.i]} info={{i: x.i, dur, ini: x.ini, palavras: palavrasDaCena(dados, x.i, fps), primeira: x.i === 0, ultima: x.i === cenas.length - 1}} />
            </Sequence>
          );
        })}
      </PilhaTopo>
      <Cenas dados={dados} render={(_c: any, info) => <CamadasCena c={cenas[info.i]} info={info} legenda={dados.roteiro.legenda !== false} pos={posicoes[info.i]} />} />
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
