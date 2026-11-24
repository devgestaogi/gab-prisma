// Inserts do template cartoon: objeto-prova em primeiro plano, tipografado por código (celular, papel, planilha).
// A cor de destaque (roteiro.cores.destaque; laranja #EE7533 no GI) só aparece aqui, no objeto-prova.
import React from 'react';
import {spring} from 'remotion';
import {FONTE_SORA, P, lista, numero, objeto, quadroDaPalavraT, texto, umDe} from '../comum';
import {clamp, senoide, suave} from './util';

export type Insert = {
  tipo: 'celular' | 'papel' | 'planilha';
  tela?: 'whatsapp' | 'extrato' | 'notificacao';
  palavra?: string; // a palavra da fala em que o insert entra
  titulo?: string;
  linhas?: any[]; // celular/whatsapp: [{nome,msg,hora,n}] ou "Nome: msg"; papel: ["texto"]; planilha: [["a","b"]]
  colunas?: string[];
  destaque?: number; // índice da linha em laranja
  contador?: number; // celular/whatsapp: número no balão vermelho
  notificacao?: {titulo: string; texto: string}; // banner que desce na tela do celular
};
const PRETO = '#0c0c10';
const AV = ['#5b8def', '#d96b6b', '#4caf8e', '#b07cd8', '#e0a23a', '#5fb0c9'];

// Normaliza o insert que vem do roteiro: tipo inválido = sem insert; campo de tipo errado vira ausência ou padrão.
const TIPOS_INS = ['celular', 'papel', 'planilha'] as const;
const TELAS = ['whatsapp', 'extrato', 'notificacao'] as const;
const txt = (v: unknown): string | undefined => { const t = texto(v, ''); return t ? t : undefined; };
export const normInsert = (v: unknown): Insert | undefined => {
  const o = objeto(v);
  if (!TIPOS_INS.includes(o.tipo)) return undefined;
  const tipo = o.tipo as Insert['tipo'];
  let linhas: any[];
  if (tipo === 'celular') {
    linhas = lista(o.linhas).map((l) => {
      if (typeof l === 'string') return {nome: l.split(':')[0], msg: l.split(':').slice(1).join(':').trim()};
      if (l && typeof l === 'object' && !Array.isArray(l)) return {nome: texto(l.nome), msg: texto(l.msg), hora: texto(l.hora), n: texto(l.n)};
      return null;
    }).filter(Boolean).slice(0, 8);
  } else if (tipo === 'papel') {
    linhas = lista(o.linhas).filter((l) => typeof l === 'string' || typeof l === 'number').map((l) => texto(l)).slice(0, 10);
  } else {
    linhas = lista(o.linhas).map((r) => (Array.isArray(r) ? r.map((c) => texto(c)) : typeof r === 'string' || typeof r === 'number' ? [texto(r)] : null)).filter(Boolean).slice(0, 8);
  }
  const colunas = lista(o.colunas).map((c) => texto(c)).slice(0, 6);
  const n = objeto(o.notificacao);
  const dest = typeof o.destaque === 'number' && Number.isFinite(o.destaque) ? Math.round(o.destaque) : undefined;
  return {
    tipo,
    tela: umDe(o.tela, TELAS, 'whatsapp'),
    palavra: txt(o.palavra),
    titulo: txt(o.titulo),
    linhas,
    colunas: colunas.length ? colunas : undefined,
    destaque: dest,
    contador: Math.max(0, Math.min(999, Math.round(numero(o.contador, 0)))),
    notificacao: o.notificacao && typeof o.notificacao === 'object' && (n.titulo || n.texto) ? {titulo: texto(n.titulo), texto: texto(n.texto)} : undefined,
  };
};

export const quadroDeEntrada = (ins: Insert, palavras: P[]) => quadroDaPalavraT(palavras, ins.palavra, 8);

