// Elementos gráficos do template vetor: título fixo, selo numerado, contador, balão, impacto, flash, HUD, CTA.
// Todo texto é código (Oswald embutida). Posições respeitam a faixa útil: topo 270, base 1248, laterais 65.
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTE_OSWALD, tomDe, useDestaque} from '../comum';
import {ContadorRot, BalaoRot, L, A, VERDE, VERMELHO, ZONA, TINTA, duasLinhas, limita, milhar, quebra, saida} from './util';

const usePop = (inicio: number, damping = 11, stiffness = 210) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - inicio, fps, config: {damping, stiffness, mass: 0.8}});
};

// ── título fixo de 2 linhas (modo lista) ────────────────────────────────────────────────────────────────────
export const TituloFixo: React.FC<{linhas: [string, string]; visivel: boolean}> = ({linhas, visivel}) => {
  const destaque = useDestaque();
  const s = usePop(2, 13, 170);
  const maior = Math.max(linhas[0].length, linhas[1].length);
  const tam = Math.min(64, Math.floor((L - 2 * ZONA.lateral) / (maior * 0.43)));
  const contorno = {WebkitTextStroke: '9px #0B0B16', paintOrder: 'stroke fill' as any};
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: L, height: 620, background: 'linear-gradient(180deg, rgba(8,8,20,0.55) 0%, rgba(8,8,20,0.28) 60%, rgba(8,8,20,0) 100%)', opacity: visivel ? 1 : 0}} />
      <div style={{position: 'absolute', left: ZONA.lateral, right: ZONA.lateral, top: 300, textAlign: 'center', fontFamily: FONTE_OSWALD, fontWeight: 700, fontSize: tam, lineHeight: 1.08, textTransform: 'uppercase', opacity: visivel ? limita(s * 1.4, 0, 1) : 0, transform: `translateY(${(1 - limita(s, 0, 1.2)) * -40}px)`, letterSpacing: '0.01em'}}>
        <div style={{color: '#FFFFFF', ...contorno}}>{linhas[0]}</div>
        <div style={{color: destaque, ...contorno}}>{linhas[1]}</div>
      </div>
    </>
  );
};

// ── selo numerado: quadrado laranja + etiqueta escura de 2 linhas ────────────────────────────────────────────
export const Selo: React.FC<{numero: number | string; texto: string; topo: number; repete: boolean; inicio: number}> = ({numero, texto, topo, repete, inicio}) => {
  const destaque = useDestaque();
  const s = repete ? 1 : usePop(inicio, 9, 230);
  const [l1, l2] = duasLinhas(texto);
  const larg = Math.max(l1.length, l2.length) * 15.5 + 38;
  const ehEstrela = numero === '★';
  return (
    <div style={{position: 'absolute', left: ZONA.lateral, top: topo, display: 'flex', alignItems: 'stretch', transformOrigin: '0 0', transform: `scale(${limita(s, 0, 1.15)})`, opacity: limita(s * 2, 0, 1), filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))'}}>
      <div style={{width: 76, height: 76, background: `linear-gradient(160deg, ${destaque}, ${tomDe(destaque, 0.9)})`, borderRadius: '12px 0 0 12px', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: FONTE_OSWALD, fontWeight: 700, fontSize: ehEstrela ? 54 : 54, lineHeight: 1}}>{numero}</div>
      <div style={{height: 76, width: larg, background: 'rgba(14,14,28,0.92)', borderRadius: '0 12px 12px 0', padding: '0 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff', fontFamily: FONTE_OSWALD, fontWeight: 600, fontSize: 28, lineHeight: 1.08, textTransform: 'uppercase', letterSpacing: '0.02em'}}>
        <div>{l1}</div>{l2 && <div>{l2}</div>}
      </div>
    </div>
  );
};

// ── contador: pílula escura com ícone e valor ────────────────────────────────────────────────────────────────
const Icone: React.FC<{tipo: string; cor: string}> = ({tipo, cor}) => (
  <svg width={56} height={56} viewBox="-30 -30 60 60">
    {tipo === 'relogio' ? (
      <g><circle r={24} fill="none" stroke={cor} strokeWidth={6} /><path d="M 0 -14 L 0 0 L 11 6" fill="none" stroke={cor} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" /></g>
    ) : tipo === 'pedido' ? (
      <g><path d="M -22 -10 L 0 -22 L 22 -10 L 22 14 L 0 26 L -22 14 Z" fill="none" stroke={cor} strokeWidth={5} strokeLinejoin="round" /><path d="M -22 -10 L 0 2 L 22 -10 M 0 2 L 0 26" fill="none" stroke={cor} strokeWidth={5} strokeLinejoin="round" /></g>
    ) : (
      <g><path d="M -8 -22 L 8 -22 L 4 -12 L -4 -12 Z" fill={cor} /><path d="M -4 -12 C -30 0 -26 26 0 26 C 26 26 30 0 4 -12 Z" fill={cor} /><text x={0} y={16} textAnchor="middle" fontFamily={FONTE_OSWALD} fontWeight={700} fontSize={28} fill="#0F1220">$</text></g>
    )}
  </svg>
);

