// Template cartoon-2d-cenario-3d: personagens 2D chapados (SVG) dentro de cenários 3D procedurais (three),
// com profundidade de campo fingida (blur no fundo), câmera que nunca para, vinheta, grão, inserts de
// objeto-prova e transição por obstáculo. Tudo determinístico por quadro. Veja LEIAME.md na pasta.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cenas, EstiloLegenda, FONTE_SORA, Fontes, InfoCena, LegendaKaraoke, LogoGI, Narracao, PropsTemplate, Som, faixaUtil, quadroDaPalavraT} from '../comum';
import {BASES, Cam, Cenario3D, CenarioProps, CenarioTipo, Hora, V3} from './set3d';
import {Luz, Personagem, PersonagemRot} from './personagens';
import {Insert, InsertView, quadroDeEntrada} from './inserts';
import {graoDataUrl} from './texturas';
import {clamp, lerp, senoide, suave} from './util';

type CameraRot = {tipo?: 'push' | 'dolly' | 'plongee' | 'pan'; intensidade?: number; pos?: V3; alvo?: V3};
type Transicao = 'obstaculo' | 'corte' | {tipo: 'obstaculo'; objeto?: 'pessoa' | 'porta' | 'celular'};
type CenaRot = {
  id: string; fala: string;
  cenario: (CenarioProps & {tipo: CenarioTipo}) | {imagem: string; hora?: Hora; luz?: 'quente' | 'fria'};
  camera?: CameraRot; foco?: number; personagens?: PersonagemRot[]; insert?: Insert; transicao?: Transicao;
};

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
const calcCamera = (tipoCen: CenarioTipo, cam: CameraRot | undefined, t: number, f: number): {cam: Cam; par: {dx: number; s: number}} => {
  const tipo = cam?.tipo ?? 'push';
  const k = cam?.intensidade ?? 1;
  const b = BASES[tipoCen];
  const pos: V3 = [...(cam?.pos ?? b.pos)];
  const alvo: V3 = [...(cam?.alvo ?? b.alvo)];
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
const CenaCartoon: React.FC<{cena: CenaRot; info: InfoCena; projeto: string; W: number; H: number; cor: string}> = ({cena, info, projeto, W, H, cor}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = clamp(f / Math.max(1, info.dur - 1));
  const cen: any = cena.cenario;
  const imagem = typeof cen.imagem === 'string';
  const tipoCen: CenarioTipo = imagem ? 'sala' : cen.tipo;
  const hora: Hora = cen.hora ?? (tipoCen === 'varanda' ? 'tarde' : tipoCen === 'sala' ? 'noite' : 'dia');
  const pre = presetDe(imagem ? 'sala' : tipoCen, hora, cen.luz === 'fria');
  const {cam, par} = calcCamera(tipoCen, cena.camera, t, f);
  const ins = cena.insert;
  const entraIns = ins ? quadroDeEntrada(ins, info.palavras) : 0;
  const foco = cena.foco ?? 0.5;
  const blur = 2 + foco * 5 + (ins ? 3 * suave((f - entraIns) / 10) : 0);
  const chars = cena.personagens ?? [];
  const quadroEntra = (p: PersonagemRot, i: number) => {
    const e = typeof p.entra === 'object' ? p.entra : undefined;
    return e?.f ?? quadroDaPalavraT(info.palavras, e?.palavra, 6 + i * 7);
  };
  const lg = LEGENDA;
  return (
    <AbsoluteFill style={{background: '#050608', overflow: 'hidden'}}>
      {/* fundo: 3D (ou imagem gerada) desfocado = profundidade de campo rasa */}
      <div style={{position: 'absolute', inset: 0, filter: `blur(${blur.toFixed(2)}px)`, transform: `scale(1.1)`}}>
        {imagem ? (
          <Img src={staticFile(`${projeto}/cenarios/${cen.imagem}`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `translateX(${-par.dx * 0.6}px) scale(${1 + 0.1 * t})`}} />
        ) : (
          <Cenario3D cenario={{...cen, hora}} cam={cam} largura={W} altura={H} />
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
      {ins && <InsertView ins={ins} f={f} fps={fps} palavras={info.palavras} cor={cor} />}
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
const Obstaculo: React.FC<{b: number; objeto: 'pessoa' | 'porta' | 'celular'; sentido: 1 | -1; W: number; H: number}> = ({b, objeto, sentido, W, H}) => {
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
  const cenas = dados.roteiro.cenas as CenaRot[];
  const fu = faixaUtil(width, height);
  const total = Math.round(dados.tempo.duracao * fps);
  // fronteiras com obstáculo: a cena de entrada declara "transicao"
  const fronteiras = cenas
    .map((c, i) => {
      const tr = c.transicao;
      if (i === 0 || !tr || tr === 'corte') return null;
      const obj = typeof tr === 'object' ? tr.objeto ?? 'porta' : 'porta';
      return {b: Math.round(dados.tempo.cenas[i].ini * fps), objeto: obj, sentido: (i % 2 ? 1 : -1) as 1 | -1};
    })
    .filter(Boolean) as {b: number; objeto: 'pessoa' | 'porta' | 'celular'; sentido: 1 | -1}[];
  // cor de destaque do objeto-prova: do roteiro; sem ela, âmbar (paleta das referências). Laranja #EE7533 é do GI.
  const cor = dados.roteiro.cores?.destaque ?? '#F2A93B';
  const logoOp = suave((frame - (total - 3 * fps)) / 12);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: FONTE_SORA}}>
      <Fontes />
      <Cenas dados={dados} render={(c, info) => <CenaCartoon cena={c as CenaRot} info={info} projeto={dados.projeto} W={width} H={height} cor={cor} />} />
      {fronteiras.map((o) => (
        <React.Fragment key={o.b}>
          <Obstaculo b={o.b} objeto={o.objeto} sentido={o.sentido} W={width} H={height} />
          <Som som="whoosh" f={o.b - 4} vol={0.5} />
        </React.Fragment>
      ))}
      {dados.roteiro.marca === 'gi' && logoOp > 0 && <LogoGI altura={56} direita={Math.round(width * 0.06)} baixo={height - fu.base + 24} opacidade={logoOp} />}
      <Narracao dados={dados} />
    </AbsoluteFill>
  );
};
