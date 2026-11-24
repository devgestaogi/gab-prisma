import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Player, PlayerRef} from '@remotion/player';
import {Filme, Cena, Ajuste, sonsDaCena, palavrasDaCena} from '../src/Filme';
import {Cursores, CursorEstado, MotorAoVivo, depois} from './AoVivo';

const PROJETO = new URLSearchParams(location.search).get('p') || 'centro-eventos';
// ?ver=1: modo só de olhar (revisão do Claude): não executa ações, não salva, não vira a aba principal
const SO_VER = new URLSearchParams(location.search).get('ver') === '1';
const COR_SOM: Record<string, string> = {pop: '#ff7eb6', whoosh: '#3fd0c9', toque: '#f3c74d', ding: '#4d8dff', apito: '#ff6b6b', risco: '#ffa94d', boom: '#b3a6ff'};
const TIPOS_INT = ['', 'aviso', 'medidor', 'contador', 'lista_riscada', 'marca', 'checklist', 'numero', 'botao'];
const MOVS: [NonNullable<Ajuste['movimento']>, string][] = [['quica', 'Quica'], ['pop', 'Pop'], ['balanca', 'Balança'], ['desliza', 'Desliza'], ['reta', 'Reta']];
export const MODELO_INT: Record<string, any> = {
  aviso: {tipo: 'aviso', titulo: 'Título', linha: 'Linha', tom: 'ok'},
  medidor: {tipo: 'medidor', titulo: 'Nível', linha: ''},
  contador: {tipo: 'contador', titulo: 'Contador', de: 0, ate: 100},
  lista_riscada: {tipo: 'lista_riscada', itens: ['item 1', 'item 2']},
  marca: {tipo: 'marca', linha: 'Canela · RS'},
  checklist: {tipo: 'checklist', itens: ['Palco', 'Telão', 'Som', 'Luz']},
  numero: {tipo: 'numero', de: 0, ate: 140, rotulo: 'lugares', chips: []},
  botao: {tipo: 'botao', titulo: 'Agendar visita', linha: ''},
};
const CENA_VAZIA: Cena = {id: '', fala: '', personagem: null, texto: '', interface: null, fundo: 'claro'};

// Rótulos da linha do tempo: cada pista mostra uma coisa diferente (antes CENAS e TEXTO repetiam o mesmo título
// e a pista INTERFACE repetia "aviso aviso aviso…" — Gabriel, 23/11).
const PARADAS = new Set(['a', 'o', 'e', 'de', 'do', 'da', 'no', 'na', 'em', 'um', 'uma', 'que', 'pra', 'para', 'os', 'as', 'dos', 'das', 'com', 'por', 'se', 'ao', 'são', 'é']);
const rotuloFala = (c: Cena) => { const ps = (c.fala || '').replace(/[.,:;!?…]+$/g, '').split(/\s+/).filter(Boolean); return ps.slice(0, 4).join(' ') + (ps.length > 4 ? '…' : ''); };
const rotuloCena = (c: Cena) => {
  const t = (c.texto || '').replace(/[.…]+$/g, '').trim();
  if (t) return t.toLowerCase();
  return (c.fala || '').toLowerCase().replace(/[^a-zà-ú0-9 ]/gi, '').split(/\s+/).filter((w) => w && !PARADAS.has(w)).slice(0, 2).join(' ');
};
const rotuloInterface = (c: Cena) => {
  const i = c.interface;
  const partes: string[] = [];
  if (c.tela) partes.push('tela ' + (c.tela.imagem.split('/').pop() || '').replace(/\.\w+$/, ''));
  if (i) {
    if (i.tipo === 'aviso') partes.push([i.titulo, i.linha].filter(Boolean).join(' · '));
    else if (i.tipo === 'checklist' || i.tipo === 'lista_riscada') partes.push((i.tipo === 'checklist' ? '✓ ' : '✕ ') + (i.itens ?? []).join(' · '));
    else if (i.tipo === 'numero' || i.tipo === 'contador') partes.push(`${i.de ?? 0}→${i.ate ?? ''} ${i.rotulo ?? i.titulo ?? ''}`.trim());
    else if (i.tipo === 'marca') partes.push('marca · ' + (i.linha ?? ''));
    else if (i.tipo === 'botao') partes.push('botão · ' + (i.titulo ?? ''));
    else partes.push([i.tipo, i.titulo ?? i.linha ?? ''].filter(Boolean).join(' · '));
  }
  return partes.join('  +  ');
};
const rotuloPers = (n: string) => n;

const tc = (seg: number, fps: number) => {
  const s = Math.max(0, seg);
  const p = (n: number) => String(Math.floor(n)).padStart(2, '0');
  return `${p(s / 3600)}:${p((s / 60) % 60)}:${p(s % 60)}:${p(Math.round((s % 1) * fps) % fps)}`;
};

// Sem voz alinhada, o tempo de cada cena é estimado pelo tamanho da fala (a voz entra depois e acerta tudo).
const estimarTempo = (cenas: Cena[]) => {
  let t = 0;
  const cs = cenas.map((c) => {
    const n = (c.fala || '').split(/\s+/).filter(Boolean).length;
    const d = Math.max(1.8, n * 0.36 + 0.6);
    const r = {id: c.id, ini: t, fim: t + d};
    t += d;
    return r;
  });
  return {duracao: Math.max(t, 2), cenas: cs, palavras: []};
};

type Proj = {roteiro: any; tempo: any; personagens: string[]; sons: string[]; ondas: number[]};

