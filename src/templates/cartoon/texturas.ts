// Texturas de canvas (uma vez por página, com semente fixa) para os cenários 3D procedurais.
import * as THREE from 'three';
import {rng} from './util';

const cache = new Map<string, THREE.CanvasTexture>();
const fazer = (chave: string, w: number, h: number, desenhar: (x: CanvasRenderingContext2D, w: number, h: number) => void, repetir?: [number, number]) => {
  const k = chave + (repetir ? repetir.join('x') : '');
  const ja = cache.get(k);
  if (ja) return ja;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  desenhar(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir[0], repetir[1]); }
  cache.set(k, t);
  return t;
};
const ajusta = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

// piso de tábuas: as tábuas correm no sentido de v (profundidade), as linhas convergem na perspectiva
export const tabuas = (base: string, repetir: [number, number] = [1, 1], nome = 'tabuas') =>
  fazer(nome + base, 1024, 1024, (x, w, h) => {
    const r = rng(7);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const pw = w / n;
      x.fillStyle = ajusta(base, 0.82 + r() * 0.36);
      x.fillRect(i * pw, 0, pw, h);
      for (let g = 0; g < 26; g++) {
        const gx = i * pw + r() * pw;
        x.strokeStyle = `rgba(20,10,0,${0.05 + r() * 0.13})`;
        x.lineWidth = 1 + r() * 2;
        x.beginPath();
        for (let y = 0; y <= h; y += 32) x.lineTo(gx + Math.sin(y * 0.01 + g) * 3, y);
        x.stroke();
      }
      for (let j = 0; j < 3; j++) {
        const y = r() * h;
        x.fillStyle = 'rgba(0,0,0,.45)';
        x.fillRect(i * pw, y, pw, 3);
      }
      x.fillStyle = 'rgba(0,0,0,.6)';
      x.fillRect(i * pw, 0, 3, h);
      x.fillStyle = 'rgba(255,230,190,.06)';
      x.fillRect(i * pw + 3, 0, 2, h);
    }
  }, repetir);

export const parede = (base: string, nome = 'parede') =>
  fazer(nome + base, 512, 512, (x, w, h) => {
    const r = rng(11);
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.04)';
      x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    for (let i = 0; i < 6; i++) {
      const g = x.createRadialGradient(r() * w, r() * h, 5, r() * w, r() * h, 140);
      g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
  });

export const tecido = (base: string) =>
  fazer('tecido' + base, 256, 256, (x, w, h) => {
    const r = rng(23);
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)';
      x.fillRect(r() * w, r() * h, 2, 1);
    }
  }, [2, 2]);

export const carpete = (base: string) =>
  fazer('carpete' + base, 256, 256, (x, w, h) => {
    const r = rng(31);
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.09)';
      x.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
  }, [5, 5]);

// lombada de livros e pastas
export const livros = (paleta: string[], nome = 'livros') =>
  fazer(nome + paleta.join(), 512, 512, (x, w, h) => {
    const r = rng(41);
    x.fillStyle = '#1b1410'; x.fillRect(0, 0, w, h);
    const linhas = 4;
    for (let l = 0; l < linhas; l++) {
      const y0 = (l * h) / linhas;
      const alt = h / linhas;
      let cx = 4;
      while (cx < w - 10) {
        const bw = 12 + r() * 26;
        const bh = alt * (0.62 + r() * 0.3);
        x.fillStyle = paleta[Math.floor(r() * paleta.length)];
        x.fillRect(cx, y0 + alt - bh - 8, bw, bh);
        x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(cx, y0 + alt - bh - 8, 2, bh);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(cx + bw - 3, y0 + alt - bh - 8, 3, bh);
        x.fillStyle = 'rgba(255,240,200,.35)'; x.fillRect(cx + 3, y0 + alt - bh + 8, bw - 8, 3);
        cx += bw + 1 + (r() > 0.85 ? 10 : 0);
      }
      x.fillStyle = '#4a3220'; x.fillRect(0, y0 + alt - 8, w, 8);
    }
  });

