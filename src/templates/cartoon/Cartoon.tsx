// Template cartoon-2d-cenario-3d: personagens 2D chapados (SVG) dentro de cenários 3D procedurais (three),
// com profundidade de campo fingida (blur no fundo), câmera que nunca para, vinheta, grão, inserts de
// objeto-prova e transição por obstáculo. Tudo determinístico por quadro. Veja LEIAME.md na pasta.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cenas, EstiloLegenda, FONTE_SORA, Fontes, InfoCena, LegendaKaraoke, LogoGI, Narracao, PropsTemplate, Som, cenasValidas, destaqueDe, faixaUtil, imagemDoProjeto, numero, objeto, palavrasDaCena, quadroDaPalavraT, texto, umDe} from '../comum';
import {BASES, Cam, Cenario3D, CenarioProps, CenarioTipo, Hora, V3} from './set3d';
import {Luz, Personagem, PersonagemRot, normPersonagens} from './personagens';
import {Insert, InsertView, normInsert, quadroDeEntrada} from './inserts';
import {graoDataUrl} from './texturas';
import {clamp, lerp, senoide, suave} from './util';
import {AcabamentoPlano, LEGENDA_Y, Layout, Plano, PlanoImagem, Segmento, SomF, normLayout, normPlano, posInsert, segmentosDePlanos, sonsDoInsert} from './planos';

type CameraRot = {tipo: 'push' | 'dolly' | 'plongee' | 'pan'; intensidade: number; pos?: V3; alvo?: V3};
type ObjetoObstaculo = 'pessoa' | 'porta' | 'celular' | 'parede';
type CenaRot = {
  id: string; fala: string;
  cenario: {tipo: CenarioTipo; hora: Hora; luz: 'quente' | 'fria'; quadro: boolean; placa?: string; imagem: string | null};
  camera: CameraRot; foco: number; personagens: PersonagemRot[]; insert?: Insert; transicao: ObjetoObstaculo | null;
  plano: Plano | null; layout: Layout;
};

// ── normalização: a cena chega de agente ou de montagem ao vivo (pode faltar campo ou vir com tipo errado) ─────────
const TIPOS_CEN: readonly CenarioTipo[] = ['sala', 'escritorio', 'varanda', 'porta'];
const v3 = (v: unknown): V3 | undefined => (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) ? ([v[0], v[1], v[2]] as V3) : undefined);
export const normTransicao = (v: unknown): ObjetoObstaculo | null => {
  if (v === 'obstaculo') return 'porta';
  const o = objeto(v);
  if (o.tipo === 'obstaculo') return umDe(o.objeto, ['pessoa', 'porta', 'celular', 'parede'] as const, 'porta');
  return null;
};
// Entre planos de imagem o obstáculo é o padrão ("corte" faz corte seco): borda de parede em primeiro plano.
// Mesma imagem em cenas seguidas não troca de plano, então o padrão aí é não ter obstáculo. Sem plano em nenhuma das
// duas pontas, vale a regra antiga (só obstáculo declarado).
export const transicaoDaCena = (cena: any, anterior: any, projeto: string): ObjetoObstaculo | null => {
  const plano = normPlano(objeto(cena).plano, projeto);
  const antes = anterior ? normPlano(objeto(anterior).plano, projeto) : null;
  if (!plano && !antes) return normTransicao(objeto(cena).transicao);
  const tr = objeto(cena).transicao;
  if (tr === 'corte' || objeto(tr).tipo === 'corte') return null;
  if (tr === 'obstaculo') return 'parede';
  if (objeto(tr).tipo === 'obstaculo') return umDe(objeto(tr).objeto, ['pessoa', 'porta', 'celular', 'parede'] as const, 'parede');
  return plano && antes && plano.src === antes.src ? null : 'parede';
};
const normCena = (c: unknown, projeto: string): CenaRot => {
  const o = objeto(c);
  const cen = objeto(o.cenario);
  const imagem = imagemDoProjeto(projeto, 'cenarios', cen.imagem);
  const tipo = umDe(cen.tipo, TIPOS_CEN, 'sala');
  const cam = objeto(o.camera);
  const placa = texto(cen.placa, '').slice(0, 24);
  return {
    id: texto(o.id), fala: texto(o.fala),
    cenario: {
      tipo, imagem,
      hora: umDe(cen.hora, ['dia', 'noite', 'tarde'] as const, tipo === 'varanda' ? 'tarde' : tipo === 'sala' ? 'noite' : 'dia'),
      luz: umDe(cen.luz, ['quente', 'fria'] as const, 'quente'),
      quadro: cen.quadro === true,
      placa: placa || undefined,
    },
    camera: {tipo: umDe(cam.tipo, ['push', 'dolly', 'plongee', 'pan'] as const, 'push'), intensidade: clamp(numero(cam.intensidade, 1), 0, 4), pos: v3(cam.pos), alvo: v3(cam.alvo)},
    foco: clamp(numero(o.foco, 0.5), 0, 1),
    personagens: normPersonagens(o.personagens),
    insert: normInsert(o.insert),
    transicao: normTransicao(o.transicao),
    plano: normPlano(o.plano, projeto),
    layout: normLayout(o.layout),
  };
};