export const App: React.FC = () => {
  const [proj, setProj] = useState<Proj | null>(null);
  const [sel, setSel] = useState(0);
  const [ver, setVer] = useState(0);
  const [agentes, setAgentes] = useState<any>({agentes: {}, registro: []});
  const [salvo, setSalvo] = useState(true);
  const [aba, setAba] = useState<'cena' | 'filme'>('cena');
  const [modal, setModal] = useState<null | {tipo: 'personagem'}>(null);
  const [toast, setToast] = useState('');
  const [fonte, setFonte] = useState('');
  const [cursores, setCursores] = useState<Record<string, CursorEstado>>({});
  const [passivo, setPassivo] = useState(SO_VER);
  const passivoRef = useRef(false); passivoRef.current = passivo;
  const historia = useRef<{passado: any[]; futuro: any[]}>({passado: [], futuro: []});
  const player = useRef<PlayerRef>(null);
  const antes = useRef<any>({});
  const destinoRef = useRef<any>(null); // arquivo escolhido na janela de salvar do Chrome

  const carregar = useCallback(async () => {
    const d = await fetch(`/api/projeto/${PROJETO}`).then((r) => r.json());
    setProj(d);
    setVer((v) => v + 1);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  const avisar = (m: string) => { setToast(m); setTimeout(() => setToast((t) => (t === m ? "" : t)), 5000); };

  // agentes do servidor: consulta a cada segundo; quando um termina, recarrega o que ele mudou
  useEffect(() => {
    const t = setInterval(async () => {
      const a = await fetch('/api/agentes').then((r) => r.json()).catch(() => null);
      if (!a) return;
      for (const [nome, st] of Object.entries<any>(a.agentes)) {
        const ant = antes.current[nome];
        if (ant && ant.estado === 'trabalhando' && st.estado !== 'trabalhando') {
          if (st.estado === 'pronto') {
            // a voz pedida pelo motor ao vivo ele mesmo recarrega; recarregar aqui de novo remontava o player no meio da
            // reprodução e a linha do tempo voltava ao começo (Gabriel, 23/11: "takes repetindo o começo")
            if ((nome === 'voz' && Date.now() - ((window as any).__vozDoMotor || 0) > 120000) || nome.startsWith('personagem:')) { carregar(); avisar(nome === 'voz' ? 'Voz realinhada: cenas presas à voz nova' : `Personagem ${nome.split(':')[1]} pronto`); }
            if (nome === 'exportar') {
              const h = destinoRef.current;
              if (h) {
                destinoRef.current = null;
                avisar('Gravando o vídeo onde você escolheu…');
                (async () => {
                  try {
                    const b = await fetch(`/api/video/${PROJETO}?t=${Date.now()}`).then((r) => { if (!r.ok) throw new Error('vídeo não encontrado'); return r.blob(); });
                    const w = await h.createWritable(); await w.write(b); await w.close();
                    avisar(`Vídeo salvo: ${h.name}`);
                  } catch (e: any) { avisar('Erro ao salvar o vídeo: ' + (e?.message || e)); }
                })();
              } else avisar('Vídeo salvo em: ' + (st.destino || 'saida/' + PROJETO + '.mp4'));
            }
          } else avisar(`Agente ${nome} falhou — veja o registro`);
        }
      }
      antes.current = a.agentes;
      setAgentes(a);
    }, 1000);
    return () => clearInterval(t);
  }, [carregar]);

  // salvar sozinho
  const timerSalvar = useRef<any>();
  const mudarRoteiro = useCallback((fn: (r: any) => any, guardar = true) => {
    setProj((p) => {
      if (!p) return p;
      if (guardar) { historia.current.passado.push(p.roteiro); historia.current.futuro = []; }
      const r = fn(structuredClone(p.roteiro));
      setSalvo(false);
      const meu = (timerSalvar.current = (timerSalvar.current || 0) + 1); // relógio do worker: salva mesmo com a janela atrás
      depois(700, async () => {
        if (meu !== timerSalvar.current) return;
        if (passivoRef.current) return; // aba que não é a principal não salva
        await fetch(`/api/projeto/${PROJETO}`, {method: 'PUT', body: JSON.stringify(r)});
        setSalvo(true);
      });
      return {...p, roteiro: r};
    });
  }, []);
  const desfazer = () => { const r = historia.current.passado.pop(); if (!r || !proj) return; historia.current.futuro.push(proj.roteiro); mudarRoteiro(() => r, false); };
  const refazer = () => { const r = historia.current.futuro.pop(); if (!r || !proj) return; historia.current.passado.push(proj.roteiro); mudarRoteiro(() => r, false); };
  const mudarCena = useCallback((i: number, patch: Partial<Cena> | ((c: Cena) => Cena), guardar = true) =>
    mudarRoteiro((r) => { if (!r.cenas[i]) return r; r.cenas[i] = typeof patch === 'function' ? patch(r.cenas[i]) : {...r.cenas[i], ...patch}; return r; }, guardar), [mudarRoteiro]);
  const novaCena = useCallback((c?: Partial<Cena>) => {
    mudarRoteiro((r) => { r.cenas.push({...CENA_VAZIA, id: `c${String(r.cenas.length + 1).padStart(2, '0')}`, ...c}); return r; });
  }, [mudarRoteiro]);

  const fps = proj?.roteiro.formato.fps ?? 30;
  const nCenas = proj?.roteiro.cenas.length ?? 0;
  const alinhado = !!proj?.tempo && proj.tempo.cenas.length === nCenas;
  // voz já na linha do tempo e as cenas sendo montadas em cima dela (modo ao vivo: voz primeiro)
  const temVoz = !!proj?.tempo && !!proj?.roteiro.narracao && nCenas <= proj.tempo.cenas.length;
  const montando = temVoz && !alinhado;
  const vozDesatualizada = useMemo(() => {
    if (!proj?.tempo || !alinhado) return true;
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    const dito = proj.tempo.palavras.map((w: any) => w.p).join('');
    return proj.roteiro.cenas.some((c: Cena) => !dito.includes(norm((c as any).ancora || c.fala).slice(0, 12)));
  }, [proj, alinhado]);
  const dados = useMemo(() => {
    // com a voz já na linha do tempo o player existe mesmo sem cenas: a montagem ao vivo toca a voz desde o começo
    // (sem isso o player só nascia na 1ª cena, parado em 0,8 s, e no fim tudo "voltava ao começo" — 23/11)
    if (!proj || (!nCenas && !temVoz)) return null;
    const tempo = alinhado ? proj.tempo : temVoz ? {...proj.tempo, cenas: proj.tempo.cenas.slice(0, nCenas)} : estimarTempo(proj.roteiro.cenas);
    return {projeto: proj.roteiro.projeto, roteiro: proj.roteiro, tempo, personagens: proj.personagens, semVoz: !alinhado && !temVoz};
  }, [proj, alinhado, temVoz, nCenas]);
  const durFrames = dados ? Math.max(1, Math.ceil(dados.tempo.duracao * fps)) : 1;

  // sons de todas as cenas, em segundos (faixa EFEITOS e registro)
  const efeitos = useMemo(() => {
    if (!dados) return [];
    return dados.roteiro.cenas.flatMap((c: Cena, i: number) => {
      const t = dados.tempo.cenas[i];
      const tem = !!c.personagem && dados.personagens.includes(c.personagem);
      return sonsDaCena(c, i === 0, tem, palavrasDaCena(dados as any, i, fps)).map((s) => ({...s, cena: i, t: t.ini + s.f / fps}));
    });
  }, [dados, fps]);

  const dadosRef = useRef(dados); dadosRef.current = dados;
  const irPara = useCallback((i: number) => {
    const d = dadosRef.current;
    setSel(i);
    if (!d || !d.tempo.cenas[i]) return;
    const c = d.tempo.cenas[i];
    setTimeout(() => player.current?.seekTo(Math.round(Math.min(c.ini + 0.8, (c.ini + c.fim) / 2) * fps)), 30);
  }, [fps]);
  const tocar = () => player.current?.toggle();

  const exportar = async () => {
    if (dadosRef.current?.semVoz) { avisar('Falta a voz: envie a narração antes de exportar'); return; }
    try {
      // janela "Salvar como" do próprio Chrome, aberta dentro do estúdio (a do Mac abria atrás da janela — 23/11)
      if ('showSaveFilePicker' in window) {
        let h: any;
        try {
          h = await (window as any).showSaveFilePicker({suggestedName: `reel-${PROJETO}-${new Date().toLocaleString('sv-SE').slice(0, 16).replace(' ', '-').replace(':', 'h')}.mp4`, types: [{description: 'Vídeo MP4', accept: {'video/mp4': ['.mp4']}}]});
        } catch { avisar('Exportação cancelada'); return; }
        destinoRef.current = h;
        const r = await fetch(`/api/exportar/${PROJETO}?navegador=1`, {method: 'POST'}).then((r) => r.json());
        if (!r.ok) { destinoRef.current = null; avisar(r.motivo === 'ocupado' ? 'Já tem uma exportação rodando' : 'Não consegui exportar'); return; }
        avisar(`Exportando… vai salvar como ${h.name}`);
        return;
      }
      avisar('Escolha onde salvar o vídeo (janela do Mac)…');
      const r = await fetch(`/api/exportar/${PROJETO}`, {method: 'POST'}).then((r) => r.json());
      if (!r.ok) avisar(r.motivo === 'cancelado' ? 'Exportação cancelada' : 'Já tem uma exportação rodando');
      else avisar('Exportando para: ' + r.destino);
    } catch (e: any) { avisar('Erro ao exportar: ' + (e?.message || e)); }
  };
  const novaVoz = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      const ext = f.name.split('.').pop() || 'mp3';
      await fetch(`/api/voz/${PROJETO}?ext=${ext}`, {method: 'POST', body: f});
      avisar('Voz recebida: o agente de voz está prendendo as cenas nela');
    };
    inp.click();
  };
  const realinhar = () => fetch(`/api/alinhar/${PROJETO}`, {method: 'POST'}).then(() => avisar('Realinhando as cenas à voz'));
  const gerarPersonagem = useCallback(async (nome: string, descricao?: string, refazer = false) => {
    const chave = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    if (descricao) mudarRoteiro((r) => { r.personagens[chave] = descricao; return r; }, false);
    await fetch(`/api/personagem/${PROJETO}`, {method: 'POST', body: JSON.stringify({nome, descricao, refazer})});
    avisar(`Codex desenhando ${nome}… (1 a 5 min)`);
  }, [mudarRoteiro]);

  // motor do modo ao vivo (cursores dos agentes)
  const projRef = useRef(proj); projRef.current = proj;
  const selRef = useRef(sel); selRef.current = sel;
  const ctx = useRef<any>({});
  ctx.current = {setSel, projRef, selRef, mudarCena, mudarRoteiro, novaCena, irPara, exportar, player, gerarPersonagem, carregar, setCursores, setPassivo, projeto: PROJETO};
  useEffect(() => { if (SO_VER) return; const m = new MotorAoVivo(ctx); m.ligar(); return () => m.desligar(); }, []);
  // a revisão (modo só de olhar) controla o palco por aqui
  useEffect(() => { (window as any).__estudio = {ir: (seg: number) => player.current?.seekTo(Math.round(seg * fps)), carregar, tocar: () => player.current?.play(), quadro: () => player.current?.getCurrentFrame(), tocando: () => player.current?.isPlaying()}; });

  // teclado
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); tocar(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? refazer() : desfazer(); }
      if (e.key === 'ArrowRight' && proj) irPara(Math.min(proj.roteiro.cenas.length - 1, sel + 1));
      if (e.key === 'ArrowLeft') irPara(Math.max(0, sel - 1));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  useEffect(() => { if (aba === 'filme' && !fonte) fetch('/api/fonte').then((r) => r.json()).then((d) => setFonte(d.texto)); }, [aba, fonte]);

  if (!proj) return <div style={{padding: 30, color: '#8b8f9a'}}>carregando o estúdio…</div>;
  const R = proj.roteiro;
  const cena: Cena = R.cenas[sel] ?? CENA_VAZIA;
  const temCena = !!R.cenas[sel];
  const trabalhando = Object.entries<any>(agentes.agentes).filter(([, a]) => a.estado === 'trabalhando');
  const cursoresAtivos = Object.values(cursores).filter((c) => c.visivel).length;
  const exp = agentes.agentes.exportar;
  const gerando = (n: string) => agentes.agentes[`personagem:${n}`]?.estado === 'trabalhando';
  // roteiro de template de edição (diorama, vetor, cartoon) não tem personagens desenhados pelo Codex nem cores do Prisma
  const todosPers = [...new Set([...Object.keys(R.personagens ?? {}), ...proj.personagens])];

  return (
    <div className="estudio">
      {/* ───────── topo ───────── */}
      <header className="topo">
        <div className="marca"><i />prisma <small>studio</small></div>
        <nav className="menus">
          <Menu nome="Arquivo" itens={[['Novo vídeo (prompt do roteiro)…', () => { location.href = '/pedido.html'; }], ['Salvar agora', () => mudarRoteiro((r) => r, false), '⌘S'], ['Exportar vídeo', exportar], ['Mostrar pasta de saída', () => fetch('/api/abrir')]]} />
          <Menu nome="Editar" itens={[['Desfazer', desfazer, '⌘Z', !historia.current.passado.length], ['Refazer', refazer, '⇧⌘Z', !historia.current.futuro.length]]} />
          <Menu nome="Cena" itens={[['Nova cena', () => { novaCena(); setSel(R.cenas.length); }], ...R.cenas.map((c: Cena, i: number) => [`${String(i + 1).padStart(2, '0')} · ${rotuloCena(c)}`, () => irPara(i)])]} />
          <Menu nome="Personagem" itens={[['Novo personagem…', () => setModal({tipo: 'personagem'})], ['Redesenhar o da cena', () => cena.personagem && gerarPersonagem(cena.personagem, undefined, true), '', !cena.personagem]]} />
          <Menu nome="Som" itens={[['Trocar a voz (arquivo de áudio)…', novaVoz], ['Prender cenas à voz de novo', realinhar]]} />
          <Menu nome="Agentes" itens={Object.entries<any>(agentes.agentes).map(([n, a]) => [`${n} · ${a.estado}`, () => {}])} />
        </nav>
        <div className="proj"><b>{R.projeto}_v{historia.current.passado.length + 1}</b><span>{cursoresAtivos ? 'montando ao vivo · ' : ''}{salvo ? 'salvo agora' : 'salvando…'} · {R.cenas.length} cenas</span></div>
        <div className="direita">
          <div className="bolinhas">{['#ff7eb6', '#ffa94d', '#f3c74d', '#3ddc84', '#3fd0c9', '#4d8dff', '#8f7cf7'].map((c) => <i key={c} style={{background: c}} />)}</div>
          <div className="ativos">• <b>{trabalhando.length + cursoresAtivos}</b> agente{trabalhando.length + cursoresAtivos === 1 ? '' : 's'} ativo{trabalhando.length + cursoresAtivos === 1 ? '' : 's'}</div>
          <button data-alvo="exportar" className="btn roxo" onClick={exportar} disabled={exp?.estado === 'trabalhando'}>{exp?.estado === 'trabalhando' ? 'Exportando…' : 'Exportar'}</button>
        </div>
      </header>

      <main className="meio">
        {/* ───────── biblioteca ───────── */}
        <aside className="col">
          <div className="tit">Biblioteca <span>{todosPers.length + proj.sons.length + 1} itens</span></div>
          <div className="sub">personagens</div>
          <div className="grade">
            {todosPers.map((n) => (
              <button key={n} data-alvo={`pers-${n}`} className={`pers ${cena.personagem === n ? 'sel' : ''} ${gerando(n) ? 'gerando' : ''}`} title={`${n}: clique para pôr na cena ${sel + 1}`} onClick={() => temCena && mudarCena(sel, {personagem: cena.personagem === n ? null : n})}>
                {proj.personagens.includes(n) ? <img src={`/${R.projeto}/personagens/${n}.png?v=${ver}`} /> : <span style={{color: '#5b606c', fontSize: 10}}>{gerando(n) ? 'desenhando' : '…'}</span>}
                <span className="nome">{n}</span>
                <span className="refazer" title="redesenhar" onClick={(e) => { e.stopPropagation(); gerarPersonagem(n, undefined, true); }}>↻</span>
              </button>
            ))}
            <button data-alvo="pers-novo" className="pers novo" title="novo personagem" onClick={() => setModal({tipo: 'personagem'})}>+</button>
          </div>
          <div className="sub">sons · {proj.sons.length}</div>
          <div className="sons">
            {proj.sons.map((s) => (
              <button key={s} data-alvo={`som-${s}`} className={`som ${efeitos.some((e) => e.cena === sel && e.som === s) ? 'quente' : ''}`} onClick={() => new Audio(`/sons/${s}.wav`).play()}>
                <i style={{background: COR_SOM[s] ?? '#8b8f9a'}} />{s}
              </button>
            ))}
          </div>
          <div className="sub">voz</div>
          <div className="voz">
            <b>narracao.wav</b>
            <span>{proj.tempo && (alinhado || temVoz) ? `${proj.tempo.duracao.toFixed(1)} s` : 'sem voz ainda'} · {R.narracao?.includes('provisoria') ? 'voz provisória · ElevenLabs' : R.narracao ? 'voz enviada' : 'tempo estimado'}</span>
            <Onda ondas={temVoz || alinhado ? proj.ondas : []} className="onda" cor="#3ddc84" />
            <div style={{display: 'flex', gap: 6}}>
              <button data-alvo="voz-trocar" className="btn pequeno" onClick={novaVoz}>Trocar voz</button>
              <button className="btn pequeno" onClick={realinhar}>Realinhar</button>
            </div>
          </div>
          <div className="sub">fontes</div>
          <div className="fontes"><div>Sora 700 · títulos</div><div>Sora 500–600 · interface</div><div style={{color: '#8b8f9a'}}>Inter · JetBrains Mono (estúdio)</div></div>
        </aside>

        {/* ───────── palco ───────── */}
        <section className="centro">
          <div className="palco">
            <div className="cab"><span>PALCO</span><Relogio player={player} fps={fps} prefixo={`cena ${String(sel + 1).padStart(2, '0')} · `} /></div>
            <div className="tela" data-alvo="palco">
              {nCenas > 0 && vozDesatualizada && !montando && (
                <div className="aviso-voz">
                  <span>{!alinhado ? 'Tempo estimado: a voz ainda não entrou.' : 'A fala de alguma cena mudou e a voz não diz mais isso.'} {!alinhado ? 'Quando a narração chegar, as cenas se prendem a ela.' : 'Envie a voz nova.'}</span>
                  <button className="btn pequeno" onClick={novaVoz}>Enviar voz</button>
                </div>
              )}
              {dados ? (
                <Player key={ver} ref={player} className="player" component={Filme as any} inputProps={{projeto: R.projeto, dados}} durationInFrames={durFrames} fps={fps}
                  compositionWidth={R.formato.largura} compositionHeight={R.formato.altura} style={{height: '96%', width: 'auto', aspectRatio: `${R.formato.largura}/${R.formato.altura}`}} clickToPlay doubleClickToFullscreen numberOfSharedAudioTags={40} initialFrame={Math.min(24, durFrames - 1)} acknowledgeRemotionLicense />
              ) : <div style={{color: '#5b606c'}}>projeto vazio · as cenas aparecem aqui</div>}
              {dados && cursoresAtivos > 0 && <Selo player={player} total={durFrames} n={trabalhando.length + cursoresAtivos} />}
              {exp?.estado === 'trabalhando' && (
                <div className="exportando">
                  <b>Exportando <code>{R.projeto}.mp4</code></b>
                  <p>{R.formato.largura}×{R.formato.altura} · H.264 · {fps} fps · {dados?.tempo.duracao.toFixed(1)} s · feito só com código</p>
                  <div className="barra"><i style={{width: `${Math.round((exp.progresso || 0) * 100)}%`}} /></div>
                  <div className="rod"><span>{R.cenas.length} cenas · {proj.personagens.length} personagens · {efeitos.length} sons · 1 voz</span><span>{Math.round((exp.progresso || 0) * 100)}%</span></div>
                </div>
              )}
            </div>
          </div>
          <div className="baixo">
            <div className={temCena ? '' : 'desligado'}>
              <div className="tit">Camadas · cena {sel + 1} <span>{cena.texto ?? ''}</span></div>
              <Camada cor="#ff7eb6" nome="fundo"><select data-alvo="camada-fundo" value={cena.fundo} onChange={(e) => mudarCena(sel, {fundo: e.target.value as any})}><option value="claro">claro</option><option value="forte">forte (laranja)</option></select></Camada>
              <Camada cor="#ff6b6b" nome="personagem">
                <select data-alvo="camada-personagem" value={cena.personagem ?? ''} onChange={(e) => mudarCena(sel, {personagem: e.target.value || null})}><option value="">— nenhum —</option>{todosPers.map((n) => <option key={n}>{n}</option>)}</select>
              </Camada>
              <Camada cor="#ff6b6b" nome="personagem 2">
                <select data-alvo="camada-personagem2" value={cena.personagem2 ?? ''} onChange={(e) => mudarCena(sel, {personagem2: e.target.value || null})}><option value="">— nenhum —</option>{todosPers.map((n) => <option key={n}>{n}</option>)}</select>
              </Camada>
              <Camada cor="#f3c74d" nome="texto"><input data-alvo="camada-texto" value={cena.texto ?? ''} onChange={(e) => mudarCena(sel, {texto: e.target.value || null})} /></Camada>
              <Camada cor="#3fd0c9" nome="interface">
                <select data-alvo="camada-interface" value={cena.interface?.tipo ?? ''} onChange={(e) => mudarCena(sel, {interface: e.target.value ? (cena.interface?.tipo === e.target.value ? cena.interface : MODELO_INT[e.target.value]) : null})}>
                  {TIPOS_INT.map((t) => <option key={t} value={t}>{t || '— nenhuma —'}</option>)}
                </select>
              </Camada>
              <Camada cor="#3ddc84" nome="som"><span style={{fontWeight: 600}}>{efeitos.filter((e) => e.cena === sel).length} efeitos</span></Camada>
              <Camada cor="#8b8f9a" nome="fala"><input data-alvo="camada-fala" value={cena.fala} onChange={(e) => mudarCena(sel, {fala: e.target.value})} style={{fontWeight: 400, color: '#cfd3dc'}} /></Camada>
            </div>
            <div>
              <div className="tit">Registro dos agentes <span>{montando ? 'montando sobre a voz' : !alinhado ? 'esperando voz' : vozDesatualizada ? 'voz desatualizada' : 'revisão ok'}</span></div>
              <div className="reg">
                {agentes.registro.slice(-14).reverse().map((l: any, k: number) => (
                  <div key={'r' + k} className={Date.now() - l.t < 8000 ? 'novo' : ''}><b>{l.agente.split(':')[0].slice(0, 8)}</b><span>{l.msg}</span></div>
                ))}
                {efeitos.filter((e) => e.cena === sel).map((e, k) => (
                  <div key={'e' + k}><b>som-{String(k + 1).padStart(2, '0')}</b><span>{e.som} @ {e.t.toFixed(2)} s</span></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────── código ───────── */}
        <section className="col codigo" data-alvo="codigo">
          <div className="tit">{aba === 'cena' ? `cena_${String(sel + 1).padStart(2, '0')}.json` : 'Filme.tsx'} <span>{aba === 'cena' ? 'editável' : 'motor · só leitura'}</span></div>
          <div className="abas">
            <button className={aba === 'cena' ? 'sel' : ''} onClick={() => setAba('cena')}>cena.json</button>
            <button className={aba === 'filme' ? 'sel' : ''} onClick={() => setAba('filme')}>Filme.tsx</button>
          </div>
          {aba === 'cena' ? (temCena ? <EditorCena key={sel + ':' + ver} cena={cena} aoMudar={(c) => mudarCena(sel, () => c)} /> : <div style={{padding: 14, color: '#5b606c'}}>nenhuma cena ainda</div>) : <Codigo texto={fonte} />}
        </section>

        {/* ───────── direita ───────── */}
        <aside className="col">
          <div className="tit">Movimento <span>{MOVS.find(([m]) => m === (cena.ajuste?.movimento ?? 'quica'))?.[1]}</span></div>
          <div className={cena.personagem ? '' : 'desligado'}>
            <Curva mov={cena.ajuste?.movimento ?? 'quica'} />
            <div className="presets">
              {MOVS.map(([m, n]) => <button key={m} data-alvo={`mov-${m}`} className={(cena.ajuste?.movimento ?? 'quica') === m ? 'sel' : ''} onClick={() => mudarCena(sel, (c) => ({...c, ajuste: {...c.ajuste, movimento: m}}))}>{n}</button>)}
            </div>
            {([['x', 'Posição X', -400, 400, 'px', 0], ['y', 'Posição Y', -500, 500, 'px', 0], ['escala', 'Escala', 30, 170, '%', 100], ['rotacao', 'Rotação', -30, 30, '°', 0], ['opacidade', 'Opacidade', 0, 100, '%', 100]] as const).map(([k, n, mi, ma, u, pad]) => (
              <div className="slider" key={k}>
                <label>{n}</label>
                <input data-alvo={`slider-${k}`} type="range" min={mi} max={ma} value={(cena.ajuste as any)?.[k] ?? pad} onChange={(e) => mudarCena(sel, (c) => ({...c, ajuste: {...c.ajuste, [k]: +e.target.value}}))} onDoubleClick={() => mudarCena(sel, (c) => ({...c, ajuste: {...c.ajuste, [k]: pad}}))} />
                <span>{(cena.ajuste as any)?.[k] ?? pad}{u}</span>
              </div>
            ))}
          </div>
          <div className="tit" style={{marginTop: 18}}>Cores do projeto</div>
          <div className="cores">
            {Object.entries<string>(R.cores ?? {}).map(([k, v]) => (
              <label key={k} data-alvo={`cor-${k}`} className="cor" style={{background: v}} title={`${k}: ${v}`}>
                <input type="color" value={v} onChange={(e) => mudarRoteiro((r) => { r.cores = {...(r.cores ?? {}), [k]: e.target.value}; return r; })} />
              </label>
            ))}
          </div>
          <div className="cores-leg">destaque {R.cores?.destaque ?? 'do template'} · tinta {R.cores?.tinta ?? 'do template'}</div>
          <div className="tit" style={{marginTop: 18}}>Agentes <span>{trabalhando.length + cursoresAtivos} trabalhando</span></div>
          <Agentes ag={agentes.agentes} vozOk={!vozDesatualizada} cursores={cursores} />
        </aside>
      </main>

      {/* ───────── linha do tempo ───────── */}
      <LinhaDoTempo ativos={trabalhando.length + cursoresAtivos} vozSo={temVoz ? proj.tempo.duracao : undefined} player={player} dados={dados} fps={fps} sel={sel} setSel={setSel} irPara={irPara} efeitos={efeitos} ondas={temVoz || alinhado ? proj.ondas : []} ver={ver} tocar={tocar} novaCena={() => { novaCena(); setSel(R.cenas.length); }} />

      {modal?.tipo === 'personagem' && <NovoPersonagem fechar={() => setModal(null)} criar={(n, d) => { gerarPersonagem(n, d); setModal(null); }} estilo={R.estilo_personagem} />}
      {toast && <div className="toast">{toast}</div>}
      {passivo && !SO_VER && <div className="fundo-modal"><div className="modal"><h3>Esta aba está só assistindo</h3><p style={{color: '#8b8f9a'}}>O estúdio foi aberto em outra aba mais nova, e só ela edita e salva. Feche esta ou recarregue para ela virar a principal.</p><div className="acoes"><button className="btn roxo" onClick={() => location.reload()}>Recarregar esta aba</button></div></div></div>}
      <Cursores cursores={cursores} />
    </div>
  );
};

/* ─────────────────────────── peças ─────────────────────────── */

const Menu: React.FC<{nome: string; itens: any[]}> = ({nome, itens}) => {
  const [aberto, setAberto] = useState(false);
  useEffect(() => { if (!aberto) return; const f = () => setAberto(false); setTimeout(() => window.addEventListener('click', f, {once: true})); return () => window.removeEventListener('click', f); }, [aberto]);
  return (
    <div className={`menu ${aberto ? 'aberto' : ''}`}>
      <button onClick={() => setAberto(!aberto)}>{nome}</button>
      {aberto && <div className="lista">{itens.length ? itens.map(([t, fn, kbd, off], i) => <button key={i} disabled={off} onClick={() => { setAberto(false); fn(); }}>{t}{kbd && <kbd>{kbd}</kbd>}</button>) : <button disabled>nada aqui</button>}</div>}
    </div>
  );
};

const Camada: React.FC<{cor: string; nome: string; children: React.ReactNode}> = ({cor, nome, children}) => (
  <div className="camada"><i style={{background: cor}} /><label>{nome}</label><div>{children}</div></div>
);

const Onda: React.FC<{ondas: number[]; className?: string; cor: string}> = ({ondas, className, cor}) => {
  const pts = useMemo(() => {
    if (!ondas.length) return '';
    const n = ondas.length, passo = Math.max(1, Math.floor(n / 600));
    const top: string[] = [], bot: string[] = [];
    for (let i = 0; i < n; i += passo) { const v = Math.min(1, ondas[i] * 1.6); top.push(`${(i / n) * 1000},${50 - v * 48}`); bot.unshift(`${(i / n) * 1000},${50 + v * 48}`); }
    return [...top, ...bot].join(' ');
  }, [ondas]);
  return <svg className={className} viewBox="0 0 1000 100" preserveAspectRatio="none">{pts ? <polygon points={pts} fill={cor} opacity={0.85} /> : <line x1="0" y1="50" x2="1000" y2="50" stroke="#2e323c" strokeWidth="2" strokeDasharray="8 8" />}</svg>;
};

const useQuadro = (player: React.RefObject<PlayerRef>) => {
  const [f, setF] = useState(0);
  const [tocando, setTocando] = useState(false);
  useEffect(() => {
    let p: PlayerRef | null = null, t: any, des: any;
    const ligar = () => {
      p = player.current;
      if (!p) { t = setTimeout(ligar, 200); return; }
      const fu = (e: any) => setF(e.detail.frame);
      const pl = () => setTocando(true), pa = () => setTocando(false);
      p.addEventListener('frameupdate', fu); p.addEventListener('seeked', fu); p.addEventListener('play', pl); p.addEventListener('pause', pa);
      des = () => { p?.removeEventListener('frameupdate', fu); p?.removeEventListener('seeked', fu); p?.removeEventListener('play', pl); p?.removeEventListener('pause', pa); };
    };
    ligar();
    return () => { clearTimeout(t); des?.(); };
  }, [player, player.current]);
  return {f, tocando};
};

const Relogio: React.FC<{player: React.RefObject<PlayerRef>; fps: number; prefixo: string}> = ({player, fps, prefixo}) => {
  const {f} = useQuadro(player);
  return <span>{prefixo}<b>{tc(f / fps, fps)}</b></span>;
};

const EditorCena: React.FC<{cena: Cena; aoMudar: (c: Cena) => void}> = ({cena, aoMudar}) => {
  const [txt, setTxt] = useState(() => JSON.stringify(cena, null, 2));
  const [erro, setErro] = useState('');
  const foco = useRef(false);
  useEffect(() => { if (!foco.current) setTxt(JSON.stringify(cena, null, 2)); }, [cena]);
  const nums = useMemo(() => txt.split('\n').map((_, i) => i + 1).join('\n'), [txt]);
  const numRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="editor">
        <div className="nums" ref={numRef}>{nums}</div>
        <textarea className={erro ? 'erro' : ''} spellCheck={false} value={txt} onFocus={() => (foco.current = true)} onBlur={() => (foco.current = false)}
          onScroll={(e) => { if (numRef.current) numRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop; }}
          onChange={(e) => { setTxt(e.target.value); try { const c = JSON.parse(e.target.value); setErro(''); aoMudar(c); } catch (er: any) { setErro(er.message); } }} />
      </div>
      <div className={`status-cod ${erro ? 'erro' : ''}`}>{erro ? `✕ ${erro}` : '✓ válido · muda o palco na hora'}</div>
    </>
  );
};

