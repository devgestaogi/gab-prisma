// Template vetor-chapado-contador: ilustração vetorial chapada em palco frontal, tudo desenhado por código (SVG).
// Dois modos: "lista" (título fixo + selo numerado, tiktok-05) e "fabula" (contador que acompanha a história, tiktok-04).
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cenas, EstiloLegenda, EventoSom, cenasValidas, FONTE_OSWALD, Fontes, InfoCena, LegendaKaraoke, LogoGI, Narracao, PropsTemplate, Som, agendaDeSons, lista, palavrasDaCena, quadroDaPalavraT, segmentosDePlanos, CorDestaque, destaqueDe, marcaDe, useDestaque} from '../comum';
import {CenarioVetor} from './Cenarios';
import {ObjetoVetor} from './Objetos';
import {Personagem, cabecaDe} from './Personagem';
import {Balao, Contador, Cta, alturaBalao, alturaCta, contadorQuadros, Flash, Hud, Impacto, medidaImpacto, Selo, TituloFixo} from './Elementos';
import {MOVIMENTOS, PlanoImagem, VeuLegenda} from './Planos';
import {Slot, centroDaLegenda, empilha} from './posicao';
import {A, L, ZONA, limita} from './util';
import {CenaNorm, normalizaCena, normalizaRoteiro} from './normaliza';

type CenaRot = CenaNorm;

// amarelo das referências: cor de destaque quando o vídeo não é da marca GI
export const PADRAO_LIVRE = '#FFC83D';

const legendaCom = (destaque: string, centroY = 1110): EstiloLegenda => ({fonte: FONTE_OSWALD, peso: 600, tamanho: 56, cor: '#FFFFFF', destaque, modo: 'cor', caixaAlta: true, contorno: '#000000', centroY, porBloco: 3});

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

// Planejamento do vídeo inteiro, puro e memorizado em Vetor por [dados, fps]: por cena, a posição calculada dos gráficos (pilha de
// cartões no mesmo eixo, cedendo à legenda e ao cabeçalho), os quadros das palavras-gatilho e os efeitos sonoros; os sons de TODAS
// as cenas passam juntos por agendaDeSons (quadros absolutos), que os afasta e garante um só por quadro.
type PlanoCena = {comPlano: boolean; modoPos: boolean; legY: number; pos: Record<string, Slot>; topoSelo: number; seloRepete: boolean; q: {cont: number; balao: number; imp: number; hud: number; obj: number; flash: number}};