// sons de entrada da cena no modo planos: um por entrada, sem dois no mesmo quadro (quadros relativos à cena)
const sonsDaCena = (cena: CenaRot, palavras: InfoCena['palavras']): SomF[] =>
  cena.plano && cena.insert ? sonsDoInsert(cena.insert, quadroDeEntrada(cena.insert, palavras)) : [];

const LEGENDA: EstiloLegenda = {fonte: FONTE_SORA, peso: 700, tamanho: 64, cor: '#FFFFFF', destaque: '#FFFFFF', modo: 'cor', contorno: '#000000', centroY: 1000, porBloco: 3};

// ── luz de cada cenário: usada nos personagens 2D, no grading e no brilho da fonte de luz ───────────────────────
type Preset = {luz: Luz; glow: {x: number; y: number; cor: string; r: number}; tint: string; blend: string; escuro: number};
const presetDe = (tipo: string, hora: Hora, fria: boolean): Preset => {
  const quenteP = fria ? 'rgb(200,220,255)' : 'rgb(255,190,120)';
  if (tipo === 'sala' && hora === 'noite')
    return {luz: {brilho: 1.0, lado: 1, quente: 'rgb(255,176,90)', frio: 'rgb(18,28,86)', borda: 'rgba(255,170,90,.7)', sombra: 'rgba(3,5,16,.7)'}, glow: {x: 80, y: 56, cor: 'rgba(255,160,70,.45)', r: 62}, tint: 'rgba(40,60,140,.22)', blend: 'multiply', escuro: 0.1};
  if (tipo === 'sala')
    return {luz: {brilho: 1.0, lado: -1, quente: quenteP, frio: 'rgb(30,40,100)', borda: 'rgba(255,214,150,.8)', sombra: 'rgba(8,8,20,.6)', halo: 'rgba(255,220,170,.35)'}, glow: {x: 28, y: 42, cor: 'rgba(255,214,150,.4)', r: 60}, tint: 'rgba(255,150,70,.14)', blend: 'soft-light', escuro: 0};
  if (tipo === 'escritorio')
    return {luz: {brilho: 1.02, lado: 1, quente: 'rgb(255,226,180)', frio: 'rgb(40,56,110)', borda: 'rgba(255,230,190,.65)', sombra: 'rgba(8,10,24,.55)'}, glow: {x: 72, y: 36, cor: 'rgba(255,236,200,.4)', r: 62}, tint: 'rgba(120,160,230,.13)', blend: 'soft-light', escuro: 0};
  if (tipo === 'varanda' && hora === 'noite')
    return {luz: {brilho: 0.92, lado: -1, quente: 'rgb(255,190,110)', frio: 'rgb(14,22,80)', borda: 'rgba(255,190,110,.6)', sombra: 'rgba(2,4,14,.7)'}, glow: {x: 50, y: 22, cor: 'rgba(255,190,110,.3)', r: 70}, tint: 'rgba(40,70,160,.24)', blend: 'multiply', escuro: 0.1};
  if (tipo === 'varanda')
    return {luz: {brilho: 1.04, lado: 1, quente: 'rgb(255,170,90)', frio: 'rgb(40,50,110)', borda: 'rgba(255,190,110,.85)', sombra: 'rgba(40,16,8,.55)', halo: 'rgba(255,190,110,.3)'}, glow: {x: 76, y: 24, cor: 'rgba(255,170,80,.55)', r: 72}, tint: 'rgba(255,130,50,.18)', blend: 'soft-light', escuro: 0};
  return {luz: {brilho: 0.62, lado: 1, quente: 'rgb(255,222,170)', frio: 'rgb(10,14,40)', borda: 'rgba(255,224,170,.9)', sombra: 'rgba(0,0,0,.65)', halo: 'rgba(255,220,160,.6)'}, glow: {x: 50, y: 40, cor: 'rgba(255,214,150,.5)', r: 50}, tint: 'rgba(10,20,70,.25)', blend: 'multiply', escuro: 0.12};
};