// ── caixa envolvente real do insert (FONTE ÚNICA para o encaixe: posInsert, em planos.tsx, usa só isto) ─────────────
// Retângulo de cada desenho (x, y a 1080×1920, antes do encaixe) com tudo que aparece: celular com moldura, mão,
// polegar, dedos e o balão de contador (só na tela whatsapp com contador > 0, com a pulsada de 7%); papel com a fita;
// planilha. Depois, a rotação da Moldura (rot do tipo mais o balanço de até BALANCO graus em torno de 540,760).
// Devolve o topo e a base em y; é o que o planejador precisa. O que mudar no desenho abaixo muda aqui.
const ROT_TIPO = {celular: -3, papel: -3, planilha: 1.5} as const;
const BALANCO = 0.9; // graus, amplitude de senoide(f, 64) na Moldura
const caixaBruta = (ins: Insert): {x0: number; x1: number; y0: number; y1: number} => {
  if (ins.tipo === 'papel') return {x0: 190, x1: 904, y0: 303, y1: 1184}; // 700 + 2×7 de borda; fita 34 acima do topo
  if (ins.tipo === 'planilha') return {x0: 90, x1: 1006, y0: 340, y1: 340 + 16 + 180 + 76 * Math.max(1, (ins.linhas ?? []).length)};
  const x0 = 540 - 250 + 20; // posição do celular em Celular()
  const contador = (ins.tela ?? 'whatsapp') === 'whatsapp' && (ins.contador ?? 0) > 0;
  return {
    x0: x0 - 75, // mão e polegar à esquerda do aparelho
    x1: x0 + 545, // aparelho (500 + 2×9 de borda) e dedos à direita (até x0 + 539)
    y0: contador ? 310 - 46 - 5 : 310, // balão 116 + 2×7 de borda, subindo 46 acima do topo, pulsando 7%
    y1: 1245, // base da mão
  };
};
export const caixaDoInsert = (ins: Insert): {topo: number; base: number} => {
  const b = caixaBruta(ins);
  let topo = Infinity, base = -Infinity;
  for (const g of [ROT_TIPO[ins.tipo] - BALANCO, ROT_TIPO[ins.tipo] + BALANCO]) {
    const r = (g * Math.PI) / 180;
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) {
      const yy = 760 + (x - 540) * Math.sin(r) + (y - 760) * Math.cos(r);
      topo = Math.min(topo, yy); base = Math.max(base, yy);
    }
  }
  return {topo, base};
};

// Entrada SÓ por escala (82% a 100%, em torno de 540,760, que está dentro da caixa de todo insert) e opacidade, sem
// deslocamento vertical: a mola é limitada a 1, então em todo o caminho o insert fica dentro da caixa final que
// caixaDoInsert devolveu e posInsert validou (fora da faixa da legenda, dentro de 270..1248). Nunca atravessa a legenda.
const Moldura: React.FC<{f: number; fps: number; entra: number; rot: number; children: React.ReactNode}> = ({f, fps, entra, rot, children}) => {
  const s = Math.min(1, spring({frame: f - entra, fps, config: {damping: 14, stiffness: 110}}));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: f >= entra ? Math.min(1, s * 2.5) : 0, transform: `rotate(${rot + senoide(f, 64) * BALANCO}deg) scale(${0.82 + 0.18 * s})`, transformOrigin: '540px 760px'}}>{children}</div>
  );
};

