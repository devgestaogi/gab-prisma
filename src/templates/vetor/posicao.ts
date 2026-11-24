// Posição dos gráficos do template vetor no modo "planos de imagem" (e quando a cena traz `layout`).
// Tudo é conta pura: a legenda tem um centro por posição; os cartões (contador, balão, impacto, CTA) formam uma pilha
// no mesmo eixo, com espaçamento fixo, dentro da faixa pedida; a pilha cede à legenda e ao cabeçalho (título e selo).
import {PosVertical, ZONA, limita} from './util';

export const CENTRO_LEGENDA: Record<PosVertical, number> = {alto: 600, meio: 900, baixo: 1130};
export const FAIXA_CARTAO: Record<PosVertical, [number, number]> = {alto: [420, 700], meio: [640, 960], baixo: [860, 1200]};
export const FOLGA_CABECALHO = 28; // espaço entre o cabeçalho (título, selo) e o primeiro cartão
export const ENTRE_CARTOES = 28; // espaço fixo entre dois cartões da pilha
const MEIA_LEGENDA = 100; // a legenda de até 2 linhas ocupa centro ± 100

// centro da legenda: o pedido, sem subir para dentro do cabeçalho
export const centroDaLegenda = (pos: PosVertical, cabecalho: number) => Math.max(CENTRO_LEGENDA[pos], cabecalho ? cabecalho + MEIA_LEGENDA : 0);

export type Bloco = {chave: string; altura: number};
export type Slot = {top: number; escala: number};
type Vaga = [number, number];

// maior escala (1 a 0,7, de 0,05 em 0,05) em que a pilha cabe na vaga; o topo fica o mais perto possível do centro desejado
const encaixa = (alturas: number[], vaga: Vaga, centro: number): {top: number; escala: number; H: number} | null => {
  const soma = alturas.reduce((a, b) => a + b, 0), folgas = ENTRE_CARTOES * (alturas.length - 1);
  for (let k = 0; k <= 6; k++) {
    const escala = 1 - 0.05 * k, H = soma * escala + folgas;
    if (H <= vaga[1] - vaga[0] + 0.5) return {top: limita(centro - H / 2, vaga[0], vaga[1] - H), escala, H};
  }
  return null;
};

// A pilha (ordem de prioridade: contador, balão, impacto, CTA) tem duas vagas livres: acima e abaixo da legenda (legenda ± 100),
// a de cima começando no cabeçalho. Cabe inteira em uma? Reduz a escala da pilha toda até 70%. Não coube? Tira o item de menor
// prioridade (CTA, depois impacto) e o põe na outra vaga. Nunca sobrepõe, salvo se nada disso resolver (fallback: 70% no centro).
export const empilha = (blocos: Bloco[], pos: PosVertical, legendaY: number, cabecalho: number): Record<string, Slot> => {
  const res: Record<string, Slot> = {};
  const n = blocos.length;
  if (!n) return res;
  const min = cabecalho ? cabecalho + FOLGA_CABECALHO : 290; // 290: o balão não sobe mais que isso
  const vagas: Vaga[] = [[min, legendaY - MEIA_LEGENDA], [legendaY + MEIA_LEGENDA, ZONA.base]];
  const [fa, fb] = FAIXA_CARTAO[pos];
  const centro = (fa + fb) / 2;
  const coloca = (bs: Bloco[], top: number, escala: number) => { let y = top; bs.forEach((b) => { res[b.chave] = {top: y, escala}; y += b.altura * escala + ENTRE_CARTOES; }); };
  for (let d = 0; d <= Math.min(2, n - 1); d++) {
    const main = blocos.slice(0, n - d), mov = blocos.slice(n - d);
    const hs = (bs: Bloco[]) => bs.map((b) => b.altura);
    const opcoes: {dist: number; ok: () => void}[] = [];
    (d === 0 ? [[0, -1], [1, -1]] : [[0, 1], [1, 0]]).forEach(([vm, vo]) => {
      const rm = encaixa(hs(main), vagas[vm], centro);
      const ro = vo < 0 ? null : encaixa(hs(mov), vagas[vo], (vagas[vo][0] + vagas[vo][1]) / 2);
      if (rm && (vo < 0 || ro)) opcoes.push({dist: Math.abs(rm.top + rm.H / 2 - centro), ok: () => { coloca(main, rm.top, rm.escala); if (ro) coloca(mov, ro.top, ro.escala); }});
    });
    if (opcoes.length) { opcoes.sort((a, b) => a.dist - b.dist)[0].ok(); return res; }
  }
  const H = blocos.reduce((a, b) => a + b.altura, 0) * 0.7 + ENTRE_CARTOES * (n - 1);
  coloca(blocos, limita(centro - H / 2, min, Math.max(min, ZONA.base - H)), 0.7);
  return res;
};

// sons: sem dois no mesmo quadro (mínimo de 3 quadros entre quaisquer dois), na ordem em que entram
export type EventoSom = {som: string; f: number; vol: number};
export const agendaSons = (evs: (EventoSom | false | null | undefined)[]): EventoSom[] => {
  const ordem = evs.filter((e): e is EventoSom => !!e).map((e, i) => ({e, i})).sort((a, b) => a.e.f - b.e.f || a.i - b.i);
  let ult = -99;
  return ordem.map(({e}) => { const f = Math.max(0, e.f, ult + 3); ult = f; return {...e, f}; });
};