// ── câmera: devolve a pose 3D e o quanto a camada 2D acompanha (paralaxe) ────────────────────────────────────────
const calcCamera = (tipoCen: CenarioTipo, cam: CameraRot, t: number, f: number): {cam: Cam; par: {dx: number; s: number}} => {
  const tipo = cam.tipo;
  const k = cam.intensidade;
  const b = BASES[tipoCen];
  const pos: V3 = [...(cam.pos ?? b.pos)];
  const alvo: V3 = [...(cam.alvo ?? b.alvo)];
  // pos igual a alvo daria direção nula (NaN no push e no pan): o alvo recua 1 unidade em -z, a direção padrão dos sets
  if (Math.hypot(alvo[0] - pos[0], alvo[1] - pos[1], alvo[2] - pos[2]) < 1e-3) alvo[2] = pos[2] - 1;
  let dx = 0, s = 1;
  if (tipo === 'push') {
    const d: V3 = [alvo[0] - pos[0], alvo[1] - pos[1], alvo[2] - pos[2]];
    const n = Math.hypot(...d);
    const m = (0.9 * k * t) / n;
    pos[0] += d[0] * m; pos[1] += d[1] * m; pos[2] += d[2] * m;
    s = 1 + 0.1 * k * t;
  } else if (tipo === 'dolly') {
    const ddx = (t - 0.5) * 1.1 * k;
    pos[0] += ddx; alvo[0] += ddx * 0.45;
    dx = -ddx * 330;
  } else if (tipo === 'plongee') {
    pos[1] += (1.4 + 0.5 * t) * k; pos[2] += 0.2;
    alvo[1] -= 0.4 * k; alvo[2] += 1.4 * k;
    s = 1 + 0.05 * t;
  } else if (tipo === 'pan') {
    const a = (0.5 - t) * 0.3 * k;
    const vx = alvo[0] - pos[0], vz = alvo[2] - pos[2];
    alvo[0] = pos[0] + vx * Math.cos(a) + vz * Math.sin(a);
    alvo[2] = pos[2] - vx * Math.sin(a) + vz * Math.cos(a);
    dx = a * 1597 * 0.75;
  }
  // respiração da câmera na mão: a câmera nunca para
  pos[0] += senoide(f, 83) * 0.012; pos[1] += senoide(f, 61, 9) * 0.01;
  return {cam: {pos, alvo, roll: senoide(f, 117) * 0.004, fov: 62}, par: {dx, s}};
};

// ── primeiro plano desfocado (folhas, batente): dá profundidade e anda mais rápido que o fundo ─────────────────────
const PrimeiroPlano: React.FC<{tipo: CenarioTipo; dx: number; f: number}> = ({tipo, dx, f}) => {
  if (tipo === 'porta') {
    return <div style={{position: 'absolute', left: -150 + dx * 1.6, top: -40, width: 250, height: 2000, background: 'linear-gradient(90deg,#0a0705 0%,#1d130d 70%,rgba(255,190,120,.5) 100%)', filter: 'blur(12px)'}} />;
  }
  const cor = tipo === 'escritorio' ? ['#16242a', '#0e171b'] : ['#10231a', '#09150f'];
  const folhas = [-62, -38, -14, 12, 36, 60];
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, filter: 'blur(11px)', opacity: 0.95}}>
      <g transform={`translate(${-30 + dx * 1.7},${1960 + senoide(f, 150) * 8})`}>
        {folhas.map((a, i) => (
          <ellipse key={i} cx={0} cy={-330 - (i % 2) * 70} rx={70 + (i % 3) * 14} ry={330 + (i % 2) * 70} fill={cor[i % 2]} transform={`rotate(${a + senoide(f, 120, i * 20) * 1.8})`} />
        ))}
      </g>
      <g transform={`translate(${1130 + dx * 1.7},${-60})`}>
        {[-40, -18, 6, 28].map((a, i) => (
          <ellipse key={i} cx={0} cy={260 + (i % 2) * 60} rx={60 + (i % 2) * 14} ry={280} fill={cor[(i + 1) % 2]} transform={`rotate(${a + 180 + senoide(f, 130, i * 25) * 1.8})`} />
        ))}
      </g>
    </svg>
  );
};