const Codigo: React.FC<{texto: string}> = ({texto}) => {
  const nums = useMemo(() => texto.split('\n').map((_, i) => i + 1).join('\n'), [texto]);
  const numRef = useRef<HTMLDivElement>(null);
  return (
    <div className="editor">
      <div className="nums" ref={numRef}>{nums}</div>
      <textarea readOnly spellCheck={false} value={texto} onScroll={(e) => { if (numRef.current) numRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop; }} />
    </div>
  );
};

const Curva: React.FC<{mov: string}> = ({mov}) => {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    let v = 0;
    if (mov === 'quica') v = 1 - Math.exp(-6 * t) * Math.cos(14 * t);
    else if (mov === 'pop') v = 1 - Math.exp(-9 * t) * Math.cos(8 * t);
    else if (mov === 'balanca') v = 1 - Math.exp(-3 * t) * Math.cos(10 * t) * 0.9;
    else if (mov === 'desliza') v = 1 - Math.pow(1 - t, 3);
    else v = t;
    pts.push(`${10 + t * 260},${95 - v * 70}`);
  }
  return (
    <svg className="curva" viewBox="0 0 280 110">
      <line x1="10" y1="25" x2="270" y2="25" stroke="#23262e" strokeDasharray="3 4" />
      <line x1="10" y1="95" x2="270" y2="95" stroke="#23262e" />
      <polyline points={pts.join(' ')} fill="none" stroke="#e8e8ec" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10" cy="95" r="5" fill="#8f7cf7" />
    </svg>
  );
};

