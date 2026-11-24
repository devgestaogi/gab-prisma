// Template diorama-3d-hud: maquete 3D de brinquedo (estações, peões, câmera contínua) com HUD, pílulas,
// cartão de vidro e carimbo por cima. Receita em DESIGN VIDEOS IA/templates/diorama-3d-hud/TEMPLATE.md.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Sequence, cancelRender, useDelayRender, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CorDestaque, Cenas, Fontes, FONTE_SORA, LegendaKaraoke, LogoGI, Narracao, PropsTemplate, Som, agendaDeSons, destaqueDe, faixaUtil, marcaDe, palavrasDaCena, quadroDaPalavraT, useDestaque} from '../comum';
import type {DadosT, EstiloLegenda, EventoSom, InfoCena, P} from '../comum';
import {Mundo} from './mundo';
import {CartaoVidro, Carimbo, Pilula, PilhaTopo, segmentosHud} from './hud';
import {DURACAO_VOO, temposDeVoo} from './camera';
import {FUNDO, layoutDasCenas, planejamentoDe, revelacoes} from './tipos';
import {Planos, segmentosDoDiorama, trocasDePlanos} from './planos';
import type {MarcaVeu, Segmento} from './planos';
import {fontesProntas, medir} from './ajuste';
import type {CenaDio, PosCena} from './tipos';

// amarelo das referências: cor de destaque quando o vídeo não é da marca GI
export const PADRAO_LIVRE = '#FFC83D';

const legendaCom = (destaque: string, centroY: number): EstiloLegenda => ({fonte: FONTE_SORA, peso: 600, tamanho: 52, cor: '#FFFFFF', destaque, modo: 'caixa', corNaCaixa: '#0B0B0D', centroY, porBloco: 4});

// Espera as fontes embutidas antes de desenhar qualquer coisa (as placas do canvas e as medidas de texto dependem delas).
// Timeout NÃO significa "fonte carregada": se a Sora ou a Oswald não ficarem prontas no prazo, o render FALHA com erro
// explícito (cancelRender), nunca segue com fonte substituta. As fontes são base64 embutido, então isso só acontece
// se algo estiver muito errado. O handle é sempre liberado: ao carregar, ao falhar ou se o componente desmontar antes.
const LIMITE_FONTES_MS = 8000;
const AMOSTRA = 'Aa Çã é 0123456789';
const FONTES_USADAS: [string, string][] = [['700', 'Sora'], ['600', 'Sora'], ['500', 'Sora'], ['700', 'Oswald']];
// a fonte está de fato disponível quando a largura da amostra difere da das duas fontes de reserva (document.fonts.check
// não é confiável no Chrome headless do render: devolveu false para a Oswald já carregada)
const fonteDisponivel = (peso: string, familia: string) => {
  const w = medir(AMOSTRA, `${peso} 64px '${familia}', serif`);
  return Math.abs(w - medir(AMOSTRA, `${peso} 64px serif`)) > 0.5 && Math.abs(w - medir(AMOSTRA, `${peso} 64px sans-serif`)) > 0.5;
};
const useFontesProntas = () => {
  const {delayRender, continueRender} = useDelayRender();
  const [handle] = useState(() => delayRender('fontes do diorama'));
  const [ok, setOk] = useState(false);
  const liberado = useRef(false);
  // continueRender pode mudar de identidade a cada render: guardado em ref, para o efeito de carga rodar uma vez só
  const continuar = useRef(continueRender);
  continuar.current = continueRender;
  const liberar = useCallback(() => { if (!liberado.current) { liberado.current = true; continuar.current(handle); } }, [handle]);
  // o handle só é solto DEPOIS de o React ter desenhado o diorama com as fontes prontas (efeito pós-commit de ok)
  useEffect(() => { if (ok) liberar(); }, [ok, liberar]);
  useEffect(() => {
    let vivo = true;
    const falha = (motivo: string) => { if (vivo) { vivo = false; try { cancelRender(new Error(`diorama: fontes embutidas (Sora, Oswald) não ficaram prontas: ${motivo}`)); } finally { liberar(); } } };
    const limite = setTimeout(() => falha(`sem resposta em ${LIMITE_FONTES_MS} ms`), LIMITE_FONTES_MS);
    Promise.all(FONTES_USADAS.map(([p, fam]) => document.fonts.load(`${p} 64px ${fam}`, AMOSTRA)))
      .then(() => {
        clearTimeout(limite);
        if (!vivo) return;
        const faltam = FONTES_USADAS.filter(([p, fam]) => !fonteDisponivel(p, fam));
        if (faltam.length) { falha(`não carregaram ${faltam.map(([p, fam]) => `${p} ${fam}`).join(', ')}`); return; }
        fontesProntas(); // daqui em diante as medidas de texto valem (ajuste.ts)
        setOk(true);
      })
      .catch((e) => { clearTimeout(limite); falha(String(e?.message ?? e)); });
    return () => { vivo = false; clearTimeout(limite); liberar(); };
  }, [liberar]);
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
      {c.cartao && pos.cartao ? <CartaoVidro cartao={c.cartao} f0={t.cartao} palavras={Object.fromEntries(t.linhas.map((x, i) => [i, x]))} pos={pos.cartao} /> : null}
      {c.carimbo ? <Carimbo texto={c.carimbo} f0={t.carimbo} /> : null}
      {legenda ? <LegendaKaraoke fala={c.fala} palavras={info.palavras} estilo={legendaCom(destaque, pos.legenda)} /> : null}
    </>
  );
};