// ── uma cena ────────────────────────────────────────────────────────────────────────────────────────────────
const CenaCartoon: React.FC<{cena: unknown; info: InfoCena; projeto: string; W: number; H: number; cor: string; seg?: Segmento}> = ({cena: cenaBruta, info, projeto, W, H, cor, seg}) => {
  const cena = normCena(cenaBruta, projeto);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = clamp(f / Math.max(1, info.dur - 1));
  const cen = cena.cenario;
  const imagem = cen.imagem; // staticFile validado ou null (set procedural)
  const tipoCen: CenarioTipo = imagem ? 'sala' : cen.tipo;
  const hora: Hora = cen.hora;
  const pre = presetDe(tipoCen, hora, cen.luz === 'fria');
  const {cam, par} = calcCamera(tipoCen, cena.camera, t, f);
  const ins = cena.insert;
  const entraIns = ins ? quadroDeEntrada(ins, info.palavras) : 0;
  const foco = cena.foco;
  const blur = 2 + foco * 5 + (ins ? 3 * suave((f - entraIns) / 10) : 0);
  const chars = cena.personagens;
  const quadroEntra = (p: PersonagemRot, i: number) => {
    const e = typeof p.entra === 'object' ? p.entra : undefined;
    return e?.f ?? quadroDaPalavraT(info.palavras, e?.palavra, 6 + i * 7);
  };
  const fAbs = Math.round(info.ini * fps) + f; // quadro absoluto: o segmento de plano continua entre cenas
  const lay = cena.layout;
  const legY = LEGENDA_Y[lay.legenda];
  const lg = lay.legendaExplicita ? {...LEGENDA, centroY: legY} : LEGENDA;
  // posição do insert: no modo planos sempre encaixada na faixa (cedendo à legenda); no modo antigo só se o roteiro pediu
  const pi = ins && (cena.plano || lay.insertExplicito) ? posInsert(ins, lay.insert, lg.centroY) : null;
  const insertView = ins && (
    <div style={{position: 'absolute', inset: 0, transformOrigin: pi ? `540px ${pi.cy}px` : undefined, transform: pi ? `translateY(${pi.dy.toFixed(1)}px) scale(${pi.s.toFixed(3)})` : undefined}}>
      <InsertView ins={ins} f={f} fps={fps} palavras={info.palavras} cor={cor} />
    </div>
  );
  if (cena.plano) {
    // modo planos: a imagem gerada do assunto no lugar do set 3D e dos personagens; câmera lenta por cima
    return (
      <AbsoluteFill style={{background: '#050608', overflow: 'hidden'}}>
        <PlanoImagem plano={seg?.plano ?? cena.plano} t={seg ? clamp((fAbs - seg.iniF) / Math.max(1, seg.fimF - seg.iniF - 1)) : t} f={seg ? fAbs : f} />
        {ins && <div style={{position: 'absolute', inset: 0, background: 'rgba(3,5,14,.22)', opacity: suave((f - entraIns) / 10)}} />}
        <AcabamentoPlano legendaY={lg.centroY} />
        <div style={{position: 'absolute', inset: 0, backgroundImage: `url(${graoDataUrl()})`, backgroundSize: '256px', backgroundPosition: `${(f * 37) % 256}px ${(f * 91) % 256}px`, opacity: 0.05, mixBlendMode: 'overlay'}} />
        {insertView}
        <style>{'.lgc>div>span{margin:0 0.1em}'}</style>
        <div className="lgc"><LegendaKaraoke fala={cena.fala} palavras={info.palavras} estilo={lg} /></div>
        {sonsDaCena(cena, info.palavras).map((s, i) => <Som key={i} som={s.som} f={s.f} vol={s.vol} />)}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: '#050608', overflow: 'hidden'}}>
      {/* fundo: 3D (ou imagem gerada) desfocado = profundidade de campo rasa */}
      <div style={{position: 'absolute', inset: 0, filter: `blur(${blur.toFixed(2)}px)`, transform: `scale(1.1)`}}>
        {imagem ? (
          <Img src={imagem} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `translateX(${-par.dx * 0.6}px) scale(${1 + 0.1 * t})`}} />
        ) : (
          <Cenario3D cenario={{tipo: cen.tipo, hora, luz: cen.luz, quadro: cen.quadro, placa: cen.placa}} cam={cam} largura={W} altura={H} />
        )}
      </div>
      {/* grading: tom da luz, fonte de luz e escuro nas bordas */}
      <div style={{position: 'absolute', inset: 0, background: pre.tint, mixBlendMode: pre.blend as any}} />
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse ${pre.glow.r}% ${pre.glow.r * 0.8}% at ${pre.glow.x}% ${pre.glow.y}%, ${pre.glow.cor}, rgba(0,0,0,0) 70%)`, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(4,6,16,.55) 0%, rgba(4,6,16,0) 32%, rgba(4,6,16,0) 55%, rgba(4,6,16,.5) 100%)`}} />
      {ins && <div style={{position: 'absolute', inset: 0, background: 'rgba(3,5,14,.3)', opacity: suave((f - entraIns) / 10)}} />}
      <div style={{position: 'absolute', inset: 0, background: `rgba(2,4,12,${pre.escuro})`}} />
      {/* personagens 2D: nítidos na frente, com paralaxe contrária à câmera */}
      <AbsoluteFill style={{transform: ins ? `scale(0.96)` : undefined, opacity: ins ? 1 - 0.55 * suave((f - entraIns) / 10) : 1}}>
        {chars.map((p, i) => <Personagem key={i} p={p} f={f} fps={fps} entraF={quadroEntra(p, i)} idx={i} luz={pre.luz} par={par} />)}
      </AbsoluteFill>
      <PrimeiroPlano tipo={tipoCen} dx={par.dx} f={f} />
      {/* vinheta e grão */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 78% 62% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,.62) 100%)'}} />
      <div style={{position: 'absolute', inset: 0, backgroundImage: `url(${graoDataUrl()})`, backgroundSize: '256px', backgroundPosition: `${(f * 37) % 256}px ${(f * 91) % 256}px`, opacity: 0.06, mixBlendMode: 'overlay'}} />
      {insertView}
      <style>{'.lgc>div>span{margin:0 0.1em}'}</style>
      <div className="lgc"><LegendaKaraoke fala={cena.fala} palavras={info.palavras} estilo={lg} /></div>
      {/* sons da cena */}
      {chars.map((p, i) => (p.entra ? <Som key={'s' + i} som="pop" f={quadroEntra(p, i)} vol={0.5} /> : null))}
      {ins?.tipo === 'celular' && <Som som="toque" f={entraIns + 2} vol={0.45} />}
      {ins?.tipo === 'celular' && ins.notificacao && <Som som="ding" f={entraIns + 22} vol={0.5} />}
      {ins?.tipo === 'papel' && <Som som="risco" f={entraIns + 14} vol={0.4} />}
      {ins?.tipo === 'planilha' && <Som som="pop" f={entraIns + 12} vol={0.4} />}
    </AbsoluteFill>
  );
};