export const contadorQuadros = (c: ContadorRot, dur: number) => {
  const ini = 8;
  const dura = c.duracao ?? Math.max(24, Math.min(75, Math.round(dur * 0.55)));
  return {ini, dura};
};

export const Contador: React.FC<{c: ContadorRot; inicioQ: number; dur: number; direita: boolean; topo: number}> = ({c, inicioQ, dur, direita, topo}) => {
  const destaque = useDestaque();
  const f = useCurrentFrame();
  const pop = usePop(Math.max(0, inicioQ - 6), 10, 220);
  const dura = c.duracao ?? Math.max(24, Math.min(75, Math.round(dur * 0.55)));
  const t = limita((f - inicioQ) / dura, 0, 1);
  const valor = c.de + (c.para - c.de) * saida(t);
  const sobe = c.para >= c.de;
  const cor = c.cor === 'laranja' || c.icone === 'relogio' || c.icone === 'pedido' ? destaque : VERDE;
  const corValor = sobe ? cor : VERMELHO;
  const icone = c.icone ?? (c.cor === 'laranja' ? 'relogio' : 'dinheiro');
  const delta = Math.abs(c.para - c.de);
  const flutuam = [0, 1, 2].map((k) => {
    const q = inicioQ + Math.round(dura * (0.15 + k * 0.28));
    const tt = (f - q) / 26;
    if (tt < 0 || tt > 1) return null;
    const parte = Math.round(delta / 3);
    return (
      <div key={k} style={{position: 'absolute', left: 70 + k * 74, top: -20 - tt * 70, opacity: 1 - tt * tt, fontFamily: FONTE_OSWALD, fontWeight: 700, fontSize: 40, color: sobe ? cor : VERMELHO, WebkitTextStroke: '6px #0B0B16', paintOrder: 'stroke fill' as any, whiteSpace: 'nowrap'}}>
        {sobe ? '+' : '−'}{c.prefixo ?? ''}{milhar(parte)}{c.sufixo ?? ''}
      </div>
    );
  });
  const txt = `${c.prefixo ?? ''}${milhar(valor)}${c.sufixo ?? ''}`;
  const pos: React.CSSProperties = direita ? {right: ZONA.lateral} : {left: 0, right: 0, display: 'flex', justifyContent: 'center'};
  const batida = t > 0 && t < 1 ? 1 + 0.035 * Math.sin(f * 1.6) : 1;
  return (
    <div style={{position: 'absolute', top: c.y ?? topo, ...pos, transform: `scale(${limita(pop, 0, 1.1) * batida})`, transformOrigin: direita ? '100% 50%' : '50% 50%', opacity: limita(pop * 2, 0, 1)}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 14, height: 88, padding: '0 30px 0 20px', borderRadius: 44, background: 'linear-gradient(180deg, #1E2238, #0F1220)', border: `4px solid ${tomBorda(corValor)}`, boxShadow: '0 8px 22px rgba(0,0,0,0.4)'}}>
        <Icone tipo={icone} cor={cor} />
        <div style={{fontFamily: FONTE_OSWALD, fontWeight: 700, fontSize: 56, color: corValor, letterSpacing: '0.01em', lineHeight: 1, minWidth: 120}}>{txt}</div>
        {flutuam}
      </div>
    </div>
  );
};
const tomBorda = (c: string) => c;