const planeja = (dados: PropsTemplate['dados'], fps: number, cenas: CenaRot[], titulo: unknown, comPlano: Set<number>) => {
  const porCena: Record<number, PlanoCena> = {};
  const evs: EventoSom[] = [];
  cenasValidas(dados).forEach(({i, cena: crua, ini, fim}) => {
    const cena = cenas[i] ?? normalizaCena(crua);
    const anterior = cenas[i - 1];
    const a = Math.round(ini * fps), dur = Math.max(1, Math.round(fim * fps) - a);
    const pal = palavrasDaCena(dados, i, fps);
    const q = (p: string | undefined, padrao: number) => quadroDaPalavraT(pal, p, padrao);
    const temTitulo = !!titulo && cena.titulo !== false;
    const {selo, contador, balao, impacto, hud, flash} = cena;
    const personagens = cena.personagens ?? [];
    const seloRepete = !!(selo && anterior?.selo && String(anterior.selo.numero) === String(selo.numero));
    const topoSelo = temTitulo ? 472 : ZONA.topo + 40;
    const qs = {cont: contador ? q(contador.palavra, 8) : 0, balao: balao ? q(balao.palavra, 16) : 0, imp: impacto ? q(impacto.palavra, 12) : 0, hud: hud ? q(hud.palavra, 8) : 0, obj: cena.objeto ? q(cena.objeto.palavra, 3) : 0, flash: flash ? q(flash.palavra, 0) : 0};
    const modoPos = comPlano.has(i) || !!cena.layout;
    const cabecalho = selo ? topoSelo + 76 : temTitulo ? 450 : 0;
    const legY = modoPos ? centroDaLegenda(cena.layout?.legenda ?? 'baixo', cabecalho) : 1110;
    const blocos: {chave: string; altura: number}[] = [];
    if (modoPos) {
      if (contador) blocos.push({chave: 'contador', altura: 128}); // 88 da pílula + 40 de folga para os números que sobem
      if (balao) blocos.push({chave: 'balao', altura: alturaBalao(balao.texto) + 60}); // corpo + cauda
      if (impacto) { const m = medidaImpacto(impacto.texto, 130); blocos.push({chave: 'impacto', altura: m.linhas.length * m.tam + 24}); }
      if (cena.cta) blocos.push({chave: 'cta', altura: alturaCta(cena.cta)});
    }
    porCena[i] = {comPlano: comPlano.has(i), modoPos, legY, pos: empilha(blocos, cena.layout?.cartao ?? 'meio', legY, cabecalho), topoSelo, seloRepete, q: qs};
    // ate = fim da Sequence da cena: o som de um gráfico não vale depois que a cena (e o gráfico com ela) saiu
    const e = (f: number, som: string, vol: number, prioridade = 1): EventoSom => ({f: a + f, som, vol, prioridade, ate: a + dur});
    if (i !== 0) evs.push(e(0, 'whoosh', 0.4, 0));
    if (i === 0 && temTitulo) evs.push(e(2, 'pop', 0.45));
    if (selo && !seloRepete) evs.push(e(2, 'pop', 0.5));
    if (personagens.length > 0) evs.push(e(2, 'pop', 0.35));
    if (balao) evs.push(e(qs.balao, 'pop', 0.45));
    if (cena.objeto) evs.push(e(qs.obj, 'pop', 0.4));
    if (flash) evs.push(e(qs.flash, 'boom', 0.5));
    if (hud) evs.push(e(qs.hud + 8, 'apito', 0.3));
    if (impacto) evs.push(e(qs.imp, 'boom', 0.4));
    if (cena.cta) evs.push(e(14, 'pop', 0.4));
    if (contador) [0, 1, 2, 3, 4, 5].forEach((k) => evs.push(e(qs.cont + Math.round(k * (contadorQuadros(contador, dur).dura / 6)), 'toque', 0.35, 0)));
  });
  return {porCena, sons: agendaDeSons(evs, {folga: 3})};
};