// ── celular ────────────────────────────────────────────────────────────────────────────────────────────
const Celular: React.FC<{ins: Insert; f: number; fps: number; entra: number; cor: string}> = ({ins, f, fps, entra, cor}) => {
  const L = 500, A = 900, x0 = 540 - L / 2 + 20, y0 = 310;
  const tela = ins.tela ?? 'whatsapp';
  const lf = f - entra;
  const vib = lf > 14 && lf < 46 ? senoide(f, 2.6) * 6 : 0;
  const itens = (ins.linhas ?? []).map((l: any) => (typeof l === 'string' ? {nome: l.split(':')[0], msg: l.split(':').slice(1).join(':').trim()} : l));
  const total = ins.contador ?? 0;
  const cont = Math.round(total * suave((lf - 14) / 40));
  const banner = ins.notificacao;
  const bn = banner ? suave((lf - 22) / 8) : 0;
  const pele = '#e6b28a';
  return (
    <Moldura f={f} fps={fps} entra={entra} rot={ROT_TIPO.celular}>
      <div style={{position: 'absolute', left: x0 + vib, top: y0, width: L, height: A, borderRadius: 78, background: '#101218', border: `9px solid ${PRETO}`, boxShadow: '0 40px 80px rgba(0,0,0,.55), inset 0 0 0 5px #2a2d38', overflow: 'hidden', fontFamily: FONTE_SORA}}>
        <div style={{position: 'absolute', inset: 14, borderRadius: 64, overflow: 'hidden', background: tela === 'extrato' ? '#f4f6f4' : '#f2f2ee'}}>
          <div style={{position: 'absolute', top: 12, left: '50%', width: 130, height: 34, marginLeft: -65, borderRadius: 20, background: '#0b0b0e', zIndex: 5}} />
          {tela === 'whatsapp' && (
            <>
              <div style={{height: 150, background: '#165f55', color: '#fff', padding: '64px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box'}}>
                <span style={{fontWeight: 700, fontSize: 38}}>{ins.titulo ?? 'Mensagens'}</span>
                <span style={{background: '#e53935', borderRadius: 24, padding: '4px 18px', fontWeight: 700, fontSize: 32}}>{cont}</span>
              </div>
              {itens.map((it: any, i: number) => {
                const a = suave((lf - 20 - i * 9) / 8);
                const dest = ins.destaque === i;
                return (
                  <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, height: 128, padding: '0 24px', borderBottom: '2px solid #dcdad2', background: dest ? `${cor}33` : 'transparent', opacity: a, transform: `translateX(${(1 - a) * 60}px)`}}>
                    <div style={{width: 76, height: 76, borderRadius: 38, background: AV[i % AV.length], border: `4px solid ${PRETO}`, flex: '0 0 auto'}} />
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontWeight: 700, fontSize: 32, color: '#16181d'}}>{it.nome}</div>
                      <div style={{fontWeight: 400, fontSize: 26, color: '#5a5f68', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{it.msg}</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: 22, color: dest ? cor : '#7b8089', fontWeight: 600}}>{it.hora ?? ''}</div>
                      {it.n ? <div style={{marginTop: 6, display: 'inline-block', minWidth: 38, textAlign: 'center', borderRadius: 20, background: dest ? cor : '#25b36a', color: '#fff', fontWeight: 700, fontSize: 24, padding: '2px 10px'}}>{it.n}</div> : null}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {tela === 'extrato' && (
            <>
              <div style={{height: 150, background: '#1f8f55', color: '#fff', padding: '70px 30px 0', boxSizing: 'border-box', fontWeight: 700, fontSize: 40}}>{ins.titulo ?? 'Extrato'}</div>
              {itens.map((it: any, i: number) => {
                const a = suave((lf - 18 - i * 9) / 8);
                const dest = ins.destaque === i;
                return (
                  <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 104, padding: '0 28px', borderBottom: '2px solid #dde3de', background: dest ? `${cor}33` : 'transparent', opacity: a}}>
                    <span style={{fontSize: 30, fontWeight: 600, color: '#1b2024'}}>{it.nome}</span>
                    <span style={{fontSize: 30, fontWeight: 700, color: dest ? cor : '#c0392b'}}>{it.msg}</span>
                  </div>
                );
              })}
            </>
          )}
          {tela === 'notificacao' && (
            <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#1a2540,#0c1020)', color: '#fff'}}>
              <div style={{textAlign: 'center', marginTop: 110, fontSize: 120, fontWeight: 600}}>{ins.titulo ?? '9:41'}</div>
            </div>
          )}
          {banner && (
            <div style={{position: 'absolute', left: 18, right: 18, top: 70 + (1 - bn) * -200, opacity: bn, background: 'rgba(255,255,255,.97)', border: `5px solid ${PRETO}`, borderRadius: 28, padding: '16px 22px', boxShadow: '0 12px 30px rgba(0,0,0,.35)', zIndex: 6}}>
              <div style={{fontSize: 24, fontWeight: 700, color: cor}}>{banner.titulo}</div>
              <div style={{fontSize: 28, fontWeight: 600, color: '#16181d', marginTop: 2}}>{banner.texto}</div>
            </div>
          )}
        </div>
      </div>
      {/* balão vermelho de contagem, como o ícone do app */}
      {tela === 'whatsapp' && total > 0 && (
        <div style={{position: 'absolute', left: x0 + L - 78, top: y0 - 46, width: 116, height: 116, borderRadius: 58, background: '#e53935', border: `7px solid ${PRETO}`, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: FONTE_SORA, fontWeight: 700, fontSize: 56, transform: `scale(${1 + (lf > 14 && lf < 60 ? 0.07 * senoide(f, 6) : 0)})`, zIndex: 8}}>{cont}</div>
      )}
      {/* mão que segura */}
      <svg style={{position: 'absolute', left: 0, top: 0}} width={1080} height={1920} viewBox="0 0 1080 1920">
        <g transform={`translate(${vib},0)`}>
          <path d={`M${x0 - 30},1000 Q${x0 - 70},1100 ${x0 + 40},1200 L${x0 + 330},1240 Q${x0 + 420},1180 ${x0 + L - 20},1090 L${x0 + L - 60},1000 Z`} fill={pele} stroke={PRETO} strokeWidth={9} strokeLinejoin="round" />
          <rect x={x0 - 40} y={800} width={110} height={190} rx={50} fill={pele} stroke={PRETO} strokeWidth={9} transform={`rotate(8 ${x0},900)`} />
          {[820, 910, 1000].map((y, i) => <rect key={i} x={x0 + L - 70 + i * 4} y={y} width={96} height={64} rx={32} fill={pele} stroke={PRETO} strokeWidth={9} />)}
        </g>
      </svg>
    </Moldura>
  );
};