// ── balão de fala ou pensamento ────────────────────────────────────────────────────────────────────────────────
export const Balao: React.FC<{b: BalaoRot; alvo: {x: number; y: number} | null; inicioQ: number}> = ({b, alvo, inicioQ}) => {
  const pop = usePop(inicioQ, 9, 240);
  const linhas = quebra(b.texto.toUpperCase(), 16);
  const maior = Math.max(...linhas.map((l) => l.length));
  const w = Math.max(190, maior * 17.5 + 64), h = linhas.length * 42 + 38;
  const pensa = b.tipo === 'pensamento';
  const ax = alvo?.x ?? 540, ay = alvo?.y ?? 760;
  const cx = limita(b.x ?? ax, ZONA.lateral + w / 2 + 6, L - ZONA.lateral - w / 2 - 6);
  const by = b.y ?? limita(ay - 60 - 56, ZONA.topo + h + 10, 1200); // base do balão
  const topo = by - h;
  const baseTail = limita(ax, cx - w / 2 + 44, cx + w / 2 - 44);
  const s = limita(pop, 0, 1.12);
  const nuvem = (() => {
    const rx = w / 2, ry = h / 2, n = 14;
    return Array.from({length: n}).map((_, i) => {
      const a = (i / n) * Math.PI * 2;
      return <circle key={i} cx={cx + Math.cos(a) * (rx - 8)} cy={topo + ry + Math.sin(a) * (ry - 6)} r={Math.max(26, h * 0.3)} />;
    });
  })();
  return (
    <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} style={{position: 'absolute', left: 0, top: 0, opacity: limita(pop * 2.5, 0, 1)}}>
      <g transform={`translate(${baseTail} ${by}) scale(${s}) translate(${-baseTail} ${-by})`} filter="drop-shadow(0 6px 8px rgba(0,0,0,0.25))">
        {pensa ? (
          <g>
            <g fill="#fff" stroke={TINTA} strokeWidth={4}>
              {nuvem}
              <circle cx={baseTail - 6} cy={by + 40} r={15} /><circle cx={baseTail - 2} cy={by + 78} r={10} /><circle cx={baseTail} cy={by + 106} r={6} />
            </g>
            <ellipse cx={cx} cy={topo + h / 2} rx={w / 2 - 8} ry={h / 2 - 4} fill="#fff" />
          </g>
        ) : (
          <g>
            <path d={`M ${baseTail - 18} ${by - 4} L ${ax > baseTail ? baseTail + 34 : baseTail - 34} ${by + 56} L ${baseTail + 20} ${by - 4}`} fill="#fff" stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
            <rect x={cx - w / 2} y={topo} width={w} height={h} rx={26} fill="#fff" stroke={TINTA} strokeWidth={4} />
            <rect x={baseTail - 16} y={by - 6} width={34} height={8} fill="#fff" />
          </g>
        )}
        {linhas.map((l, i) => (
          <text key={i} x={cx} y={topo + 26 + 40 + i * 42 - 12} textAnchor="middle" fontFamily={FONTE_OSWALD} fontWeight={600} fontSize={34} fill={TINTA} letterSpacing="0.02em">{l}</text>
        ))}
      </g>
    </svg>
  );
};

// ── palavra de impacto ────────────────────────────────────────────────────────────────────────────────────────
export const Impacto: React.FC<{texto: string; vermelho: boolean; y: number; inicioQ: number}> = ({texto, vermelho, y, inicioQ}) => {
  const destaque = useDestaque();
  const f = useCurrentFrame();
  const pop = usePop(inicioQ, 8, 260);
  const t = f - inicioQ;
  const treme = t >= 0 && t < 12 ? Math.sin(t * 3.3) * (12 - t) * 1.2 : 0;
  const tam = Math.min(176, Math.floor((L - 2 * ZONA.lateral) / (texto.length * 0.46)));
  return (
    <div style={{position: 'absolute', left: ZONA.lateral, right: ZONA.lateral, top: y, textAlign: 'center', fontFamily: FONTE_OSWALD, fontWeight: 700, fontSize: tam, lineHeight: 1, textTransform: 'uppercase', color: vermelho ? VERMELHO : destaque, WebkitTextStroke: '14px #0B0B16', paintOrder: 'stroke fill' as any, transform: `translate(${treme}px, ${treme * 0.4}px) rotate(-3deg) scale(${limita(pop, 0, 1.15) * (t < 6 ? 1.12 : 1)})`, opacity: limita(pop * 3, 0, 1), textShadow: '0 10px 0 rgba(0,0,0,0.25)'}}>
      {texto}
    </div>
  );
};

// ── flash de cor ──────────────────────────────────────────────────────────────────────────────────────────────
export const Flash: React.FC<{cor: string; inicioQ: number}> = ({cor, inicioQ}) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [inicioQ, inicioQ + 1, inicioQ + 4], [0, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (a <= 0) return null;
  return <AbsoluteFill style={{background: cor, opacity: a}} />;
};

