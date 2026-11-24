// Camadas 2D do diorama: HUD de número, pílula de capítulo, pílulas de alerta/correção/CTA, cartão de vidro e carimbo.
// Tudo dentro da faixa útil: nada acima de 270 px, nada abaixo de 1248 px, laterais de 65 px.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DadosT} from '../comum';
import {FONTE_OSWALD, FONTE_SORA, cenasValidas, useDestaque} from '../comum';
import {VERDE, VERMELHO, cenasDe} from './tipos';
import type {CartaoD, HudD} from './tipos';

const VIDRO = 'rgba(20,20,20,0.86)';
const BORDA = '1px solid rgba(255,255,255,0.12)';
const mola = (f: number, fps: number, cfg = {damping: 14, stiffness: 170, mass: 0.7}) => spring({frame: Math.max(0, f), fps, config: cfg});

// ── ícones (traço escuro sobre o quadrado laranja) ───────────────────────────────────────────────────────
const ICONES: Record<string, React.ReactNode> = {
  pessoas: <><circle cx="9" cy="8" r="3.3" /><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6" /><circle cx="17.2" cy="9" r="2.6" /><path d="M16.3 14.2c2.9 0 4.9 2 4.9 5.2" /></>,
  pedido: <><path d="M4 8l8-4 8 4v9l-8 4-8-4z" /><path d="M4 8l8 4 8-4" /><path d="M12 12v9" /></>,
  dinheiro: <><circle cx="12" cy="12" r="9" /><path d="M12 6v12" /><path d="M15 9.2c0-1.4-1.5-2-3-2s-3 .7-3 2 1.3 1.8 3 2.1 3 .8 3 2.2-1.5 2-3 2-3-.6-3-2" /></>,
  relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></>,
};
const Icone: React.FC<{nome: string; tam: number; traco: string; w?: number}> = ({nome, tam, traco, w = 2.3}) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={traco} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{ICONES[nome] ?? ICONES.pessoas}</svg>
);

const duasLinhas = (s: string) => {
  if (s.includes('\n')) return s.split('\n').slice(0, 2);
  const p = s.split(' ');
  if (s.length <= 14 || p.length < 2) return [s];
  let melhor = 1, dif = 1e9;
  for (let k = 1; k < p.length; k++) { const d = Math.abs(p.slice(0, k).join(' ').length - p.slice(k).join(' ').length); if (d < dif) { dif = d; melhor = k; } }
  return [p.slice(0, melhor).join(' '), p.slice(melhor).join(' ')];
};

const fmt = (v: number, pre = '', suf = '') => `${pre}${Math.round(v).toLocaleString('pt-BR')}${suf}`;

// ── HUD: contador que corre e freia forte no fim ──────────────────────────────────────────────────────────
type SegHud = {ini: number; dur: number; hud: HudD; de: number; ilustrativo: boolean};
export const segmentosHud = (d: DadosT): SegHud[] => {
  const segs: SegHud[] = [];
  const cs = cenasDe(d);
  cenasValidas(d).forEach((t) => {
    const c = cs[t.i];
    if (!c.hud) return;
    const ant = segs[segs.length - 1];
    segs.push({ini: t.ini + (t.i === 0 ? 0 : 0.12), dur: t.fim - t.ini, hud: c.hud, de: c.hud.de ?? (ant ? ant.hud.valor : 0), ilustrativo: !!c.ilustrativo});
  });
  return segs;
};

export const Hud: React.FC<{dados: DadosT}> = ({dados}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const destaque = useDestaque();
  const segs = React.useMemo(() => segmentosHud(dados), [dados]);
  if (!segs.length) return null;
  let k = -1;
  segs.forEach((s, j) => { if (s.ini <= t) k = j; });
  if (k < 0) return null;
  const s = segs[k];
  const dtSeg = t - s.ini;
  const entra = mola(f + 9 - Math.round(segs[0].ini * fps), fps);
  const bump = k > 0 ? Math.sin(Math.min(1, dtSeg / 0.5) * Math.PI) * 0.06 * Math.max(0, 1 - dtSeg) : 0;
  const durContar = Math.min(2.6, Math.max(0.8, s.dur * 0.85));
  const p = Math.min(1, Math.max(0, dtSeg / durContar));
  const e = 1 - Math.pow(1 - p, 4);
  const valor = s.de + (s.hud.valor - s.de) * e;
  const caindo = s.hud.valor < s.de;
  const iconeCor = caindo ? VERMELHO : destaque;
  const linhas = duasLinhas(s.hud.rotulo);
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', transform: `translateY(-50%) translateY(${(1 - entra) * -30}px) scale(${(0.9 + entra * 0.1) * (1 + bump)})`, opacity: Math.min(1, entra * 1.6)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '14px 36px 14px 16px', borderRadius: 999, background: VIDRO, border: BORDA, boxShadow: '0 12px 40px rgba(0,0,0,0.5)'}}>
          <div style={{width: 76, height: 76, borderRadius: 22, background: iconeCor, display: 'grid', placeItems: 'center'}}>
            <Icone nome={s.hud.icone ?? 'pedido'} tam={44} traco="#0B0B0D" />
          </div>
          <div style={{fontFamily: FONTE_SORA, fontWeight: 700, fontSize: 76, lineHeight: 1, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', letterSpacing: -1}}>{fmt(valor, s.hud.prefixo, s.hud.sufixo)}</div>
          <div style={{fontFamily: FONTE_SORA, fontWeight: 500, fontSize: 24, lineHeight: 1.18, color: '#B9BFC8', maxWidth: 230}}>
            {linhas.map((l, n) => <div key={n}>{l}</div>)}
          </div>
        </div>
      </div>
      {s.ilustrativo ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 410, textAlign: 'center', fontFamily: FONTE_SORA, fontWeight: 500, fontSize: 22, color: '#9AA2AC', textShadow: '0 0 6px #000, 0 0 12px #000', opacity: Math.min(1, entra * 1.6)}}>exemplo ilustrativo</div>
      ) : null}
    </>
  );
};