const Agentes: React.FC<{ag: any; vozOk: boolean; cursores: Record<string, CursorEstado>}> = ({ag, vozOk, cursores}) => {
  const pers = Object.entries<any>(ag).filter(([n]) => n.startsWith('personagem:'));
  const persTrab = pers.filter(([, a]) => a.estado === 'trabalhando');
  const mao = (n: string) => cursores[n]?.visivel && Date.now() - (cursores[n]?.ultimo ?? 0) < 4000;
  const linhas: [string, string, string][] = [
    ['roteiro', mao('roteiro') ? 'trab' : 'pronto', mao('roteiro') ? 'escrevendo…' : 'ok'],
    ['texto', mao('texto') ? 'trab' : 'pronto', mao('texto') ? 'digitando…' : 'ok'],
    ['personagem', persTrab.length || mao('personagem') ? 'trab' : pers.some(([, a]) => a.estado === 'erro') ? 'erro' : 'pronto', persTrab.length ? `desenhando ${persTrab.length}: ${persTrab.map(([n]) => n.split(':')[1]).join(', ')}` : mao('personagem') ? 'escolhendo…' : 'ok'],
    ['interface', mao('interface') ? 'trab' : 'pronto', mao('interface') ? 'montando…' : 'ok'],
    ['movimento', mao('movimento') ? 'trab' : 'pronto', mao('movimento') ? 'ajustando…' : 'ok'],
    ['voz', ag.voz?.estado === 'trabalhando' || mao('voz') ? 'trab' : ag.voz?.estado === 'erro' ? 'erro' : 'pronto', ag.voz?.estado === 'trabalhando' ? 'prendendo cenas…' : 'ok'],
    ['revisão', vozOk ? 'pronto' : 'erro', vozOk ? 'ok' : 'esperando voz'],
    ['render', ag.exportar?.estado === 'trabalhando' ? 'trab' : ag.exportar?.estado === 'erro' ? 'erro' : ag.exportar ? 'pronto' : '', ''],
  ];
  return (
    <div>
      {linhas.map(([n, e, txt]) => (
        <div key={n} className={`agente ${e}`}>
          <span>{n}</span><i />
          {n === 'render' && e === 'trab' ? <div className="barra"><i style={{width: `${Math.round((ag.exportar?.progresso ?? 0) * 100)}%`}} /></div>
            : <span style={{color: e === 'erro' ? '#ff6b6b' : e === 'trab' ? '#b3a6ff' : '#5b606c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{n === 'render' ? (e === 'pronto' ? 'ok' : e === 'erro' ? 'falhou' : 'parado') : txt}</span>}
        </div>
      ))}
    </div>
  );
};

// selo do palco durante a montagem, como na referência: "• 12 agentes · 966/2338 quadros"
const Selo: React.FC<{player: React.RefObject<PlayerRef>; total: number; n: number}> = ({player, total, n}) => {
  const {f} = useQuadro(player);
  return <div style={{position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'rgba(11,12,15,.82)', color: '#e8e8ec', font: '600 11px "JetBrains Mono", monospace', padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', zIndex: 5, pointerEvents: 'none'}}><span style={{color: '#3ddc84'}}>•</span> {n} agente{n === 1 ? '' : 's'} · {f}/{total} quadros</div>;
};

const LinhaDoTempo: React.FC<{ativos?: number; vozSo?: number; player: React.RefObject<PlayerRef>; dados: any; fps: number; sel: number; setSel: (i: number) => void; irPara: (i: number) => void; efeitos: any[]; ondas: number[]; ver: number; tocar: () => void; novaCena: () => void}> = ({ativos = 0, vozSo, player, dados, fps, sel, setSel, irPara, efeitos, ondas, ver, tocar, novaCena}) => {
  const {f, tocando} = useQuadro(player);
  const area = useRef<HTMLDivElement>(null);
  const dur = (dados?.tempo.duracao ?? vozSo ?? 10) * 1.06;
  const seg = f / fps;
  useEffect(() => {
    if (!dados || !tocando) return;
    const i = dados.tempo.cenas.findIndex((c: any) => seg >= c.ini && seg < c.fim);
    if (i >= 0 && i !== sel) setSel(i);
  }, [seg, tocando]);
  const pc = (t: number) => `${(t / dur) * 100}%`;
  const larg = (a: number, b: number) => `calc(${((b - a) / dur) * 100}% - 3px)`;
  const clicar = (e: React.MouseEvent) => {
    if (!dados) return;
    const r = area.current!.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * dur;
    player.current?.seekTo(Math.max(0, Math.min(Math.round(t * fps), Math.ceil(dados.tempo.duracao * fps) - 1)));
    const i = dados.tempo.cenas.findIndex((c: any) => t >= c.ini && t < c.fim);
    if (i >= 0) setSel(i);
  };
  const C = dados?.roteiro.cenas ?? [], T = dados?.tempo.cenas ?? [];
  const fim = T.length ? T[T.length - 1].fim : 0;
  const marcas = [];
  for (let s = 0; s <= dur; s += 5) marcas.push(s);
  return (
    <section className="tempo">
      <div className="tcab">
        <button data-alvo="play" className="play" onClick={tocar} title="espaço">{tocando ? '❚❚' : '▶'}</button>
        <div className="tc">{tc(seg, fps)} <span>/ {tc(dados?.tempo.duracao ?? 0, fps)}</span></div>
        <div className={`estado ${tocando || ativos ? '' : 'pausa'}`}>• {ativos ? `${ativos} AGENTE${ativos === 1 ? '' : 'S'} · ANIMANDO` : tocando ? 'TOCANDO · 1X' : 'PAUSADO'}</div>
        <div className="tinfo">{dados?.semVoz || (!dados && !vozSo) ? 'tempo estimado · esperando voz' : 'cenas presas à voz'} · {dados?.roteiro.formato.largura ?? 1080}×{dados?.roteiro.formato.altura ?? 1920} · {fps} fps</div>
      </div>
      <div className="pistas">
        <div className="rotulos">
          <div className="regua" />
          {[['CENAS', '#ff7eb6'], ['PERSONAGENS', '#ff6b6b'], ['TEXTO', '#f3c74d'], ['INTERFACE', '#3fd0c9'], ['EFEITOS', '#ffa94d'], ['VOZ', '#3ddc84']].map(([n, c]) => <div key={n}><i style={{background: c}} />{n}</div>)}
        </div>
        <div className="area" ref={area} onMouseDown={clicar}>
          <div className="regua">{marcas.map((s) => <span key={s} style={{left: pc(s)}}>{s}s</span>)}</div>
          <div className="pista">
            {C.map((c: Cena, i: number) => (
              <div key={i} data-alvo={`cena-${i}`} className={`bloco b-cena ${i === sel ? 'sel' : ''}`} style={{left: pc(T[i].ini), width: larg(T[i].ini, T[i].fim)}} onMouseDown={(e) => { e.stopPropagation(); irPara(i); }}>
                {c.personagem && dados.personagens.includes(c.personagem) && <img src={`/${dados.projeto}/personagens/${c.personagem}.png?v=${ver}`} />}
                {String(i + 1).padStart(2, '0')} · {rotuloCena(c)}
              </div>
            ))}
            <div data-alvo="cena-nova" className="bloco b-cena" style={{left: pc(fim), width: 34, justifyContent: 'center', borderStyle: 'dashed', opacity: 0.7}} onMouseDown={(e) => { e.stopPropagation(); novaCena(); }} title="nova cena">+</div>
          </div>
          <div className="pista">{C.map((c: Cena, i: number) => c.personagem && (
            <div key={i} className={`bloco b-pers ${i === sel ? 'sel' : ''}`} style={{left: pc(T[i].ini), width: larg(T[i].ini, T[i].fim)}} onMouseDown={(e) => { e.stopPropagation(); irPara(i); }}>{c.personagem}{c.personagem2 ? ` + ${c.personagem2}` : ''}</div>
          ))}</div>
          <div className="pista">{C.map((c: Cena, i: number) => c.fala && (
            <div key={i} className={`bloco b-texto ${i === sel ? 'sel' : ''}`} title={c.fala} style={{left: pc(T[i].ini), width: larg(T[i].ini, T[i].fim)}} onMouseDown={(e) => { e.stopPropagation(); irPara(i); }}>{rotuloFala(c)}</div>
          ))}</div>
          <div className="pista">{C.map((c: Cena, i: number) => (c.interface || c.tela) && (
            <div key={i} className={`bloco b-int ${i === sel ? 'sel' : ''}`} title={rotuloInterface(c)} style={{left: pc(T[i].ini), width: larg(T[i].ini, T[i].fim)}} onMouseDown={(e) => { e.stopPropagation(); irPara(i); }}>{rotuloInterface(c)}</div>
          ))}</div>
          <div className="pista">{efeitos.map((e, k) => <i key={k} className="efeito" title={`${e.som} @ ${e.t.toFixed(2)} s`} style={{left: pc(e.t), background: COR_SOM[e.som] ?? '#8b8f9a', top: `${30 + (k % 3) * 20}%`}} />)}</div>
          <div className="pista" data-alvo="pista-voz"><div style={{position: 'absolute', inset: 0, width: pc(dados?.tempo.duracao ?? vozSo ?? 0)}}><Onda ondas={ondas} cor="#3ddc84" /></div></div>
          {dados && <div className="cabeca" style={{left: pc(seg)}} />}
        </div>
      </div>
    </section>
  );
};

const NovoPersonagem: React.FC<{fechar: () => void; criar: (n: string, d: string) => void; estilo: string}> = ({fechar, criar, estilo}) => {
  const [n, setN] = useState('');
  const [d, setD] = useState('');
  return (
    <div className="fundo-modal" onMouseDown={fechar}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Novo personagem</h3>
        <label>Nome (uma palavra)</label>
        <input autoFocus value={n} onChange={(e) => setN(e.target.value)} placeholder="ex.: pipoca" />
        <label>Como ele é e o que está fazendo</label>
        <textarea rows={4} value={d} onChange={(e) => setD(e.target.value)} placeholder="ex.: um balde de pipoca sorridente segurando um ingresso" />
        <label style={{fontSize: 11}}>Estilo do projeto (vai junto): {(estilo || '').slice(0, 120)}…</label>
        <div className="acoes"><button className="btn" onClick={fechar}>Cancelar</button><button className="btn roxo" disabled={!n || !d} onClick={() => criar(n, d)}>Desenhar com o Codex</button></div>
      </div>
    </div>
  );
};