// Todo o planejamento do vídeo numa conta só, memorizada por [dados, fps] (nunca refeita por quadro): segmentos do modo
// imagem, posição por cena, nascimento das estações e a agenda de sons inteira em quadros absolutos.
type Plano = {segs: Segmento[]; imagem: boolean; reveal: number[]; posicoes: PosCena[]; marcas: MarcaVeu[]; sons: EventoSom[]};
const planejar = (dados: DadosT, fps: number): Plano => {
  const {cenas, validas} = planejamentoDe(dados);
  const segs = segmentosDoDiorama(dados, fps);
  const imagem = segs.length > 0;
  const reveal = imagem ? [] : revelacoes(dados);
  const posicoes = layoutDasCenas(cenas);
  const marcas = validas.map((t) => ({f: Math.round(t.ini * fps), c: posicoes[t.i]?.legenda ?? 1130}));
  // prioridade decide quem fica no quadro pedido quando dois efeitos colidem (agendaDeSons empurra o de menor prioridade);
  // folga de 3 quadros entre quaisquer dois; volumes de 0,25 a 0,5, sempre abaixo da voz
  const ev: EventoSom[] = [];
  if (!imagem) reveal.forEach((t) => ev.push({som: 'pop', f: Math.round(t * fps), vol: 0.4, prioridade: 1}));
  // o whoosh só vale enquanto a transição acontece: no modo imagem, até 3 quadros depois do início do segmento novo
  // (a entrada visual assenta ali); no mundo 3D, enquanto dura o voo da câmera
  if (imagem) {
    const trocas = trocasDePlanos(segs);
    segs.slice(1).forEach((s, k) => ev.push({som: 'whoosh', f: trocas[k], vol: 0.35, prioridade: 2, ate: s.iniF + 3}));
  } else {
    temposDeVoo(dados).forEach((ini) => {
      const f = Math.round(ini * fps);
      ev.push({som: 'whoosh', f, vol: 0.4, prioridade: 2, ate: f + Math.round(DURACAO_VOO * fps)});
    });
  }
  segmentosHud(dados).forEach((h) => ev.push({som: 'toque', f: Math.round(h.ini * fps), vol: 0.35, prioridade: 2, ate: Math.round((h.ini + h.dur) * fps)}));
  validas.forEach((x) => {
    const c = cenas[x.i];
    const from = Math.round(x.ini * fps);
    const dur = Math.max(1, Math.round(x.fim * fps) - from);
    const t = temposDaCena(c, palavrasDaCena(dados, x.i, fps), dur);
    // ate = fim da Sequence da cena: nenhum som vale depois que o elemento dele (e a cena) saiu
    const ate = from + dur;
    const e = (f: number, som: string, vol: number, prioridade: number): EventoSom => ({f, som, vol, prioridade, ate});
    if (c.capitulo) ev.push(e(Math.round((x.ini + 0.1) * fps), 'pop', 0.35, 3));
    if (c.alerta) ev.push(e(from + t.alerta, 'apito', 0.42, 4));
    if (c.correcao) ev.push(e(from + t.correcao, 'ding', 0.5, 4));
    if (c.cta) ev.push(e(from + t.cta, 'pop', 0.45, 3));
    if (c.cartao) ev.push(e(from + t.cartao, 'pop', 0.4, 3));
    if (c.carimbo) ev.push(e(from + t.carimbo, 'boom', 0.5, 5));
  });
  return {segs, imagem, reveal, posicoes, marcas, sons: agendaDeSons(ev, {folga: 3})};
};

export const Diorama: React.FC<PropsTemplate> = ({dados}) => {
  const {fps, width, height} = useVideoConfig();
  const fontesOk = useFontesProntas();
  const cor = useMemo(() => destaqueDe(dados, PADRAO_LIVRE), [dados]);
  const {cenas, validas} = planejamentoDe(dados);
  // as medidas de texto (layout das pílulas e do capítulo) só valem com as fontes prontas, por isso fontesOk entra na chave
  const {segs, imagem, posicoes, marcas, sons} = useMemo(() => planejar(dados, fps), [dados, fps, fontesOk]); // eslint-disable-line react-hooks/exhaustive-deps
  const faixa = faixaUtil(width, height);
  const dur = Number.isFinite(dados.tempo?.duracao) ? dados.tempo.duracao : 0;

  // sem fontes prontas nada é desenhado (as @font-face precisam estar no DOM para carregarem)
  if (!fontesOk) return <AbsoluteFill style={{background: FUNDO}}><Fontes /></AbsoluteFill>;

  return (
    <CorDestaque.Provider value={cor}>
    <AbsoluteFill style={{background: FUNDO, fontFamily: FONTE_SORA}}>
      <Fontes />
      {imagem ? <Planos segs={segs} marcas={marcas} /> : (
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