// tela de planilha para o monitor
export const telaPlanilha = () =>
  fazer('telaPlanilha', 512, 320, (x, w, h) => {
    const r = rng(53);
    x.fillStyle = '#f4f6f8'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#2f7d4f'; x.fillRect(0, 0, w, 26);
    x.strokeStyle = '#c9ced4'; x.lineWidth = 1;
    for (let c = 0; c < 8; c++) { x.beginPath(); x.moveTo(c * 64, 26); x.lineTo(c * 64, h); x.stroke(); }
    for (let l = 0; l < 14; l++) { x.beginPath(); x.moveTo(0, 26 + l * 21); x.lineTo(w, 26 + l * 21); x.stroke(); }
    for (let l = 0; l < 13; l++) for (let c = 0; c < 8; c++) {
      if (r() > 0.25) { x.fillStyle = r() > 0.9 ? '#e9b04a' : '#5d6772'; x.fillRect(c * 64 + 6, 26 + l * 21 + 7, 14 + r() * 36, 6); }
    }
  });

// quadro branco de regras (texto desenhado por código; some no desfoque, é cenário)
export const quadroRegras = () =>
  fazer('quadroRegras', 512, 384, (x, w, h) => {
    x.fillStyle = '#f2f1ec'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#23304d'; x.font = '700 38px Arial, sans-serif'; x.fillText('REGRAS DA CASA', 28, 64);
    x.strokeStyle = '#23304d'; x.lineWidth = 3; x.beginPath(); x.moveTo(28, 78); x.lineTo(340, 78); x.stroke();
    ['Decide sozinho o do dia a dia', 'Chama o dono só no que é grande', 'Registra tudo na planilha', 'Dúvida? Segue a regra'].forEach((t, i) => {
      const y = 132 + i * 66;
      x.strokeStyle = '#2f7d4f'; x.lineWidth = 6; x.beginPath(); x.moveTo(32, y - 12); x.lineTo(44, y); x.lineTo(66, y - 28); x.stroke();
      x.fillStyle = '#23304d'; x.font = '500 27px Arial, sans-serif'; x.fillText(t, 84, y);
    });
  });

export const placaPorta = (texto: string) =>
  fazer('placa' + texto, 512, 160, (x, w, h) => {
    x.fillStyle = '#16181f'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#c9a463'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#e8d3a2'; x.font = '700 62px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texto, w / 2, h / 2 + 4);
  });

// fundo de céu (varanda e janelas distantes)
export const ceu = (hora: 'dia' | 'noite' | 'tarde') =>
  fazer('ceu' + hora, 64, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    if (hora === 'noite') { g.addColorStop(0, '#05081a'); g.addColorStop(0.6, '#142349'); g.addColorStop(1, '#2d3a63'); }
    else if (hora === 'tarde') { g.addColorStop(0, '#2c4f7e'); g.addColorStop(0.45, '#d98a56'); g.addColorStop(0.7, '#ffc073'); g.addColorStop(1, '#ffd59a'); }
    else { g.addColorStop(0, '#5b9bd5'); g.addColorStop(0.7, '#a9d1ee'); g.addColorStop(1, '#f4e6c8'); }
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });

export const brilho = () =>
  fazer('brilho', 128, 128, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });

// feixe de luz (gradiente de transparência para o plano aditivo)
export const feixe = () =>
  fazer('feixe', 64, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const m = x.createLinearGradient(0, 0, w, 0);
    m.addColorStop(0, 'rgba(0,0,0,.9)'); m.addColorStop(0.3, 'rgba(0,0,0,0)'); m.addColorStop(0.7, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,.9)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = m; x.fillRect(0, 0, w, h);
  });

export const tapete = (c1: string, c2: string) =>
  fazer('tapete' + c1 + c2, 512, 512, (x, w, h) => {
    x.fillStyle = c1; x.fillRect(0, 0, w, h);
    x.strokeStyle = c2; x.lineWidth = 14; x.strokeRect(28, 28, w - 56, h - 56);
    x.lineWidth = 5; x.strokeRect(60, 60, w - 120, h - 120);
    for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(w / 2, h / 2, 30 + i * 28, 0, 7); x.lineWidth = 3; x.stroke(); }
  });

// ruído de grão (usado como imagem de fundo, não como textura 3D)
export const graoDataUrl = (() => {
  let url = '';
  return () => {
    if (url) return url;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const r = rng(97);
    const d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    url = c.toDataURL('image/png');
    return url;
  };
})();
