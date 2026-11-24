// Modo ao vivo: os agentes editam o estúdio na frente de quem assiste.
// Cada agente tem um cursor com nome e cor; o servidor recebe as ações (POST /api/acoes/<projeto>)
// e esta tela as executa uma a uma: o cursor anda até o controle, clica, digita, e o palco muda.
import React from 'react';
import {MODELO_INT} from './App';

export type CursorEstado = {x: number; y: number; visivel: boolean; clique?: number; msg?: string; ultimo?: number};
let RITMO = 1;
export const definirRitmo = (v: number) => { RITMO = v; };
export const COR_AGENTE: Record<string, string> = {
  roteiro: '#ff7eb6', texto: '#f3c74d', personagem: '#ff6b6b', interface: '#3fd0c9',
  movimento: '#8f7cf7', voz: '#3ddc84', render: '#4d8dff', revisao: '#ffa94d', graficos: '#b8f35d', design: '#ff9ff3',
};

export const Cursores: React.FC<{cursores: Record<string, CursorEstado>}> = ({cursores}) => (
  <div style={{position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100}}>
    {Object.entries(cursores).filter(([, c]) => c.visivel).map(([ag, c]) => {
      const cor = COR_AGENTE[ag] ?? '#ffffff';
      const clicando = c.clique && Date.now() - c.clique < 400;
      return (
        <div key={ag} style={{position: 'absolute', left: 0, top: 0, transform: `translate(${c.x}px, ${c.y}px)`, transition: `transform ${(0.38 * RITMO).toFixed(2)}s cubic-bezier(.45,.05,.25,1)`}}>
          {clicando && <div key={c.clique} className="clique" style={{borderColor: cor}} />}
          <svg width="22" height="24" viewBox="0 0 22 24" style={{position: 'absolute', left: -3, top: -2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))', transform: clicando ? 'scale(.85)' : 'none', transition: 'transform .12s'}}>
            <path d="M2 2 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.3 L17 13.3 Z" fill={cor} stroke="#0b0c0f" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <div style={{position: 'absolute', left: 16, top: 18, background: cor, color: '#0b0c0f', font: '600 11px Inter, sans-serif', padding: '3px 8px', borderRadius: 7, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,.45)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {ag}{c.msg ? <span style={{fontWeight: 400}}> · {c.msg}</span> : null}
          </div>
        </div>
      );
    })}
  </div>
);

// Relógio num Web Worker: o Chrome estrangula os timers da página quando a janela fica atrás de outra
// (23/11: a montagem levou 150 s por cena e salvou cenas pela metade por cima do roteiro). Worker não sofre isso.
const RELOGIO = (() => {
  try {
    const w = new Worker(URL.createObjectURL(new Blob(['onmessage=(e)=>setTimeout(()=>postMessage(e.data[0]),e.data[1])'], {type: 'text/javascript'})));
    const fila = new Map<number, () => void>();
    let n = 0;
    w.onmessage = (e) => { const f = fila.get(e.data); fila.delete(e.data); f?.(); };
    return (ms: number, fn: () => void) => { const id = ++n; fila.set(id, fn); w.postMessage([id, ms]); };
  } catch { return (ms: number, fn: () => void) => { setTimeout(fn, ms); }; }
})();
export const depois = RELOGIO;
const esperar = (ms: number) => new Promise<void>((r) => RELOGIO(ms, r));

export class MotorAoVivo {
  ctx: React.MutableRefObject<any>;
  vivo = false;
  desde = 0;
  fila: any[] = [];
  rodando = false;
  pendentes = new Set<Promise<any>>();
  tab = Math.random().toString(36).slice(2);
  vel = 1; // ritmo: 0.5 = duas vezes mais rápido (ação "ritmo")
  dorme(ms: number) { return esperar(ms * this.vel); }
  constructor(ctx: React.MutableRefObject<any>) { this.ctx = ctx; }

  ligar() {
    this.vivo = true;
    // começa do fim: ações antigas (de antes de abrir a tela) não são refeitas
    fetch(`/api/acoes/${this.ctx.current.projeto}?desde=-1&registrar=1&tab=${this.tab}`).then((r) => r.json()).then((d) => { this.desde = d.ultimo ?? 0; this.ouvir(); });
  }
  desligar() { this.vivo = false; }

  async ouvir() {
    while (this.vivo) {
      try {
        const d = await fetch(`/api/acoes/${this.ctx.current.projeto}?desde=${this.desde}&tab=${this.tab}`).then((r) => r.json());
        if (d.ultimo < this.desde) this.desde = 0; // o servidor reiniciou
        // outra aba abriu depois: esta para de executar e de salvar (aba velha atrás de outra janela estragou o roteiro em 23/11)
        if (d.dono === false) { this.fila = []; this.ctx.current.setPassivo(true); }
        for (const a of d.acoes) { this.desde = a.n; this.fila.push(a); }
        if (this.fila.length && !this.rodando) this.rodar();
      } catch {}
      await esperar(400);
    }
  }

  async rodar() {
    this.rodando = true;
    while (this.fila.length) {
      const a = this.fila.shift();
      const p = this.executar(a).catch((e) => console.error('ao vivo', a, e));
      if (a.solto) continue; // roda por fora (vigia): sincronizar não espera por ele
      if (a.junto) { this.pendentes.add(p); p.finally(() => this.pendentes.delete(p)); } else await p;
    }
    this.rodando = false;
  }

  // ── cursor ──
  cur(ag: string, patch: Partial<CursorEstado>) {
    this.ctx.current.setCursores((c: any) => ({...c, [ag]: {x: innerWidth / 2, y: innerHeight / 2, ...c[ag], visivel: true, ultimo: Date.now(), ...patch}}));
  }
  el(alvo: string) { return document.querySelector(`[data-alvo="${alvo}"]`) as HTMLElement | null; }
  async mover(ag: string, alvo: string) {
    const e = this.el(alvo);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    const x = r.left + Math.min(r.width * 0.5, 70), y = r.top + r.height * 0.55;
    this.cur(ag, {x, y});
    await this.dorme(400);
    return true;
  }
  async clicar(ag: string, alvo?: string) {
    this.cur(ag, {clique: Date.now()});
    const e = alvo ? this.el(alvo) : null;
    if (e) { e.style.outline = `2px solid ${COR_AGENTE[ag] ?? '#fff'}`; e.style.outlineOffset = '2px'; setTimeout(() => { e.style.outline = ''; e.style.outlineOffset = ''; }, 900); }
    await this.dorme(120);
  }
  falar(ag: string, msg: string) {
    this.cur(ag, {msg});
    const marca = Date.now();
    setTimeout(() => this.ctx.current.setCursores((c: any) => (c[ag]?.ultimo && c[ag].ultimo - marca < 3000 && c[ag].msg === msg ? {...c, [ag]: {...c[ag], msg: ''}} : c)), 4000);
    fetch(`/api/log/${this.ctx.current.projeto}`, {method: 'POST', body: JSON.stringify({agente: ag, msg})});
  }
  async digitar(texto: string, aplicar: (parcial: string) => void) {
    const passo = Math.max(1, Math.ceil(texto.length / 16));
    for (let k = passo; k < texto.length + passo; k += passo) { aplicar(texto.slice(0, k)); await this.dorme(26); }
    aplicar(texto);
  }

  // ── cena ──
  zero = 0;
  sessao = 0; // cada play novo encerra o vigia do play anterior
  tempoReal = false; // edição em tempo real: o vídeo toca com a voz e cada cena é montada quando a fala chega nela
  agora() { const C = this.ctx.current; const p = C.player.current; return p ? p.getCurrentFrame() / (C.projRef.current?.roteiro.formato.fps ?? 30) : 0; }
  async garantirCena(ag: string, i: number) {
    const C = this.ctx.current;
    for (let t = 0; t < 600 && (C.projRef.current?.roteiro.cenas.length ?? 0) <= i; t++) await esperar(200);
    if (this.tempoReal) { if (C.selRef.current !== i) C.setSel(i); return; } // não pula o player: ele está tocando
    if (C.selRef.current !== i) {
      if (await this.mover(ag, `cena-${i}`)) await this.clicar(ag, `cena-${i}`);
      C.irPara(i);
      await this.dorme(150);
    }
  }

  async esperarAgente(prefixo: string, maxSeg = 900) {
    for (let t = 0; t < maxSeg * 2; t++) {
      const d = await fetch('/api/agentes').then((r) => r.json()).catch(() => null);
      const ocupado = d && Object.entries<any>(d.agentes).some(([n, a]) => n.startsWith(prefixo) && a.estado === 'trabalhando');
      if (d && !ocupado) return;
      await esperar(500);
    }
  }

  async executar(a: any) {
    const C = this.ctx.current;
    const ag = a.agente || 'roteiro';
    if (a.msg && a.tipo !== 'nota') this.falar(ag, a.msg);
    switch (a.tipo) {
      case 'nota': this.falar(ag, a.msg); await this.dorme(a.ms ?? 1400); break;
      case 'olhar': await this.mover(ag, a.alvo); break;
      case 'sumir': C.setCursores((c: any) => ({...c, [ag]: {...c[ag], visivel: false}})); break;
      case 'esperar': await this.dorme(a.ms ?? 1000); break;
      case 'esperar_visivel': {
        // só começa quando a aba está de fato na tela de quem assiste (janela em outra mesa = escondida)
        if (document.visibilityState !== 'visible') {
          fetch(`/api/log/${C.projeto}`, {method: 'POST', body: JSON.stringify({agente: 'roteiro', msg: 'esperando a aba do estúdio aparecer na tela'})});
          while (document.visibilityState !== 'visible') await esperar(300);
        }
        fetch(`/api/log/${C.projeto}`, {method: 'POST', body: JSON.stringify({agente: 'roteiro', msg: 'aba na tela'})});
        await esperar(2200); // tempo para o clique real que libera o som
        break;
      }
      case 'tempo_real': this.tempoReal = a.valor !== false; break;
      case 'vigiar': {
        // revisão da reprodução: a cabeça tem de andar sempre para a frente, em 1x, do começo ao fim
        const fps = C.projRef.current.roteiro.formato.fps;
        const fim = a.ate ?? 1e9;
        let ant = this.agora(), parado = 0, avisos = 0;
        const minha = this.sessao;
        const log = (msg: string) => fetch(`/api/log/${C.projeto}`, {method: 'POST', body: JSON.stringify({agente: 'revisao', msg})});
        const t0 = Date.now();
        while (Date.now() - t0 < (fim + 15) * 1000) {
          await esperar(250);
          if (this.sessao !== minha) break;
          const t = this.agora();
          if (t < ant - 0.3 && avisos < 8) { avisos++; log(`⚠ VOLTOU na linha do tempo: de ${ant.toFixed(2)} s para ${t.toFixed(2)} s`); }
          if (Math.abs(t - ant) < 1 / fps && !C.player.current?.isPlaying()) parado++; else parado = 0;
          if (t >= fim - 0.3) break;
          if (parado === 8 && avisos < 8) { avisos++; log(`⚠ PAROU em ${t.toFixed(2)} s`); }
          ant = t;
        }
        log(`vigia da reprodução: ${avisos ? avisos + ' problema(s)' : 'andou do começo ao fim sem voltar'}`);
        break;
      }
      case 'tocar_de': {
        // play de verdade, com a voz: o cursor aperta o play e a cabeça anda em 1x
        await this.mover(ag, 'play'); await this.clicar(ag, 'play');
        const fps = C.projRef.current.roteiro.formato.fps;
        C.player.current?.seekTo(Math.round((a.seg ?? 0) * fps));
        this.zero = Date.now() - (a.seg ?? 0) * 1000;
        this.sessao++; // relógio da voz: anda em 1x mesmo se o player não tocar
        await esperar(80);
        C.player.current?.play();
        break;
      }
      case 'quando': {
        // espera a cabeça de reprodução chegar no segundo pedido (se o player parou, segue em 20 s)
        const t0 = Date.now();
        // manda o player (a voz); o relógio de parede só vale se o player não estiver tocando
        const tempoVoz = () => (C.player.current?.isPlaying() ? this.agora() : Math.max(this.agora(), this.zero ? (Date.now() - this.zero) / 1000 : 0));
        while (tempoVoz() < a.seg && Date.now() - t0 < 20000) await esperar(40);
        break;
      }
      case 'ritmo': this.vel = Math.max(0.2, Math.min(3, +a.valor || 1)); definirRitmo(this.vel); break;
      case 'recarregar': await C.carregar(); C.setCursores({}); break;
      case 'sincronizar': await Promise.all([...this.pendentes]); break;
      case 'nova_cena': {
        await this.mover(ag, 'cena-nova');
        await this.clicar(ag, 'cena-nova');
        const i = C.projRef.current.roteiro.cenas.length;
        C.novaCena({fundo: a.fundo ?? 'claro', ...(a.ancora ? {ancora: a.ancora} : {})});
        await this.dorme(60);
        if (this.tempoReal) C.setSel(i); else C.irPara(i);
        await this.dorme(120);
        await this.mover(ag, 'camada-fala');
        await this.clicar(ag, 'camada-fala');
        await this.digitar(a.fala, (s) => C.mudarCena(i, {fala: s}, false));
        break;
      }
      case 'fala': case 'texto': {
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, `camada-${a.tipo}`);
        await this.clicar(ag, `camada-${a.tipo}`);
        await this.digitar(a.valor ?? '', (s) => C.mudarCena(a.cena, {[a.tipo]: s || null}, false));
        break;
      }
      case 'fundo': {
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, 'camada-fundo');
        await this.clicar(ag, 'camada-fundo');
        C.mudarCena(a.cena, {fundo: a.valor});
        break;
      }
      case 'personagem': {
        // espera o desenho ficar pronto antes de pôr na cena
        for (let t = 0; t < 1800 && !C.projRef.current.personagens.includes(a.nome); t++) await esperar(500);
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, `pers-${a.nome}`);
        await this.clicar(ag, `pers-${a.nome}`);
        if (a.campo === 'personagem2') { await this.mover(ag, 'camada-personagem2'); await this.clicar(ag, 'camada-personagem2'); }
        C.mudarCena(a.cena, {[a.campo || 'personagem']: a.nome});
        break;
      }
      case 'personagem_novo': {
        await this.mover(ag, 'pers-novo');
        await this.clicar(ag, 'pers-novo');
        this.falar(ag, `pedindo ao Codex: ${a.nome}`);
        await C.gerarPersonagem(a.nome, a.descricao);
        await this.dorme(500);
        await this.mover(ag, `pers-${a.nome}`);
        break;
      }
      case 'interface': {
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, 'camada-interface');
        await this.clicar(ag, 'camada-interface');
        C.mudarCena(a.cena, {interface: {...(MODELO_INT[a.valor.tipo] ?? {}), ...a.valor}});
        await this.mover(ag, 'codigo');
        break;
      }
      case 'movimento': {
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, `mov-${a.valor}`);
        await this.clicar(ag, `mov-${a.valor}`);
        C.mudarCena(a.cena, (c: any) => ({...c, ajuste: {...c.ajuste, movimento: a.valor}}));
        break;
      }
      case 'slider': {
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, `slider-${a.campo}`);
        await this.clicar(ag, `slider-${a.campo}`);
        const ini = C.projRef.current.roteiro.cenas[a.cena]?.ajuste?.[a.campo] ?? (a.campo === 'escala' || a.campo === 'opacidade' ? 100 : 0);
        for (let k = 1; k <= 10; k++) { const v = Math.round(ini + ((a.valor - ini) * k) / 10); C.mudarCena(a.cena, (c: any) => ({...c, ajuste: {...c.ajuste, [a.campo]: v}}), k === 10); await this.dorme(30); }
        break;
      }
      case 'ir': await this.garantirCena(ag, a.cena); break;
      case 'marca': {
        // gráfico que pula na palavra: o cursor clica no palco e ele aparece
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, 'palco');
        await this.clicar(ag, 'palco');
        this.falar(ag, `"${a.valor.palavra}" → ${a.valor.icone ?? ''}${a.valor.texto ? ' ' + a.valor.texto : ''}`);
        C.mudarCena(a.cena, (c: any) => ({...c, marcas: [...(c.marcas ?? []).filter((m: any) => m.palavra !== a.valor.palavra), a.valor]}));
        await this.dorme(120);
        break;
      }
      case 'tela': {
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, 'palco');
        await this.clicar(ag, 'palco');
        C.mudarCena(a.cena, (c: any) => ({...c, tela: a.valor}));
        await this.dorme(150);
        break;
      }
      case 'campos': {
        // campos próprios dos templates de edição (diorama, vetor, cartoon): entram na cena de uma vez
        await this.garantirCena(ag, a.cena);
        await this.mover(ag, 'palco');
        await this.clicar(ag, 'palco');
        C.mudarCena(a.cena, (c: any) => ({...c, ...(a.valor ?? {})}));
        await this.dorme(150);
        break;
      }
      case 'legenda': {
        await this.mover(ag, 'camada-texto');
        await this.clicar(ag, 'camada-texto');
        C.mudarRoteiro((r: any) => ({...r, legenda: a.valor !== false}));
        break;
      }
      case 'ver': {
        // revisão: arrasta pela linha do tempo e para num ponto da cena (pos 0 = começo, 1 = fim)
        await this.garantirCena(ag, a.cena);
        const t = C.projRef.current?.tempo?.cenas?.[a.cena];
        const e = this.el(`cena-${a.cena}`);
        if (t && e) {
          const r = e.getBoundingClientRect();
          this.cur(ag, {x: r.left + r.width * a.pos, y: r.top + r.height / 2});
          const fps = C.projRef.current.roteiro.formato.fps;
          C.player.current?.seekTo(Math.round((t.ini + (t.fim - t.ini) * a.pos) * fps));
        }
        await this.dorme(a.ms ?? 500);
        break;
      }
      case 'medir': {
        const e = document.querySelector('.tela .player') as HTMLElement;
        if (e) {
          const r = e.getBoundingClientRect();
          // posição do palco dentro da página (px CSS) + tamanho da página: quem fotografa a janela recorta por aqui
          const m = {x: r.left, y: r.top, w: r.width, h: r.height, iw: window.innerWidth, ih: window.innerHeight};
          await fetch(`/api/log/${C.projeto}`, {method: 'POST', body: JSON.stringify({agente: 'medida', msg: JSON.stringify(m)})});
        }
        break;
      }
      case 'play': await this.mover(ag, 'play'); await this.clicar(ag, 'play'); if (a.cena != null) C.irPara(a.cena); await this.dorme(100); C.player.current?.play(); break;
      case 'pausar': await this.mover(ag, 'play'); await this.clicar(ag, 'play'); C.player.current?.pause(); break;
      case 'voz': {
        await this.mover(ag, 'voz-trocar');
        await this.clicar(ag, 'voz-trocar');
        (window as any).__vozDoMotor = Date.now();
        await fetch(`/api/voz-local/${C.projeto}`, {method: 'POST', body: JSON.stringify({arquivo: a.arquivo, plano: a.plano})});
        await this.mover(ag, 'pista-voz');
        await this.esperarAgente('voz', 300);
        await C.carregar();
        break;
      }
      case 'esperar_personagens': await this.esperarAgente('personagem:', a.max ?? 1200); break;
      case 'exportar': await this.mover(ag, 'exportar'); await this.clicar(ag, 'exportar'); await C.exportar(); break;
    }
  }
}
