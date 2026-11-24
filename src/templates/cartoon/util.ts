// Utilidades determinísticas do template cartoon (nada de Math.random: o Remotion renderiza fora de ordem).
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const suave = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
export const senoide = (f: number, periodo: number, fase = 0) => Math.sin(((f + fase) / periodo) * Math.PI * 2);
