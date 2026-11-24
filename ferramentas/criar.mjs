// criar.mjs <projeto> [--sem-revisao] [--tocar]
// Comando único do GAB Prisma (fluxo fixo do Gabriel, 23/11/2026):
//   plano (roteiro final) + voz  →  montagem AO VIVO no estúdio, na aba dele  →  conferência com o plano
//   →  revisão pela linha do tempo (olhar.mjs).  NÃO renderiza nem exporta: Exportar é só o Gabriel.
// Entrada: trabalho/<projeto>/plano-final.json = roteiro completo (cenas com fala, personagem, personagem2,
// texto, interface, fundo, ajuste, marcas, tela) com "narracao" apontando para o áudio já gerado.
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {estudioNaFrente} from './estudio-frente.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const proj = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--pedido');
const semRevisao = args.includes('--sem-revisao');
const tocar = args.includes('--tocar');
const pedido = args.includes('--pedido') ? args[args.indexOf('--pedido') + 1] : null; // id do pedido da página /pedido.html
const avisarPedido = (estado, msg) => pedido && fetch(`http://localhost:4460/api/pedido/${pedido}`, {method: 'POST', body: JSON.stringify({estado, msg, projeto: proj})}).catch(() => {});
if (!proj) { console.error('uso: node ferramentas/criar.mjs <projeto> [--sem-revisao] [--tocar]'); process.exit(1); }

const API = 'http://localhost:4460/api';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const ler = (p) => JSON.parse(readFileSync(p, 'utf8'));
const roteiroArq = join(RAIZ, 'roteiros', `${proj}.json`);
const trab = join(RAIZ, 'trabalho', proj); mkdirSync(trab, {recursive: true});
const planoArq = join(trab, 'plano-final.json');
const carimbo = () => { const d = new Date().toLocaleString('sv-SE'); return d.slice(0, 10).replace(/-/g, '') + '-' + d.slice(11, 16).replace(':', ''); };
const mandar = (a) => fetch(`${API}/acoes/${proj}`, {method: 'POST', body: JSON.stringify(a)}).then((r) => r.json());

// 1) plano
if (!existsSync(planoArq)) {
  if (existsSync(roteiroArq) && ler(roteiroArq).cenas?.length) { copyFileSync(roteiroArq, planoArq); console.log('plano-final.json criado a partir do roteiro atual'); }
  else { console.error(`falta o plano: ${planoArq}`); process.exit(1); }
}
const plano = ler(planoArq);
if (!plano.cenas?.length) { console.error('o plano não tem cenas'); process.exit(1); }

// 2) a voz vem antes de tudo
if (!plano.narracao || !existsSync(join(RAIZ, plano.narracao))) { console.error('falta a voz: gere a narração e ponha o caminho (relativo ao gab-prisma) em "narracao" no plano'); process.exit(1); }

// 3) estúdio no ar
const noAr = () => fetch(`${API}/projetos`).then((r) => r.ok).catch(() => false);
if (!(await noAr())) {
  execFileSync('zsh', ['estudio.sh', '--sem-abrir'], {cwd: RAIZ, stdio: 'inherit'});
  for (let i = 0; i < 40 && !(await noAr()); i++) await esperar(500);
}

// 4) projeto começa vazio (palco vazio, como na referência); guarda o que havia
if (existsSync(roteiroArq)) {
  const velho = ler(roteiroArq);
  if (velho.cenas?.length) writeFileSync(join(trab, `roteiro-antes-${carimbo()}.json`), JSON.stringify(velho, null, 2));
}
const vazio = {...plano, cenas: []};
delete vazio.narracao;
writeFileSync(roteiroArq, JSON.stringify(vazio, null, 2));

// 5) aba nova NA FRENTE: aba atrás de outra janela tem os timers estrangulados e trava a montagem
// (23/11: o `open` não criou aba — havia mais de um Chrome aberto; por isso janela nova pelo AppleScript, com `open` de reserva)
const url = `http://localhost:4460/?p=${proj}`;
await avisarPedido('editando', 'voz pronta: editando ao vivo no estúdio');
await esperar(1800); // a página do pedido vai sozinha para o estúdio, na mesma janela
await estudioNaFrente(proj); // a mesma janela do estúdio que já está aberta, na tela dele
await esperar(4500);
// clique de verdade no topo do estúdio: é o "gesto do usuário" que o Chrome exige para tocar a voz com som