// ── transição por obstáculo: algo em primeiro plano cruza a tela por poucos quadros e revela a próxima cena ─────────
const Obstaculo: React.FC<{b: number; objeto: ObjetoObstaculo; sentido: 1 | -1; W: number; H: number}> = ({b, objeto, sentido, W, H}) => {
  const f = useCurrentFrame();
  const p = (f - (b - 4)) / 8;
  if (p < 0 || p > 1) return null;
  const L = 2400;
  const left = sentido === 1 ? W - (W + L) * p : -L + (W + L) * p;
  const borda = sentido === 1 ? 'left' : 'right';
  return (
    <div style={{position: 'absolute', left, top: -40, width: L, height: H + 80, filter: 'blur(4px)', transform: 'skewX(-3deg)'}}>
      {objeto === 'porta' && (
        <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#2a1c12 0 340px,#1b120c 340px 346px), linear-gradient(180deg,#3a2718,#160f0a)', backgroundBlendMode: 'multiply'}}>
          <div style={{position: 'absolute', top: 0, bottom: 0, [borda]: 0, width: 50, background: 'linear-gradient(90deg,rgba(255,200,130,.65),rgba(0,0,0,0))', transform: sentido === 1 ? undefined : 'scaleX(-1)'}} />
          <div style={{position: 'absolute', left: 820, top: 1000, width: 60, height: 150, borderRadius: 20, background: '#c9a463', border: '6px solid #0c0c10'}} />
        </div>
      )}
      {objeto === 'parede' && (
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0d0f16 0%,#05060a 55%,#0b0c12 100%)', filter: 'blur(3px)'}}>
          <div style={{position: 'absolute', top: 0, bottom: 0, [borda]: 0, width: 90, background: 'linear-gradient(90deg,rgba(255,196,130,.55),rgba(0,0,0,0))', transform: sentido === 1 ? undefined : 'scaleX(-1)'}} />
          <div style={{position: 'absolute', top: 0, bottom: 0, left: L * 0.62, width: 26, background: 'rgba(255,255,255,.05)'}} />
        </div>
      )}
      {objeto === 'pessoa' && (
        <svg width={L} height={H + 80} viewBox={`0 0 ${L} ${H + 80}`} style={{position: 'absolute', inset: 0}}>
          <rect width={L} height={H + 80} fill="#0b0d16" />
          <ellipse cx={L / 2} cy={H * 0.28} rx={420} ry={470} fill="#080a12" stroke="#2a3050" strokeWidth={14} />
          <path d={`M0,${H * 0.62} Q${L * 0.25},${H * 0.42} ${L / 2},${H * 0.5} Q${L * 0.75},${H * 0.42} ${L},${H * 0.62} L${L},${H + 80} L0,${H + 80} Z`} fill="#0b0d16" />
          <rect x={sentido === 1 ? 0 : L - 30} width={30} height={H + 80} fill="rgba(255,190,120,.4)" />
        </svg>
      )}
      {objeto === 'celular' && (
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg,#06080e 0%,#0d1424 45%,#06080e 100%)'}}>
          <div style={{position: 'absolute', top: 0, bottom: 0, [borda]: 0, width: 60, background: 'linear-gradient(90deg,rgba(150,200,255,.55),rgba(0,0,0,0))', transform: sentido === 1 ? undefined : 'scaleX(-1)'}} />
        </div>
      )}
    </div>
  );
};