// ── HUD vermelho fino ─────────────────────────────────────────────────────────────────────────────────────────
export const Hud: React.FC<{tipo: 'mira' | 'visor' | 'radar'; x: number; y: number; inicioQ: number}> = ({tipo, x, y, inicioQ}) => {
  const f = useCurrentFrame();
  const t = f - inicioQ;
  if (t < 0) return null;
  const trava = saida(t / 12);
  const esc = 1 + (1 - trava) * 0.9;
  const cor = VERMELHO;
  const cantos = (m: number) => {
    const xs = [ZONA.lateral, L - ZONA.lateral], ys = [ZONA.topo + 20, ZONA.base - 20];
    return ys.map((yy, j) => xs.map((xx, i) => {
      const sx = i ? -1 : 1, sy = j ? -1 : 1;
      return <path key={i + '_' + j} d={`M ${xx} ${yy + sy * m} L ${xx} ${yy} L ${xx + sx * m} ${yy}`} fill="none" stroke={cor} strokeWidth={3} strokeLinecap="square" />;
    }));
  };
  const pisca = Math.floor(f / 8) % 2 === 0;
  return (
    <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} style={{position: 'absolute', left: 0, top: 0, opacity: limita(t / 4, 0, 1)}}>
      {cantos(70)}
      {tipo === 'mira' && (
        <g transform={`translate(${x} ${y}) scale(${esc}) rotate(${(1 - trava) * 45})`}>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => <path key={i} d={`M ${sx * 120} ${sy * 60} L ${sx * 120} ${sy * 120} L ${sx * 60} ${sy * 120}`} fill="none" stroke={cor} strokeWidth={3} />)}
          <circle r={16} fill="none" stroke={cor} strokeWidth={3} />
          {[[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy], i) => <line key={i} x1={dx * 30} y1={dy * 30} x2={dx * 100} y2={dy * 100} stroke={cor} strokeWidth={3} />)}
          <line x1={-220} y1={0} x2={-140} y2={0} stroke={cor} strokeWidth={3} opacity={0.7} /><line x1={140} y1={0} x2={220} y2={0} stroke={cor} strokeWidth={3} opacity={0.7} />
          {pisca && <circle r={5} fill={cor} />}
        </g>
      )}
      {tipo === 'radar' && (
        <g transform={`translate(${x} ${y}) scale(${esc})`}>
          {[80, 160, 240].map((r) => <circle key={r} r={r} fill="none" stroke={cor} strokeWidth={3} opacity={0.8} />)}
          <line x1={-250} y1={0} x2={250} y2={0} stroke={cor} strokeWidth={2} opacity={0.6} /><line x1={0} y1={-250} x2={0} y2={250} stroke={cor} strokeWidth={2} opacity={0.6} />
          <g transform={`rotate(${f * 6})`}>
            <path d="M 0 0 L 240 0 A 240 240 0 0 0 208 -120 Z" fill={cor} opacity={0.22} />
            <line x1={0} y1={0} x2={240} y2={0} stroke={cor} strokeWidth={3} />
          </g>
          {[[90, -60], [-120, 80], [40, 150]].map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={8} fill={cor} opacity={0.5 + 0.5 * Math.sin(f * 0.3 + i)} />)}
        </g>
      )}
      {tipo === 'visor' && (
        <g>
          <rect x={ZONA.lateral + 30} y={ZONA.topo + 50 + ((f * 5) % (ZONA.base - ZONA.topo - 100))} width={L - 2 * ZONA.lateral - 60} height={3} fill={cor} opacity={0.5} />
          <circle cx={ZONA.lateral + 40} cy={ZONA.topo + 70} r={9} fill={cor} opacity={pisca ? 1 : 0.2} />
        </g>
      )}
    </svg>
  );
};

// ── CTA (ação, nunca endereço) ────────────────────────────────────────────────────────────────────────────────
export const Cta: React.FC<{texto: string; topo: number; inicioQ: number}> = ({texto, topo, inicioQ}) => {
  const destaque = useDestaque();
  const pop = usePop(inicioQ, 9, 220);
  const f = useCurrentFrame();
  const respira = 1 + 0.025 * Math.sin(f * 0.25);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: topo, display: 'flex', justifyContent: 'center', transform: `scale(${limita(pop, 0, 1.1) * respira})`, opacity: limita(pop * 2, 0, 1)}}>
      <div style={{background: `linear-gradient(180deg, ${tomDe(destaque, 1.3)}, ${destaque})`, color: '#fff', fontFamily: FONTE_OSWALD, fontWeight: 700, fontSize: 52, textTransform: 'uppercase', padding: '16px 46px', borderRadius: 60, boxShadow: `0 10px 0 ${tomDe(destaque, 0.77)}, 0 18px 30px rgba(0,0,0,0.35)`, letterSpacing: '0.02em'}}>{texto}</div>
    </div>
  );
};