await esperar(400);

// 6) ações a partir do plano — EM TEMPO REAL, igual ao reel de referência: a voz toca e cada cena
//    é montada pelos agentes no instante em que a fala chega nela; no fim o vídeo toca de novo do começo.
execFileSync('node', ['ferramentas/alinhar.mjs', planoArq, join(RAIZ, plano.narracao)], {cwd: RAIZ, stdio: 'ignore'});
const tempo = ler(join(RAIZ, 'public', plano.projeto, 'tempo.json'));
const token = Math.random().toString(36).slice(2, 8);
const A = [];
A.push({tipo: 'esperar_visivel'});
A.push({agente: 'roteiro', tipo: 'recarregar'});
A.push({tipo: 'ritmo', valor: 0.4});
A.push({agente: 'voz', tipo: 'nota', msg: '1º a voz: narração pronta', ms: 500});
A.push({agente: 'voz', tipo: 'voz', arquivo: plano.narracao, plano: `trabalho/${proj}/plano-final.json`});
A.push({tipo: 'tempo_real', valor: true});
A.push({agente: 'roteiro', tipo: 'nota', msg: `tocando a voz e montando as ${plano.cenas.length} cenas junto`, ms: 300});
A.push({agente: 'voz', tipo: 'tocar_de', seg: 0});
A.push({tipo: 'vigiar', ate: tempo.duracao, solto: true});
plano.cenas.forEach((c, i) => {
  A.push({tipo: 'quando', seg: Math.max(0, (tempo.cenas[i]?.ini ?? 0) - 0.35)});
  A.push({agente: 'roteiro', tipo: 'nova_cena', fala: c.fala, fundo: c.fundo, ancora: c.ancora});
  const j = (a) => A.push({...a, cena: i, junto: true});
  if (c.texto) j({agente: 'texto', tipo: 'texto', valor: c.texto});
  if (c.interface) j({agente: 'interface', tipo: 'interface', valor: c.interface});
  if (c.personagem) j({agente: 'personagem', tipo: 'personagem', nome: c.personagem});
  if (c.personagem2) j({agente: 'personagem', tipo: 'personagem', nome: c.personagem2, campo: 'personagem2'});
  if (c.ajuste?.movimento) j({agente: 'movimento', tipo: 'movimento', valor: c.ajuste.movimento});
  for (const campo of ['x', 'y', 'escala', 'rotacao', 'opacidade']) if (typeof c.ajuste?.[campo] === 'number') j({agente: 'movimento', tipo: 'slider', campo, valor: c.ajuste[campo]});
  for (const m of c.marcas ?? []) j({agente: 'graficos', tipo: 'marca', valor: m});
  if (c.tela) j({agente: 'design', tipo: 'tela', valor: c.tela});
  // campos dos templates de edição (roteiro.template): tudo que o Prisma não monta campo a campo
  const PRISMA = new Set(['id', 'fala', 'fundo', 'ancora', 'texto', 'interface', 'personagem', 'personagem2', 'ajuste', 'marcas', 'tela']);
  const proprios = Object.fromEntries(Object.entries(c).filter(([k]) => !PRISMA.has(k)));
  if (Object.keys(proprios).length) j({agente: 'design', tipo: 'campos', valor: proprios});
  A.push({tipo: 'sincronizar'});
});
A.push({tipo: 'sincronizar'});
A.push({tipo: 'quando', seg: tempo.duracao - 0.15});
A.push({tipo: 'esperar', ms: 600});
A.push({tipo: 'tempo_real', valor: false});
A.push({tipo: 'ritmo', valor: 1});
A.push({agente: 'revisao', tipo: 'nota', msg: `montagem pronta #${token}`, ms: 300});
const r = await mandar(A);
console.log(`${A.length} ações na fila de ${proj} (total ${r.ultimo}) · ${plano.cenas.length} cenas`);