export const Cartoon: React.FC<PropsTemplate> = ({dados}) => {
  const {fps, width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const fu = faixaUtil(width, height);
  const total = Math.round(numero(dados.tempo?.duracao, 0) * fps);
  // fronteiras com obstáculo: a cena de entrada declara "transicao" (só cenas com tempo válido)
  const validas = cenasValidas(dados);
  const semCenas = validas.length === 0;
  const fronteiras = validas
    .map(({i, cena, ini}) => {
      const objeto = i === 0 ? null : transicaoDaCena(cena, dados.roteiro.cenas[i - 1], dados.projeto);
      return objeto ? {b: Math.round(ini * fps), objeto, sentido: (i % 2 ? 1 : -1) as 1 | -1} : null;
    })
    .filter(Boolean) as {b: number; objeto: ObjetoObstaculo; sentido: 1 | -1}[];
  // modo planos: quadros (absolutos) dos sons de entrada das cenas; o whoosh do obstáculo se afasta de qualquer um deles
  const ocupados = validas.flatMap(({i, ini}) => sonsDaCena(normCena(dados.roteiro.cenas[i], dados.projeto), palavrasDaCena(dados, i, fps)).map((s) => Math.round(ini * fps) + s.f));
  const quadroWhoosh = (b: number) => {
    let w = b - 4;
    while (ocupados.some((x) => Math.abs(x - w) < 3)) w -= 3;
    return w;
  };
  // cor de destaque do objeto-prova: regra comum da marca (gi sem cores = laranja; livre = âmbar das referências)
  const cor = destaqueDe(dados, '#F2A93B');
  const segs = segmentosDePlanos(dados, fps);
  const logoOp = suave((frame - (total - 3 * fps)) / 12);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: FONTE_SORA}}>
      <Fontes />
      {/* palco vazio (montagem ao vivo no começo, ou cenas ainda sem tempo): um set padrão sem personagens */}
      {semCenas && <CenaCartoon cena={{}} info={{i: 0, dur: Math.max(1, total), ini: 0, palavras: [], primeira: true, ultima: true}} projeto={dados.projeto} W={width} H={height} cor={cor} />}
      <Cenas dados={dados} render={(c, info) => <CenaCartoon cena={c} info={info} projeto={dados.projeto} W={width} H={height} cor={cor} seg={segs.get(info.i)} />} />
      {fronteiras.map((o) => (
        <React.Fragment key={o.b}>
          <Obstaculo b={o.b} objeto={o.objeto} sentido={o.sentido} W={width} H={height} />
          <Som som="whoosh" f={quadroWhoosh(o.b)} vol={0.4} />
        </React.Fragment>
      ))}
      {dados.roteiro.marca === 'gi' && logoOp > 0 && <LogoGI altura={56} direita={Math.round(width * 0.06)} baixo={height - fu.base + 24} opacidade={logoOp} />}
      <Narracao dados={dados} />
    </AbsoluteFill>
  );
};