// ── pílula de capítulo ───────────────────────────────────────────────────────────────────────────────────
export const Capitulo: React.FC<{dados: DadosT}> = ({dados}) => {
  const destaque = useDestaque();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const segs = React.useMemo(() => { const cs = cenasDe(dados); return cenasValidas(dados).map((t) => ({c: cs[t.i], ini: t.ini + 0.1})).filter((x) => x.c.capitulo); }, [dados]);
  if (!segs.length) return null;
  let k = -1;
  segs.forEach((s, j) => { if (s.ini <= t) k = j; });
  if (k < 0) return null;
  const s = segs[k];
  const m = mola(Math.round((t - s.ini) * fps), fps, {damping: 15, stiffness: 190, mass: 0.6});
  const partes = (s.c.capitulo ?? '').split('·').map((x) => x.trim());
  const [a, b] = partes.length > 1 ? [partes[0], partes.slice(1).join(' · ')] : [partes[0], ''];
  const prog = s.c.progresso;
  const comHud = segmentosHud(dados).length > 0;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: comHud ? 502 : 330, display: 'flex', justifyContent: 'center', transform: `translateY(-50%) scale(${0.8 + 0.2 * m})`, opacity: Math.min(1, m * 1.8)}}>
      <div style={{padding: '16px 40px 18px', borderRadius: 40, background: VIDRO, border: BORDA, boxShadow: '0 10px 32px rgba(0,0,0,0.45)', textAlign: 'center', fontFamily: FONTE_SORA, fontWeight: 700, fontSize: 30, letterSpacing: 1.5, color: '#FFFFFF'}}>
        <div>{a}{b ? <> <span style={{opacity: 0.6}}>·</span> <span style={{color: destaque}}>{b}</span></> : null}</div>
        {prog ? (
          <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12}}>
            {Array.from({length: prog[1]}, (_, n) => <div key={n} style={{width: 44, height: 6, borderRadius: 3, background: n < prog[0] ? destaque : 'rgba(255,255,255,0.22)'}} />)}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── pílulas de estado ────────────────────────────────────────────────────────────────────────────────────
export const Pilula: React.FC<{texto: string; tipo: 'alerta' | 'correcao' | 'cta'; f0: number; y: number}> = ({texto, tipo, f0, y}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = mola(f - f0, fps, {damping: 12, stiffness: 240, mass: 0.6});
  const destaque = useDestaque();
  if (f < f0) return null;
  const cor = tipo === 'alerta' ? VERMELHO : tipo === 'correcao' ? VERDE : destaque;
  const txt = tipo === 'alerta' ? '#FFFFFF' : '#0B0B0D';
  const tam = texto.length > 32 ? 28 : texto.length > 24 ? 32 : 36;
  const icone = tipo === 'alerta'
    ? <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={txt} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.2l9.8 17H2.2z" /><path d="M12 10v4.6" /><path d="M12 17.6v.4" /></svg>
    : tipo === 'correcao'
      ? <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={txt} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12.8l5 5L19.5 7" /></svg>
      : null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', transform: `translateY(-50%) translateY(${(1 - m) * 24}px) scale(${0.7 + 0.3 * m})`, opacity: Math.min(1, m * 2)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, height: 92, padding: '0 40px', borderRadius: 999, background: cor, color: txt, fontFamily: FONTE_SORA, fontWeight: 700, fontSize: tam, boxShadow: `0 0 46px ${cor}66, 0 12px 30px rgba(0,0,0,0.45)`, maxWidth: 950, whiteSpace: 'nowrap'}}>
        {icone}{texto}
      </div>
    </div>
  );
};