// uma cena: palco (personagens, objeto, e o cenário SVG quando não há imagem) com deriva de câmera; por cima, os elementos gráficos fixos
const CenaVetor: React.FC<{dados: PropsTemplate['dados']; cena: CenaRot; info: InfoCena; plan: PlanoCena; modo: string; contorno: boolean; temTitulo: boolean}> = ({dados, cena, info, plan, modo, contorno, temTitulo}) => {
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
  const impacto = cena.impacto ?? null;
  const hud = cena.hud ?? null;
  const balao = cena.balao;
  const selo = cena.selo;
  const contador = cena.contador;
  const {comPlano, modoPos, legY, pos, topoSelo, seloRepete, q: qq} = plan;
  const alvoBalao = balao && personagens.length ? (() => { const p = personagens[limita(balao.de, 0, personagens.length - 1)]; const c = cabecaDe(p); return {x: c.x, y: c.topo + 40}; })() : null;
  const ultima = info.ultima;
  const gi = marcaDe(dados) === 'gi';
  // cartão reduzido (pilha que não coube a 100%): escala em torno do centro do eixo e do topo do próprio slot
  const esc = (chave: string, el: React.ReactElement) => (modoPos && pos[chave] && pos[chave].escala < 1 ? <div style={{position: 'absolute', inset: 0, transform: `scale(${pos[chave].escala})`, transformOrigin: `540px ${pos[chave].top}px`}}>{el}</div> : el);

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', inset: 0, transform: comPlano ? undefined : `translateX(${-pan}px) scale(${zoom})`, transformOrigin: '50% 58%'}}>
        {!comPlano && <CenarioVetor cenario={cena.cenario} projeto={dados.projeto} />}
        {cena.objeto && <ObjetoNoPalco cena={cena} inicioQ={qq.obj} />}
        <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} style={{position: 'absolute', left: 0, top: 0}}>
          {personagens.map((p, i) => <Personagem key={i} dados={p} contorno={contorno} f={f} dur={info.dur} inicio={p.palavra ? q(p.palavra, 2 + i * 5) : 2 + i * 5} />)}
        </svg>
      </div>
      {/* vinheta suave nas bordas */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)', pointerEvents: 'none'}} />
      {comPlano && <VeuLegenda centro={legY} />}
      {hud && <Hud tipo={hud.tipo} x={hud.x ?? cena.objeto?.x ?? 540} y={hud.y ?? cena.objeto?.y ?? 760} inicioQ={qq.hud} />}
      {balao && esc('balao', <Balao b={modoPos ? {...balao, y: pos.balao.top + alturaBalao(balao.texto)} : balao} alvo={alvoBalao} inicioQ={qq.balao} fixo={modoPos} />)}
      {contador && esc('contador', <Contador c={modoPos ? {...contador, y: undefined} : contador} inicioQ={qq.cont} dur={info.dur} direita={!modoPos && (!!selo || modo === 'lista')} topo={modoPos ? pos.contador.top + 40 : selo ? topoSelo + 2 : temTitulo ? 480 : 330} />)}
      {selo && <Selo numero={selo.numero} texto={selo.texto} topo={topoSelo} repete={seloRepete} inicio={2} centro={modoPos} />}
      {impacto && esc('impacto', <Impacto texto={impacto.texto} vermelho={impacto.cor === 'vermelho'} y={modoPos ? pos.impacto.top : impacto.y ?? 560} inicioQ={qq.imp} tamMax={modoPos ? 130 : undefined} />)}
      {flash && <Flash cor={flashCor} inicioQ={qq.flash} />}
      {cena.cta && esc('cta', <Cta texto={cena.cta} topo={modoPos ? pos.cta.top : temTitulo ? 480 : 440} inicioQ={14} />)}
      <LegendaKaraoke fala={cena.fala} palavras={pal} estilo={legendaCom(destaque, legY)} />
      {ultima && gi && <LogoGI altura={60} direita={ZONA.lateral} baixo={A - ZONA.base + 24} opacidade={interpolate(f, [10, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />}
    </AbsoluteFill>
  );
};

export const Vetor: React.FC<PropsTemplate> = ({dados}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const r = React.useMemo(() => normalizaRoteiro(dados.roteiro as any), [dados]);
  const cor = destaqueDe(dados, PADRAO_LIVRE);
  const {modo, contorno, titulo, cenas} = r;
  // só as cenas com tempo válido contam (na montagem ao vivo o alinhamento pode não ter chegado nas últimas)
  const validas = React.useMemo(() => cenasValidas(dados), [dados]);
  // segmentos de imagem (comum): cenas seguidas com a mesma imagem; [] = sem plano nenhum, cenário SVG de sempre
  const segs = React.useMemo(() => segmentosDePlanos(dados, {fps, movimentos: MOVIMENTOS, padrao: 'deriva'}), [dados, fps]);
  const plano = React.useMemo(() => planeja(dados, fps, cenas, titulo, new Set(segs.flatMap((s) => s.cenas))), [dados, fps, cenas, titulo, segs]);
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
      {/* imagem do plano: uma camada por segmento, fora das Sequences de cena (o Img não remonta entre cenas do mesmo segmento) */}
      {segs.map((s) => (
        <Sequence key={`${s.imagem}:${s.ini}`} from={s.ini} durationInFrames={Math.max(1, s.fim - s.ini)} name={`plano ${s.imagem}`}>
          <PlanoImagem src={s.src} movimento={s.movimento} foco={s.foco} total={s.fim - s.ini} />
        </Sequence>
      ))}
      <Cenas dados={dados} render={(cenaCrua, info) => {
        const cena = cenas[info.i] ?? normalizaCena(cenaCrua);
        return <CenaVetor dados={dados} cena={cena} info={{...info, ultima: info.i === ultimaValida}} plan={plano.porCena[info.i]} modo={modo} contorno={contorno} temTitulo={!!titulo && cena.titulo !== false} />;
      }} />
      {titulo && <TituloFixo linhas={titulo} visivel={tituloVisivel} />}
      <Narracao dados={dados} />
      {/* sons: whoosh na troca, pop no título, selo, balão, personagem e CTA, toque no contador, boom no flash e no impacto,
          apito na mira; agenda única do vídeo (agendaDeSons, quadros absolutos): nunca dois no mesmo quadro nem a menos de 3 quadros */}
      {plano.sons.map((e, k) => <Som key={k} som={e.som} f={e.f} vol={e.vol} />)}
    </AbsoluteFill>
    </CorDestaque.Provider>
  );
};
