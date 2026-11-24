// render.mjs <roteiro.json> [saida.mp4] [--quadro N]
// Junta roteiro + tempos da voz + personagens que existem em public/<projeto>/filme.json e renderiza.
// --quadro N: só tira um print daquele quadro (para conferir sem renderizar tudo).
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const qi = args.indexOf('--quadro');
const quadro = qi >= 0 ? args.splice(qi, 2)[1] : null;
const [roteiroArq, saidaArg] = args;
const roteiro = JSON.parse(readFileSync(roteiroArq, 'utf8'));
const pub = join(RAIZ, 'public', roteiro.projeto);
if (!existsSync(join(pub, 'tempo.json'))) throw new Error('falta tempo.json: rode antes ferramentas/alinhar.mjs');
const tempo = JSON.parse(readFileSync(join(pub, 'tempo.json'), 'utf8'));
if (tempo.cenas.length !== roteiro.cenas.length) throw new Error('roteiro mudou depois do alinhamento: rode alinhar.mjs de novo');
const personagens = existsSync(join(pub, 'personagens')) ? readdirSync(join(pub, 'personagens')).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)) : [];
// manifesto das imagens de plano que existem (png/jpg/jpeg/webp, caminhos relativos a planos/, com subpasta se houver)
const listarPlanos = (dir, pre = '') => (existsSync(dir) ? readdirSync(dir).sort().flatMap((f) => (statSync(join(dir, f)).isDirectory() ? listarPlanos(join(dir, f), `${pre}${f}/`) : /\.(png|jpe?g|webp)$/i.test(f) ? [`${pre}${f}`] : [])) : []);
const planos = listarPlanos(join(pub, 'planos'));
const faltam = [...new Set(roteiro.cenas.map((c) => c.personagem).filter((p) => p && !personagens.includes(p)))];
if (faltam.length) console.log('⚠ personagens que faltam (a cena sai sem eles):', faltam.join(', '));
writeFileSync(join(pub, 'filme.json'), JSON.stringify({projeto: roteiro.projeto, roteiro, tempo, personagens, planos}));

const props = JSON.stringify({projeto: roteiro.projeto});
const npx = ['remotion'];
if (quadro !== null) {
  const out = saidaArg || join(RAIZ, 'saida', `${roteiro.projeto}-q${quadro}.png`);
  execFileSync('npx', [...npx, 'still', 'src/index.ts', 'Filme', out, `--frame=${quadro}`, `--props=${props}`], {cwd: RAIZ, stdio: 'inherit'});
} else {
  const out = saidaArg || join(RAIZ, 'saida', `${roteiro.projeto}.mp4`);
  execFileSync('npx', [...npx, 'render', 'src/index.ts', 'Filme', out, `--props=${props}`, '--concurrency=4', '--crf=18'], {cwd: RAIZ, stdio: 'inherit'});
  // volume de reel: -14 LUFS, pico -1 dB (sem mexer no vídeo)
  const tmp = out.replace(/\.mp4$/, '.som.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', tmp]);
  execFileSync('mv', [tmp, out]);
  console.log('volume normalizado: -14 LUFS');
}
