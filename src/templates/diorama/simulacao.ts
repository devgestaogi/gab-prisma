// Simulação determinística dos peões. O Remotion renderiza quadros fora de ordem e em paralelo, então o fluxo
// é calculado uma vez, por passos de 1 quadro, só a partir do roteiro (semente fixa), e cada quadro lê a tabela.
import {cenasValidas, numero, objeto} from './../comum';
import type {DadosT} from './../comum';
import {estacoesDe, fluxoPorCena, uEstacao, Z_SPAWN} from './tipos';

export const N_PEOES = 170;
const VELOCIDADE = 3.3; // unidades por segundo
const EMISSAO = 0.1; // um peão novo a cada 0,1 s
const ENTRADA_FILA = 5.6; // a quantos unidades antes do portão o peão "decide" travar
const SLOTS_X = [-1.12, -0.82, 0.82, 1.12];
export const CAMPOS = 6; // x, z, visibilidade, vermelho, fase, travado

export type Sim = {frames: number; peoes: Float32Array; mix: Float32Array; nEst: number};

const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// só as simulações em uso (a edição ao vivo gera uma chave nova a cada mudança): guarda as 3 mais recentes
const cache = new Map<string, Sim>();
const CACHE_MAX = 3;

export const simular = (d: DadosT): Sim => {
  const fps = numero(objeto(d.roteiro?.formato).fps, 30);
  const frames = Math.ceil(numero(d.tempo?.duracao, 0) * fps) + 2;
  const est = estacoesDe(d);
  const nEst = est.length;
  const cenas = cenasValidas(d);
  const flux = fluxoPorCena(d);
  const chave = JSON.stringify([frames, fps, nEst, cenas.map((c) => [c.i, c.ini]), flux]);
  const hit = cache.get(chave);
  if (hit) { cache.delete(chave); cache.set(chave, hit); return hit; }
  const guardar = (sim: Sim) => {
    cache.set(chave, sim);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return sim;
  };
  // sem estações não há por onde os peões andarem: tabela vazia (todos invisíveis)
  if (nEst === 0) return guardar({frames, peoes: new Float32Array(frames * N_PEOES * CAMPOS), mix: new Float32Array(frames), nEst});

  const rnd = mulberry32(20261123);
  const dt = 1 / fps;
  const peoes = new Float32Array(frames * N_PEOES * CAMPOS);
  const mix = new Float32Array(frames * Math.max(1, nEst));

  // estado de cada peão
  const st = new Uint8Array(N_PEOES); // 0 livre, 1 andando, 2 travado
  const u = new Float32Array(N_PEOES);
  const x = new Float32Array(N_PEOES);
  const lane = new Float32Array(N_PEOES);
  const vel = new Float32Array(N_PEOES);
  const goal = new Int8Array(N_PEOES);
  const qst = new Int8Array(N_PEOES); // estação em cuja fila o peão travou
  const nasc = new Float32Array(N_PEOES); // instante do nascimento (entrada suave)
  const slot = new Int16Array(N_PEOES);
  const tu = new Float32Array(N_PEOES);
  const tx = new Float32Array(N_PEOES);
  const red = new Float32Array(N_PEOES);
  const fase = new Float32Array(N_PEOES);
  const ocupados: boolean[][] = Array.from({length: nEst}, () => []);
  const contagem = new Array(nEst).fill(0);
  const mixAtual = new Array(nEst).fill(0);
  let acum = 0;

  const aquecer = Math.round(6 * fps);
  for (let passo = -aquecer; passo < frames; passo++) {
    const t = passo * dt;
    let k = 0; // índice na lista de cenas válidas
    cenas.forEach((c, j) => { if (c.ini <= Math.max(0, t) + 1e-6) k = j; });
    const cfg = cenas.length ? flux[cenas[k].i] : undefined;
    const {ate, trav} = cfg ?? {ate: nEst - 1, trav: 0};
    const tCena = passo < 0 || !cenas.length ? -1e9 : cenas[k].ini;

    // nascimento
    acum += dt;
    while (acum >= EMISSAO) {
      acum -= EMISSAO;
      const livre = st.findIndex((s) => s === 0);
      if (livre >= 0) {
        st[livre] = 1; u[livre] = 0; lane[livre] = (rnd() * 2 - 1) * 0.55; x[livre] = lane[livre];
        vel[livre] = 0.9 + rnd() * 0.22; goal[livre] = ate; red[livre] = 0; fase[livre] = rnd() * 6.28; nasc[livre] = t;
      } else rnd();
    }
    // quando o fluxo se estende (a câmera revela mais estações), a multidão já está saindo do portão anterior
    if (passo >= 0 && k > 0 && ate > flux[cenas[k - 1].i].ate && Math.abs(t - cenas[k].ini) < dt / 2) {
      for (let g = flux[cenas[k - 1].i].ate; g < ate; g++) {
        for (let n = 0; n < 16; n++) {
          const livre = st.findIndex((s) => s === 0);
          if (livre < 0) break;
          st[livre] = 1; u[livre] = uEstacao(g) + 1.7 + n * 0.55; lane[livre] = (rnd() * 2 - 1) * 0.55; x[livre] = lane[livre];
          vel[livre] = 0.9 + rnd() * 0.22; goal[livre] = ate; red[livre] = 0; fase[livre] = rnd() * 6.28; nasc[livre] = t;
        }
      }
    }

    for (let p = 0; p < N_PEOES; p++) {
      if (st[p] === 0) continue;
      const g = goal[p];
      const uG = uEstacao(g);
      const uA = uEstacao(ate);
      if (st[p] === 1) {
        u[p] += VELOCIDADE * vel[p] * dt;
        x[p] += (lane[p] - x[p]) * Math.min(1, dt * 4);
        // trava na fila diante da estação do fim do fluxo
        if (g >= ate && trav > 0 && contagem[ate] < trav && u[p] >= uA - ENTRADA_FILA && u[p] < uA - 1.0) {
          let s = 0;
          while (ocupados[ate][s]) s++;
          ocupados[ate][s] = true; contagem[ate]++;
          st[p] = 2; slot[p] = s; qst[p] = ate;
          tu[p] = uA - 1.5 - Math.floor(s / 4) * 0.58 - (s % 2) * 0.18;
          tx[p] = SLOTS_X[s % 4];
        } else if (u[p] >= uG + 1.5) {
          st[p] = 0;
        }
      }
    }

    // soltura da fila (da frente para trás, com uma pequena defasagem entre os peões)
    for (let g = 0; g < nEst; g++) {
      const meta = g === ate ? trav : 0;
      const excesso = contagem[g] - meta;
      if (excesso <= 0) continue;
      const fila: number[] = [];
      for (let p = 0; p < N_PEOES; p++) if (st[p] === 2 && qst[p] === g) fila.push(p);
      fila.sort((a, b) => slot[a] - slot[b]);
      fila.slice(0, excesso).forEach((p) => {
        if (t >= tCena + 0.07 * slot[p]) {
          st[p] = 1; ocupados[g][slot[p]] = false; contagem[g]--;
          goal[p] = Math.max(goal[p], ate); // quem estava parado volta a andar até onde o fluxo vai agora
        }
      });
    }

    for (let p = 0; p < N_PEOES; p++) {
      if (st[p] === 0) { red[p] = 0; continue; }
      if (st[p] === 2) {
        if (u[p] < tu[p]) u[p] = Math.min(tu[p], u[p] + VELOCIDADE * vel[p] * dt);
        x[p] += (tx[p] - x[p]) * Math.min(1, dt * 3);
      }
      const alvo = st[p] === 2 ? 1 : 0;
      red[p] += Math.max(-dt * 3.5, Math.min(dt * 3.5, alvo - red[p]));
    }
    for (let g = 0; g < nEst; g++) mixAtual[g] += ((contagem[g] > 0 ? 1 : 0) - mixAtual[g]) * Math.min(1, dt * 4);

    if (passo >= 0) {
      for (let p = 0; p < N_PEOES; p++) {
        const o = (passo * N_PEOES + p) * CAMPOS;
        if (st[p] === 0) { peoes[o + 2] = 0; continue; }
        const uG = uEstacao(goal[p]);
        const vis = Math.min(1, (t - nasc[p]) / 0.35 + 0.001, u[p] / 0.9) * (u[p] < uG + 0.5 ? 1 : Math.max(0, 1 - (u[p] - uG - 0.5) / 0.9));
        peoes[o] = x[p]; peoes[o + 1] = Z_SPAWN - u[p]; peoes[o + 2] = vis; peoes[o + 3] = red[p];
        peoes[o + 4] = fase[p] + u[p] * 4.2; peoes[o + 5] = st[p] === 2 && u[p] >= tu[p] - 0.01 ? 1 : 0;
      }
      for (let g = 0; g < nEst; g++) mix[passo * nEst + g] = mixAtual[g];
    }
  }
  return guardar({frames, peoes, mix, nEst});
};