// ── papel escrito à mão ─────────────────────────────────────────────────────────────────────────────────
const Papel: React.FC<{ins: Insert; f: number; fps: number; entra: number; cor: string}> = ({ins, f, fps, entra, cor}) => {
  const linhas = (ins.linhas ?? []) as string[];
  const lf = f - entra;
  const W = 700, x0 = 540 - W / 2, y0 = 330;
  return (
    <Moldura f={f} fps={fps} entra={entra} rot={ROT_TIPO.papel}>
      <div style={{position: 'absolute', left: x0, top: y0, width: W, height: 840, background: 'linear-gradient(170deg,#f6eed8,#eadfc2)', border: `7px solid ${PRETO}`, borderRadius: 14, boxShadow: '0 40px 70px rgba(0,0,0,.5)', fontFamily: FONTE_SORA, padding: '60px 52px', boxSizing: 'border-box'}}>
        <div style={{position: 'absolute', left: '50%', top: -34, width: 190, height: 62, marginLeft: -95, background: 'rgba(238,200,90,.8)', border: `4px solid ${PRETO}`, transform: 'rotate(-3deg)'}} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} style={{position: 'absolute', left: 30, right: 30, top: 170 + i * 76, height: 2, background: 'rgba(60,90,160,.28)'}} />)}
        <div style={{fontStyle: 'italic', fontWeight: 700, fontSize: 52, color: '#1b2a52', marginBottom: 26, transform: 'rotate(-1deg)'}}>{ins.titulo ?? ''}</div>
        <svg width={W - 104} height={14} style={{position: 'absolute', left: 52, top: 130}}><path d={`M0,8 Q${(W - 104) / 4},0 ${(W - 104) / 2},8 T${W - 104},6`} stroke="#1b2a52" strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={W} strokeDashoffset={W * (1 - suave((lf - 4) / 18))} /></svg>
        {linhas.map((t, i) => {
          const a = suave((lf - 14 - i * 26) / 22);
          const dest = ins.destaque === i;
          return (
            <div key={i} style={{position: 'relative', height: 76, display: 'flex', alignItems: 'center'}}>
              {dest && <div style={{position: 'absolute', left: -10, right: 20, top: 16, height: 46, background: `${cor}66`, borderRadius: 6, transform: `scaleX(${suave((lf - 14 - i * 26 - 10) / 14)})`, transformOrigin: '0 50%'}} />}
              <div style={{position: 'relative', fontStyle: 'italic', fontWeight: 600, fontSize: 38, color: '#1b2a52', whiteSpace: 'nowrap', clipPath: `inset(0 ${(1 - a) * 100}% 0 0)`, transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)`}}>{t}</div>
            </div>
          );
        })}
      </div>
    </Moldura>
  );
};

// ── planilha ─────────────────────────────────────────────────────────────────────────────────────────────
const Planilha: React.FC<{ins: Insert; f: number; fps: number; entra: number; cor: string}> = ({ins, f, fps, entra, cor}) => {
  const cols = ins.colunas ?? ['A', 'B', 'C'];
  const lin = (ins.linhas ?? []) as string[][];
  const lf = f - entra;
  const W = 900, x0 = 90, y0 = 340;
  const larg = (i: number) => (i === 0 ? '42%' : `${58 / Math.max(1, cols.length - 1)}%`);
  return (
    <Moldura f={f} fps={fps} entra={entra} rot={ROT_TIPO.planilha}>
      <div style={{position: 'absolute', left: x0, top: y0, width: W, background: '#fbfcfb', border: `8px solid ${PRETO}`, borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,.5)', fontFamily: FONTE_SORA}}>
        <div style={{background: '#1f7a4c', color: '#fff', fontWeight: 700, fontSize: 36, padding: '22px 30px', display: 'flex', alignItems: 'center', gap: 14}}>
          <span style={{display: 'inline-block', width: 20, height: 20, borderRadius: 10, background: '#fff', opacity: 0.85}} />
          {ins.titulo ?? 'Planilha'}
        </div>
        <div style={{display: 'flex', background: '#e4e9e6', borderBottom: '3px solid #b8c2bc'}}>
          {cols.map((c, i) => <div key={i} style={{width: larg(i), boxSizing: 'border-box', padding: '16px 22px', fontWeight: 700, fontSize: 30, color: '#26332c', borderRight: '2px solid #c4cdc7'}}>{c}</div>)}
        </div>
        {lin.map((r, ri) => {
          const a = suave((lf - 12 - ri * 11) / 8);
          const dest = ins.destaque === ri;
          return (
            <div key={ri} style={{display: 'flex', background: dest ? `${cor}40` : ri % 2 ? '#f3f6f4' : '#fff', borderBottom: '2px solid #d3dad5', opacity: a, outline: dest ? `5px solid ${cor}` : 'none', outlineOffset: -5}}>
              {r.map((c, ci) => <div key={ci} style={{width: larg(ci), boxSizing: 'border-box', padding: '22px 22px', fontWeight: dest ? 700 : 500, fontSize: 30, color: dest && ci === r.length - 1 ? cor : '#1d2723', borderRight: '2px solid #d3dad5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{c}</div>)}
            </div>
          );
        })}
      </div>
    </Moldura>
  );
};

export const InsertView: React.FC<{ins: Insert; f: number; fps: number; palavras: P[]; cor: string}> = ({ins, f, fps, palavras, cor}) => {
  const entra = quadroDeEntrada(ins, palavras);
  if (ins.tipo === 'papel') return <Papel ins={ins} f={f} fps={fps} entra={entra} cor={cor} />;
  if (ins.tipo === 'planilha') return <Planilha ins={ins} f={f} fps={fps} entra={entra} cor={cor} />;
  return <Celular ins={ins} f={f} fps={fps} entra={entra} cor={cor} />;
};