const liberarSom = () => {
// só clica se o Chrome estiver mesmo na frente (nunca clicar às cegas em outra janela dele)
try {
  execFileSync('osascript', ['-e', 'tell application "Google Chrome" to activate']); execFileSync('sleep', ['0.6']);
  const r = execFileSync('osascript', ['-e', 'tell application "System Events" to set f to frontmost of process "Google Chrome"', '-e', 'tell application "Google Chrome" to set b to bounds of (first window whose URL of active tab contains "localhost:4460")', '-e', 'return (f as text) & "," & (item 1 of b) & "," & (item 2 of b) & "," & (item 3 of b)']).toString().trim().split(',');
  if (r[0] === 'true') execFileSync(join(RAIZ, 'ferramentas/clique'), [String(Math.round((+r[1] + +r[3]) / 2)), String(+r[2] + 50)]);
  else console.log('⚠ o Chrome não está na frente: a voz pode tocar sem som');
} catch {}
};
// 7) espera a montagem acabar (o estúdio registra a nota com o token)
const t0 = Date.now();
let pronto = false, aviso = 0, somLiberado = false;
while (Date.now() - t0 < 1200000 + tempo.duracao * 1000) {
  await esperar(1000);
  const a = await fetch(`${API}/agentes`).then((x) => x.json()).catch(() => null);
  if (!somLiberado && a?.registro?.some((l) => l.t > t0 && l.msg === 'aba na tela')) { somLiberado = true; console.log('aba na tela: começando'); }
  if (a?.registro?.some((l) => (l.msg || '').includes(token))) { pronto = true; break; }
  // nenhuma ação executada em 25 s = não há aba do estúdio na frente: devolve o roteiro e para
  if (Date.now() - t0 > 600000 && !a?.registro?.some((l) => l.t > t0)) {
    writeFileSync(roteiroArq, JSON.stringify(plano, null, 2));
    console.error('✕ o estúdio não executou nada em 25 s: a aba não abriu na frente. Roteiro devolvido do plano; abra http://localhost:4460/?p=' + proj + ' e rode de novo.');
    process.exit(2);
  }
  if (Date.now() - aviso > 10000) {
    aviso = Date.now();
    let n = 0; try { n = ler(roteiroArq).cenas.length; } catch {}
    console.log(`… ${Math.round((Date.now() - t0) / 1000)} s · ${n}/${plano.cenas.length} cenas salvas`);
  }
}
console.log(pronto ? `montagem ao vivo terminou em ${Math.round((Date.now() - t0) / 1000)} s` : '⚠ a montagem não avisou o fim em 6 min (aba em segundo plano?) — sigo para a conferência');
await esperar(1500); // o estúdio salva sozinho em 700 ms
// tira a aba de dona: se ela ainda estiver executando algo (atrasada), não salva mais por cima do roteiro
if (!pronto) await fetch(`${API}/acoes/${proj}?desde=-1&registrar=1&tab=conferencia-${token}`).catch(() => {});