// ── cartão de vidro ──────────────────────────────────────────────────────────────────────────────────────
const ETIQ = {ok: {t: 'OK', c: VERDE}, erro: {t: 'ERRO', c: VERMELHO}, neutro: {t: '', c: '#9AA3AD'}} as const;
export const CartaoVidro: React.FC<{cartao: CartaoD; f0: number; palavras: Record<number, number>}> = ({cartao, f0, palavras}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = mola(f - f0, fps, {damping: 16, stiffness: 150, mass: 0.8});
  if (f < f0) return null;
  const n = cartao.linhas.length;
  const alt = n > 3 ? 76 : 88;
  return (
    <div style={{position: 'absolute', left: 140, right: 140, top: 650, transform: `translateY(${(1 - m) * 70}px) scale(${0.94 + 0.06 * m})`, opacity: Math.min(1, m * 1.8), padding: '26px 34px 18px', borderRadius: 30, background: 'rgba(16,16,18,0.80)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: BORDA, boxShadow: '0 24px 60px rgba(0,0,0,0.55)'}}>
      {cartao.titulo ? <div style={{fontFamily: FONTE_SORA, fontWeight: 600, fontSize: 22, letterSpacing: 2.4, color: '#9AA3AD', textTransform: 'uppercase', marginBottom: 12}}>{cartao.titulo}</div> : null}
      {cartao.linhas.map((l, i) => {
        const fi = f0 + (palavras[i] ?? 10 + i * 9);
        const mi = mola(f - fi, fps, {damping: 15, stiffness: 220, mass: 0.6});
        const e = ETIQ[l.estado ?? 'neutro'];
        const etiqueta = l.etiqueta ?? e.t;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: alt, borderTop: i ? '1px solid rgba(255,255,255,0.09)' : 'none', opacity: f >= fi ? Math.min(1, mi * 2) : 0, transform: `translateX(${(1 - mi) * 30}px)`, fontFamily: FONTE_SORA, fontWeight: 600, fontSize: n > 3 ? 32 : 36, color: '#FFFFFF'}}>
            <span>{l.texto}</span>
            {etiqueta ? <span style={{fontSize: 21, fontWeight: 700, letterSpacing: 1.6, color: e.c, border: `1.5px solid ${e.c}`, borderRadius: 999, padding: '6px 18px', background: `${e.c}1F`}}>{etiqueta}</span> : null}
          </div>
        );
      })}
    </div>
  );
};

// ── carimbo: contorno vermelho que bate (130% → 100%) ─────────────────────────────────────────────────────
// cabe na faixa útil (1080 − 2×65 = 950 px): reduz a fonte até caber e, se ainda não couber, quebra em linhas
const LARGURA_CARIMBO = 950;
const medirCarimbo = (texto: string, fs: number) => {
  const espaco = (8 / 132) * fs * texto.length; // letterSpacing proporcional
  try {
    const g = document.createElement('canvas').getContext('2d');
    if (g) { g.font = `700 ${fs}px Oswald`; return g.measureText(texto).width + espaco; }
  } catch { /* sem canvas: estima */ }
  return texto.length * fs * 0.5 + espaco;
};
export const tamanhoCarimbo = (texto: string): {fs: number; quebra: boolean} => {
  const t = texto.toUpperCase();
  // largura útil do texto: faixa − borda (2×11) − respiro lateral (2×44) − folga do giro de 8°
  const util = LARGURA_CARIMBO - 22 - 88 - 40;
  for (let fs = 132; fs >= 64; fs -= 4) if (medirCarimbo(t, fs) <= util) return {fs, quebra: false};
  return {fs: 72, quebra: true};
};

export const Carimbo: React.FC<{texto: string; f0: number}> = ({texto, f0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {fs, quebra} = React.useMemo(() => tamanhoCarimbo(texto), [texto]);
  if (f < f0) return null;
  const m = spring({frame: f - f0, fps, config: {damping: 11, stiffness: 340, mass: 0.55}});
  const esc = 1.3 - 0.3 * Math.min(1.08, m);
  const op = interpolate(f - f0, [0, 3], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 65, right: 65, top: 850, display: 'flex', justifyContent: 'center', opacity: op, transform: `translateY(-50%) rotate(-8deg) scale(${esc})`}}>
      <div style={{fontFamily: FONTE_OSWALD, fontWeight: 700, fontSize: fs, letterSpacing: (8 / 132) * fs, color: VERMELHO, border: `11px solid ${VERMELHO}`, borderRadius: 20, padding: '8px 44px 2px', background: 'rgba(229,72,77,0.10)', textShadow: '0 0 30px rgba(229,72,77,0.45)', boxShadow: '0 0 40px rgba(229,72,77,0.35), inset 0 0 30px rgba(229,72,77,0.18)', textTransform: 'uppercase', whiteSpace: quebra ? 'normal' : 'nowrap', textAlign: 'center', overflowWrap: 'anywhere', maxWidth: '100%', boxSizing: 'border-box'}}>
        {texto}
      </div>
    </div>
  );
};
