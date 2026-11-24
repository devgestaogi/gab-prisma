// Estúdio do GAB Prisma: o editor (igual ao "Prisma Studio" do reel) + a API que mexe no motor.
// Sobe com ./estudio.sh (porta 4460).
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {spawn, execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, copyFileSync, unlinkSync, statSync} from 'node:fs';
import {join, resolve, dirname, extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// pasta para onde o Exportar copia o vídeo (opcional): variável PRISMA_COPIA, definida em ~/.gab-prisma.env (fora do repositório)
const DRIVE = process.env.PRISMA_COPIA || '';
const roteiroArq = (n) => join(RAIZ, 'roteiros', `${n.replace(/[^a-z0-9-]/gi, '')}.json`);
const lerJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

// Templates de edição (seletor da página "Novo vídeo"): uma pasta por template com template.json e capa-1..4.jpg.
// Padrão: ../templates (o estúdio de vídeo do GI guarda o gab-prisma dentro de DESIGN VIDEOS IA, ao lado de templates/);
// a variável PRISMA_TEMPLATES (~/.gab-prisma.env) aponta outra pasta. Sem a pasta, o seletor só mostra "o Claude escolhe".
const TEMPLATES = resolve(process.env.PRISMA_TEMPLATES || join(RAIZ, '..', 'templates'));
const NOME_TEMPLATE = /^[a-z0-9-]{1,60}$/;
const txt = (v, max = 400) => (typeof v === 'string' ? v.slice(0, max) : '');
// Lido do disco a cada chamada de propósito: são poucos arquivos, o servidor é local, e template novo ou editado
// aparece sem reiniciar o estúdio.
function lerTemplate(n) {
  if (!NOME_TEMPLATE.test(n) || !existsSync(join(TEMPLATES, n, 'template.json'))) return null;
  try {
    const t = lerJSON(join(TEMPLATES, n, 'template.json'));
    const capas = [1, 2, 3, 4].filter((i) => existsSync(join(TEMPLATES, n, `capa-${i}.jpg`))).map((i) => `/api/template-capa/${n}?i=${i}`);
    // status: pronto (vídeos aprovados), prototipo (o motor já faz, em teste), receita (só descrito)
    return {nome: n, titulo: txt(t.titulo, 80) || n, status: ['pronto', 'prototipo'].includes(t.status) ? t.status : 'receita',
      resumo: txt(t.resumo), quando_usar: txt(t.quando_usar), duracao: txt(t.duracao, 40),
      ordem: Number.isFinite(Number(t.ordem)) ? Number(t.ordem) : 99, capas};
  } catch { return null; } // template.json quebrado não derruba a lista
}
function listarTemplates() {
  if (!existsSync(TEMPLATES)) return [];
  return readdirSync(TEMPLATES).map(lerTemplate).filter(Boolean)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}

// Agentes = trabalhos em segundo plano (Codex, whisper, render). O painel AGENTES lê daqui.
const agentes = {};
let seq = 0;
const registro = [];
// manifesto das imagens de plano que existem em public/<projeto>/planos (igual ao de ferramentas/render.mjs)
const listarPlanos = (dir, pre = '') => (existsSync(dir) ? readdirSync(dir).sort().flatMap((f) => (statSync(join(dir, f)).isDirectory() ? listarPlanos(join(dir, f), `${pre}${f}/`) : /\.(png|jpe?g|webp)$/i.test(f) ? [`${pre}${f}`] : [])) : []);
const filas = {}; // ações do modo ao vivo, por projeto
const donos = {};
const janela = {url: '', seq: 0, visto: 0}; // só a última aba aberta do estúdio executa as ações
const log = (agente, msg) => { registro.push({t: Date.now(), agente, msg}); if (registro.length > 200) registro.shift(); };
function rodar(agente, cmd, args, {aoFim, progresso} = {}) {
  if (agentes[agente]?.estado === 'trabalhando') return false;
  const a = (agentes[agente] = {estado: 'trabalhando', inicio: Date.now(), progresso: 0, ultima: '', id: ++seq});
  log(agente, `começou: ${args.slice(-2).join(' ')}`);
  const p = spawn(cmd, args, {cwd: RAIZ});
  const ler = (b) => {
    for (const l of b.toString().split(/[\r\n]+/)) {
      if (!l.trim()) continue;
      a.ultima = l.slice(0, 160);
      const pr = progresso?.(l);
      if (pr != null) a.progresso = pr;
      else if (!/^Rendered|^Encoded|^Bundl/.test(l)) log(agente, l.slice(0, 160));
    }
  };
  p.stdout.on('data', ler);
  p.stderr.on('data', ler);
  p.on('close', (code) => {
    a.estado = code === 0 ? 'pronto' : 'erro';
    a.fim = Date.now();
    log(agente, code === 0 ? 'terminou' : `falhou (código ${code})`);
    if (code === 0) aoFim?.();
  });
  return true;
}

const corpo = (req) => new Promise((ok) => { const b = []; req.on('data', (c) => b.push(c)); req.on('end', () => ok(Buffer.concat(b))); });
const json = (res, obj, st = 200) => { res.statusCode = st; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };

function ondas(proj) {
  const wav = join(RAIZ, 'public', proj, 'narracao.wav');
  if (!existsSync(wav)) return [];
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', wav, '-ac', '1', '-ar', '2000', '-f', 's16le', '-'], {maxBuffer: 1 << 28});
  const n = raw.length / 2, passo = 20, out = []; // 100 picos por segundo
  for (let i = 0; i < n; i += passo) { let m = 0; for (let k = i; k < Math.min(n, i + passo); k++) m = Math.max(m, Math.abs(raw.readInt16LE(k * 2))); out.push(+(m / 32768).toFixed(3)); }
  return out;
}

function api() {
  return {
    name: 'prisma-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const u = new URL(req.url, 'http://x');
        if (!u.pathname.startsWith('/api/')) return next();
        const [, , rota, nome] = u.pathname.split('/');
        try {
          if (rota === 'projetos') return json(res, readdirSync(join(RAIZ, 'roteiros')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
          if (rota === 'projeto' && req.method === 'GET') {
            const r = lerJSON(roteiroArq(nome));
            const pub = join(RAIZ, 'public', r.projeto);
            const tempo = existsSync(join(pub, 'tempo.json')) ? lerJSON(join(pub, 'tempo.json')) : null;
            const personagens = existsSync(join(pub, 'personagens')) ? readdirSync(join(pub, 'personagens')).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)) : [];
            const sons = readdirSync(join(RAIZ, 'public/sons')).filter((f) => f.endsWith('.wav')).map((f) => f.slice(0, -4));
            return json(res, {roteiro: r, tempo, personagens, planos: listarPlanos(join(pub, 'planos')), sons, ondas: ondas(r.projeto)});
          }
          if (rota === 'projeto' && req.method === 'PUT') {
            const r = JSON.parse((await corpo(req)).toString());
            // o servidor também escreve no roteiro (voz, personagem novo): não perder isso
            const velho = existsSync(roteiroArq(nome)) ? lerJSON(roteiroArq(nome)) : {};
            if (!r.narracao && velho.narracao) r.narracao = velho.narracao;
            r.personagens = {...(velho.personagens || {}), ...(r.personagens || {})};
            writeFileSync(roteiroArq(nome), JSON.stringify(r, null, 2));
            return json(res, {ok: true});
          }
          if (rota === 'voz' && req.method === 'POST') {
            // corpo = arquivo de áudio; vira a narração do projeto e realinha as cenas
            const r = lerJSON(roteiroArq(nome));
            const ext = (u.searchParams.get('ext') || 'mp3').replace(/[^a-z0-9]/g, '');
            const dir = join(RAIZ, 'trabalho', r.projeto); mkdirSync(dir, {recursive: true});
            const arq = join(dir, `narracao-${Date.now()}.${ext}`);
            writeFileSync(arq, await corpo(req));
            r.narracao = arq.slice(RAIZ.length + 1);
            writeFileSync(roteiroArq(nome), JSON.stringify(r, null, 2));
            rodar('voz', 'node', ['ferramentas/alinhar.mjs', roteiroArq(nome), arq]);
            return json(res, {ok: true});
          }
          if (rota === 'alinhar') {
            const r = lerJSON(roteiroArq(nome));
            const voz = join(RAIZ, r.narracao || `trabalho/${r.projeto}/narracao-provisoria.mp3`);
            return json(res, {ok: rodar('voz', 'node', ['ferramentas/alinhar.mjs', roteiroArq(nome), voz])});
          }
          if (rota === 'personagem' && req.method === 'POST') {
            const {nome: pn, descricao, refazer} = JSON.parse((await corpo(req)).toString());
            const chave = pn.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
            const r = lerJSON(roteiroArq(nome));
            if (descricao) r.personagens[chave] = descricao;
            writeFileSync(roteiroArq(nome), JSON.stringify(r, null, 2));
            const png = join(RAIZ, 'public', r.projeto, 'personagens', `${chave}.png`);
            if (refazer && existsSync(png)) {
              mkdirSync(join(RAIZ, 'trabalho', r.projeto, 'antigos'), {recursive: true});
              copyFileSync(png, join(RAIZ, 'trabalho', r.projeto, 'antigos', `${chave}-${Date.now()}.png`));
              unlinkSync(png);
              execFileSync('rm', ['-rf', join(RAIZ, 'trabalho', r.projeto, chave)]);
            }
            return json(res, {ok: rodar(`personagem:${chave}`, 'zsh', ['ferramentas/personagens.sh', roteiroArq(nome), chave]), chave});
          }
          if (rota === 'exportar') {
            // Gabriel, 23/11: "quando clicar no botão pra exportar eu decido aonde no meu PC eu quero exportar".
            // Abre a janela "Salvar como" do Mac; o vídeo vai só para onde ele escolher.
            if (agentes.exportar?.estado === 'trabalhando') return json(res, {ok: false, motivo: 'ocupado'});
            const r = lerJSON(roteiroArq(nome));
            const memo = join(RAIZ, 'trabalho', 'ultima-pasta-exportar.txt');
            const pastaIni = existsSync(memo) ? readFileSync(memo, 'utf8').trim() : (DRIVE && existsSync(DRIVE) ? DRIVE : join(process.env.HOME, 'Desktop'));
            const nomeIni = `reel-${r.projeto}-${new Date().toLocaleString('sv-SE').slice(0, 16).replace(' ', '-').replace(':', 'h')}.mp4`;
            const pelaJanela = u.searchParams.get('navegador') === '1'; // o próprio estúdio pergunta onde salvar
            const destino = pelaJanela ? join(RAIZ, 'saida', `${r.projeto}.mp4`) : await new Promise((ok) => {
              const p = spawn('osascript', ['-e', `tell application "System Events" to activate`, '-e',
                `tell application "System Events" to return POSIX path of (choose file name with prompt "Onde salvar o vídeo exportado?" default name "${nomeIni}" default location (POSIX file "${pastaIni.replace(/"/g, '\\"')}"))`]);
              let out = '', err = ''; p.stdout.on('data', (b) => (out += b)); p.stderr.on('data', (b) => (err += b)); p.on('close', (c) => { if (c !== 0) log('exportar', 'janela de salvar: ' + err.trim().slice(0, 200)); ok(c === 0 ? out.trim() : ''); });
            });
            if (!destino) return json(res, {ok: false, motivo: 'cancelado'});
            const final = destino.toLowerCase().endsWith('.mp4') ? destino : destino + '.mp4';
            try { mkdirSync(join(RAIZ, 'trabalho'), {recursive: true}); writeFileSync(memo, dirname(final)); } catch {}
            const saida = join(RAIZ, 'saida', `${r.projeto}.mp4`);
            log('exportar', `vai salvar em: ${final}`);
            const ok = rodar('exportar', 'node', ['ferramentas/render.mjs', roteiroArq(nome), saida], {
              progresso: (l) => { const m = l.match(/Rendered (\d+)\/(\d+)/); return m ? +m[1] / +m[2] : null; },
              aoFim: () => {
                if (pelaJanela) { agentes.exportar.destino = ''; log('exportar', 'render pronto: o estúdio grava onde foi escolhido'); return; }
                try { copyFileSync(saida, final); agentes.exportar.destino = final; log('exportar', `salvo em: ${final}`); spawn('open', ['-R', final]); }
                catch (e) { log('exportar', 'não consegui salvar em ' + final + ': ' + e.message); }
              },
            });
            return json(res, {ok, destino: final});
          }
          if (rota === 'acoes' && req.method === 'POST') {
            const lista = JSON.parse((await corpo(req)).toString());
            const f = (filas[nome] ??= []);
            for (const a of [].concat(lista)) f.push({...a, n: f.length + 1});
            return json(res, {ok: true, ultimo: f.length});
          }
          if (rota === 'acoes') {
            const f = filas[nome] ?? [];
            const desde = +u.searchParams.get('desde');
            const tab = u.searchParams.get('tab');
            if (u.searchParams.get('registrar')) donos[nome] = tab;
            if (donos[nome] && tab !== donos[nome]) return json(res, {ultimo: f.length, acoes: [], dono: false});
            return json(res, desde < 0 ? {ultimo: f.length, acoes: []} : {ultimo: f.length, acoes: f.slice(desde)});
          }
          if (rota === 'log') { const {agente, msg} = JSON.parse((await corpo(req)).toString()); log(agente, msg); return json(res, {ok: true}); }
          if (rota === 'voz-local') {
            // plano = roteiro com todas as falas; a voz entra antes das cenas e cada cena nasce no seu tempo
            const {arquivo, plano} = JSON.parse((await corpo(req)).toString());
            const r = lerJSON(roteiroArq(nome));
            const abs = resolve(RAIZ, arquivo);
            const absPlano = plano ? resolve(RAIZ, plano) : roteiroArq(nome);
            if (!abs.startsWith(RAIZ) || !existsSync(abs) || !absPlano.startsWith(RAIZ) || !existsSync(absPlano)) return json(res, {erro: 'arquivo não existe'}, 400);
            r.narracao = abs.slice(RAIZ.length + 1);
            writeFileSync(roteiroArq(nome), JSON.stringify(r, null, 2));
            return json(res, {ok: rodar('voz', 'node', ['ferramentas/alinhar.mjs', absPlano, abs])});
          }
          if (rota === 'agentes') return json(res, {agentes, registro: registro.slice(-60)});
          if (rota === 'fonte') return json(res, {texto: readFileSync(join(RAIZ, 'src', 'Filme.tsx'), 'utf8')});
          if (rota === 'video') {
            const r = lerJSON(roteiroArq(nome));
            const f = join(RAIZ, 'saida', `${r.projeto}.mp4`);
            if (!existsSync(f)) return json(res, {erro: 'vídeo não existe'}, 404);
            res.setHeader('content-type', 'video/mp4');
            return res.end(readFileSync(f));
          }
          if (rota === 'abrir') { spawn('open', ['-R', join(RAIZ, 'saida')]); return json(res, {ok: true}); }
          // A janela do estúdio (Chrome próprio) obedece aqui: o Claude troca o endereço dela sem abrir outra
          if (rota === 'janela') {
            if (req.method === 'POST') { const {url} = JSON.parse((await corpo(req)).toString()); janela.url = url; janela.seq++; return json(res, janela); }
            if (u.searchParams.get('eu')) janela.visto = Date.now(); // a janela do estúdio está viva
            return json(res, janela);
          }
          // Pedido de vídeo (página /pedido.html): o Gabriel escreve o prompt do roteiro; o Claude recebe
          // (ferramentas/esperar-pedido.mjs), escreve o roteiro, gera a voz e edita ao vivo. Nada avança sem o prompt.
          if (rota === 'templates') return json(res, listarTemplates());
          if (rota === 'template-capa') {
            const i = u.searchParams.get('i') || '';
            if (!NOME_TEMPLATE.test(nome || '') || !/^[1-4]$/.test(i)) return json(res, {erro: 'capa inválida'}, 400);
            const arq = join(TEMPLATES, nome, `capa-${i}.jpg`);
            if (!existsSync(arq)) return json(res, {erro: 'capa não existe'}, 404);
            res.setHeader('content-type', 'image/jpeg');
            res.setHeader('cache-control', 'no-cache');
            return res.end(readFileSync(arq));
          }
          if (rota === 'pedido') {
            const dir = join(RAIZ, 'trabalho', 'pedidos'); mkdirSync(dir, {recursive: true});
            if (req.method === 'POST' && !nome) {
              const {texto, template, marca} = JSON.parse((await corpo(req)).toString());
              if (typeof texto !== 'string' || !texto.trim()) return json(res, {erro: 'prompt vazio'}, 400);
              // template escolhido na página: ausente, null ou "" = o Claude escolhe; senão, nome que exista na pasta
              let tpl = null;
              if (template !== undefined && template !== null && template !== '') {
                const t = typeof template === 'string' ? lerTemplate(template) : null;
                if (!t) return json(res, {erro: 'template não existe'}, 400);
                tpl = {nome: t.nome, titulo: t.titulo, status: t.status};
              }
              // marca: "gi" = vídeo da Gestão de Impacto (logo, laranja, regras da casa); "livre" = conteúdo próprio
              if (marca !== undefined && marca !== null && marca !== 'gi' && marca !== 'livre') return json(res, {erro: 'marca inválida'}, 400);
              const mk = marca === 'gi' ? 'gi' : 'livre';
              const id = new Date().toLocaleString('sv-SE').replace(/[^0-9]/g, '').slice(0, 14);
              const p = {id, texto: texto.trim(), template: tpl, marca: mk, estado: 'novo', passos: [{t: Date.now(), msg: 'prompt recebido' + (tpl ? ` · template ${tpl.titulo}` : '') + (mk === 'gi' ? ' · Gestão de Impacto' : ' · conteúdo próprio')}], projeto: null};
              writeFileSync(join(dir, `${id}.json`), JSON.stringify(p, null, 2));
              log('roteiro', 'novo pedido de vídeo' + (tpl ? ` [${tpl.nome}]` : '') + (mk === 'gi' ? ' [GI]' : '') + ': ' + texto.trim().slice(0, 80));
              return json(res, p);
            }
            if (req.method === 'POST' && nome) {
              // atualização de estado (Claude): {estado, msg, projeto}
              const arq = join(dir, `${nome.replace(/[^0-9]/g, '')}.json`);
              const p = lerJSON(arq);
              const {estado, msg, projeto} = JSON.parse((await corpo(req)).toString());
              if (estado) p.estado = estado;
              if (projeto) p.projeto = projeto;
              if (msg) { p.passos.push({t: Date.now(), msg}); log('roteiro', msg); }
              writeFileSync(arq, JSON.stringify(p, null, 2));
              return json(res, p);
            }
            const ids = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
            if (nome === 'ultimo') return json(res, ids.length ? lerJSON(join(dir, ids[ids.length - 1])) : null);
            if (nome) return json(res, lerJSON(join(dir, `${nome.replace(/[^0-9]/g, '')}.json`)));
            return json(res, ids.slice(-20).map((f) => lerJSON(join(dir, f))));
          }
          json(res, {erro: 'rota não existe'}, 404);
        } catch (e) {
          json(res, {erro: String(e.message || e)}, 500);
        }
      });
    },
  };
}

export default defineConfig({
  root: join(RAIZ, 'estudio'),
  publicDir: join(RAIZ, 'public'),
  plugins: [react(), api()],
  server: {port: 4460, strictPort: true, fs: {allow: [RAIZ]}, watch: {ignored: ['**/saida/**', '**/trabalho/**', '**/roteiros/**']}},
});