// 8) conferência: o que ficou no estúdio tem de ser igual ao plano
const estavel = (v) => {
  if (v == null) return 'null';
  if (Array.isArray(v)) return v.length ? '[' + v.map(estavel).join(',') + ']' : 'null';
  if (typeof v === 'object') { const ks = Object.keys(v).filter((k) => v[k] != null).sort(); return ks.length ? '{' + ks.map((k) => JSON.stringify(k) + ':' + estavel(v[k])).join(',') + '}' : 'null'; }
  return JSON.stringify(v);
};
const CAMPOS = ['fala', 'ancora', 'personagem', 'personagem2', 'texto', 'interface', 'fundo', 'ajuste', 'marcas', 'tela'];
const feito = ler(roteiroArq);
const difs = [];
if ((feito.cenas?.length ?? 0) !== plano.cenas.length) difs.push(`nº de cenas: ${feito.cenas?.length ?? 0} em vez de ${plano.cenas.length}`);
// confere os campos do Prisma e todos os outros que a cena tiver (templates de edição têm campos próprios)
plano.cenas.forEach((c, i) => {
  const f = feito.cenas?.[i] ?? {};
  const chaves = new Set([...CAMPOS, ...Object.keys(c), ...Object.keys(f)]);
  chaves.delete('id');
  for (const k of chaves) if (estavel(c[k]) !== estavel(f[k])) difs.push(`cena ${i + 1} · ${k}`);
});
if (estavel(plano.template) !== estavel(feito.template)) difs.push('template do roteiro');
if (difs.length) {
  console.log(`conferência: ${difs.length} diferença(s) do plano → corrigindo\n  ` + difs.join('\n  '));
  writeFileSync(roteiroArq, JSON.stringify({...plano, narracao: plano.narracao}, null, 2));
  await mandar([{agente: 'revisao', tipo: 'nota', msg: `corrigindo ${difs.length} diferença(s) do plano`, ms: 500}, {agente: 'revisao', tipo: 'recarregar'}]);
  await esperar(2500);
} else console.log('conferência: montagem igual ao plano');

// 9) revisão pela linha do tempo (sem render): o cursor da revisão passa por todas as cenas na aba dele,
//    e o olhar.mjs fotografa o palco em 3 pontos de cada cena para eu conferir
if (pronto) {
  // REVISÃO: assistir o vídeo inteiro do começo depois de editar, com o vigia olhando a linha do tempo
  const t1 = Date.now();
  await mandar([{agente: 'revisao', tipo: 'nota', msg: 'revisão: assistindo o vídeo inteiro do começo', ms: 600}, {agente: 'revisao', tipo: 'tocar_de', seg: 0}, {tipo: 'vigiar', ate: tempo.duracao}]);
  let fimRev = null;
  while (Date.now() - t1 < (tempo.duracao + 40) * 1000) {
    await esperar(1000);
    const a = await fetch(`${API}/agentes`).then((x) => x.json()).catch(() => null);
    const ls = (a?.registro ?? []).filter((l) => l.t > t0);
    if (ls.some((l) => l.t > t1 && l.msg.startsWith('vigia da reprodução'))) { fimRev = ls; break; }
  }
  const probs = (fimRev ?? []).filter((l) => l.msg.startsWith('⚠') || l.msg.startsWith('vigia'));
  console.log('revisão da reprodução (montagem + assistida):\n  ' + (probs.map((l) => l.msg).join('\n  ') || 'sem resposta do vigia'));
}
if (false) await mandar([
  {agente: 'revisao', tipo: 'nota', msg: 'revisando cena por cena na linha do tempo', ms: 400},
  ...plano.cenas.map((c, i) => ({agente: 'revisao', tipo: 'ver', cena: i, pos: 0.6, ms: 300})),
  {agente: 'revisao', tipo: 'nota', msg: 'revisão feita', ms: 600},
  {agente: 'revisao', tipo: 'ir', cena: 0},
  ...(tocar ? [{agente: 'revisao', tipo: 'play', cena: 0}] : []),
  ...['roteiro', 'texto', 'personagem', 'interface', 'movimento', 'voz', 'graficos', 'design', 'revisao'].map((agente) => ({agente, tipo: 'sumir'})),
]);
if (!semRevisao) {
  const pasta = join('trabalho', 'revisao', `${proj}-${carimbo()}`);
  // o navegador de testes às vezes falha na 1ª abertura (23/11): tenta de novo uma vez
  try { execFileSync('node', ['ferramentas/olhar.mjs', proj, pasta, '0.3,0.6,0.92'], {cwd: RAIZ, stdio: 'inherit'}); }
  catch { await esperar(3000); execFileSync('node', ['ferramentas/olhar.mjs', proj, pasta, '0.3,0.6,0.92'], {cwd: RAIZ, stdio: 'inherit'}); }
  console.log('folha para revisão: ' + join(RAIZ, pasta, 'folha.jpg'));
}
await avisarPedido('pronto', 'vídeo editado e revisado: pode exportar');
console.log('pronto. Exportar é com o Gabriel (botão Exportar do estúdio).');
