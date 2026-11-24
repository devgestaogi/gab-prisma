// O mundo 3D do diorama: chão com grade, estações (portões com placa), peões em InstancedMesh e câmera.
// Tudo é função do quadro absoluto: nada de Math.random, nada de estado entre quadros.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DadosT} from '../comum';
import {tomDe} from '../comum';
import {poseNoTempo} from './camera';
import {CAMPOS, N_PEOES, simular} from './simulacao';
import {FUNDO, VERMELHO, cenaEm, cenasDe, estacoesDe, idxEstacao, revelacoes, zEstacao, ESPACO} from './tipos';
import type {Estacao} from './tipos';

const PE = 1.3; // escala dos peões
// cor de destaque do mundo 3D: passa por props (o contexto do React não atravessa o reconciliador do three)
const coresDe = (cor: string) => ({forte: new THREE.Color(cor), fraca: new THREE.Color(tomDe(cor, 0.52)), luzLateral: new THREE.Color(tomDe(cor, 1.27))});
const rgbaDe = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const COR_VERMELHO = new THREE.Color(VERMELHO);
const TONS_PEAO = ['#F6F1E7', '#EADFC8', '#DCCBA3', '#F3E5B6', '#FFFFFF', '#E7D8BC', '#D8C9AE', '#F0E6D2'].map((c) => new THREE.Color(c));

// ── texturas desenhadas por código ──────────────────────────────────────────────────────────────────────
const desenhar = (w: number, h: number, fn: (g: CanvasRenderingContext2D) => void, repetir = false) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};
const texGrade = (cor: string) => {
  const t = desenhar(256, 256, (g) => {
    g.fillStyle = '#0D0D10'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = rgbaDe(cor, 0.62); g.lineWidth = 2;
    g.strokeRect(1.5, 1.5, 253, 253);
  }, true);
  return t;
};
const texBrilho = () => desenhar(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});
const texPlaca = (texto: string) => desenhar(1024, 256, (g) => {
  g.clearRect(0, 0, 1024, 256);
  g.fillStyle = '#0B0B0D'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let tam = 150;
  const t = texto.toUpperCase();
  do { g.font = `700 ${tam}px Sora`; tam -= 6; } while (g.measureText(t).width > 900 && tam > 40);
  g.fillText(t, 512, 138);
});

// ── câmera ───────────────────────────────────────────────────────────────────────────────────────────────
const Camera: React.FC<{dados: DadosT}> = ({dados}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const p = poseNoTempo(dados, frame / fps);
    camera.position.set(...p.pos);
    camera.lookAt(...p.alvo);
    camera.updateMatrixWorld();
  });
  return null;
};

// ── chão ─────────────────────────────────────────────────────────────────────────────────────────────────
const Chao: React.FC<{comprimento: number; cor: string}> = ({comprimento, cor}) => {
  const {fraca} = useMemo(() => coresDe(cor), [cor]);
  const grade = useMemo(() => {
    const t = texGrade(cor);
    t.repeat.set(220 / 2.2, 220 / 2.2);
    return t;
  }, []);
  const cidade = useMemo(() => {
    // blocos escuros espalhados ao redor do caminho (semente fixa) dão profundidade e paralaxe
    let s = 7;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    return Array.from({length: 46}, () => {
      const lado = r() < 0.5 ? -1 : 1;
      return {x: lado * (6.5 + r() * 18), z: 20 - r() * (comprimento + 60), w: 1.4 + r() * 2.4, h: 0.6 + r() * 3.4, d: 1.4 + r() * 2.4};
    });
  }, [comprimento]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -comprimento / 2]}>
        <planeGeometry args={[220, 220]} />
        <meshBasicMaterial map={grade} toneMapped={false} />
      </mesh>
      {/* faixa do caminho, um tom acima do chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -comprimento / 2 - 1]}>
        <planeGeometry args={[4.6, comprimento + 60]} />
        <meshBasicMaterial color="#15151A" transparent opacity={0.88} />
      </mesh>
      {[-2.3, 2.3].map((x) => (
        <mesh key={x} position={[x, 0.03, -comprimento / 2 - 1]}>
          <boxGeometry args={[0.06, 0.04, comprimento + 60]} />
          <meshBasicMaterial color={fraca} />
        </mesh>
      ))}
      {cidade.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#121216" roughness={0.8} />
          </mesh>
          <mesh position={[0, b.h + 0.02, 0]}>
            <boxGeometry args={[b.w + 0.04, 0.04, b.d + 0.04]} />
            <meshBasicMaterial color={fraca} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ── estação: portão escuro com borda que brilha e placa laranja ──────────────────────────────────────────────
type PropsEstacao = {cor: string; z: number; placa: THREE.Texture; esc: number; glow: number; perigo: number; brilho: THREE.Texture};
const EstacaoMesh: React.FC<PropsEstacao> = ({cor, z, placa, esc, glow, perigo, brilho}) => {
  const {forte, fraca} = useMemo(() => coresDe(cor), [cor]);
  const borda = useMemo(() => new THREE.Color(), []);
  borda.lerpColors(fraca, forte, glow);
  borda.lerp(COR_VERMELHO, perigo);
  const luz = useMemo(() => new THREE.Color(), []);
  luz.lerpColors(forte, COR_VERMELHO, perigo);
  const xz = 0.72 + 0.28 * esc;
  const Faixa: React.FC<{p: [number, number, number]; a: [number, number, number]}> = ({p, a}) => (
    <mesh position={p}><boxGeometry args={a} /><meshBasicMaterial color={borda} toneMapped={false} /></mesh>
  );
  return (
    <group position={[0, 0, z]} scale={[xz, Math.max(0.001, esc), xz]} visible={esc > 0.002}>
      {/* sombra e mancha de luz no chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.2]}>
        <planeGeometry args={[7.5, 6.2]} />
        <meshBasicMaterial map={brilho} color="#000000" transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0.4]}>
        <planeGeometry args={[12, 11]} />
        <meshBasicMaterial map={brilho} color={luz} transparent opacity={0.1 + 0.34 * glow} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* laje */}
      <mesh position={[0, 0.1, 0]}><boxGeometry args={[4.2, 0.2, 3.1]} /><meshStandardMaterial color="#202027" roughness={0.65} /></mesh>
      <Faixa p={[0, 0.215, 1.55]} a={[4.2, 0.05, 0.07]} />
      <Faixa p={[0, 0.215, -1.55]} a={[4.2, 0.05, 0.07]} />
      <Faixa p={[2.1, 0.215, 0]} a={[0.07, 0.05, 3.1]} />
      <Faixa p={[-2.1, 0.215, 0]} a={[0.07, 0.05, 3.1]} />
      {/* pilares */}
      {[-1.65, 1.65].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.4, 0]}><boxGeometry args={[0.5, 2.4, 0.6]} /><meshStandardMaterial color="#25252C" roughness={0.55} metalness={0.15} /></mesh>
          <Faixa p={[x - Math.sign(x) * 0.25, 1.4, 0.3]} a={[0.06, 2.4, 0.06]} />
          <Faixa p={[x + Math.sign(x) * 0.25, 1.4, 0.3]} a={[0.06, 2.4, 0.06]} />
        </group>
      ))}
      {/* viga */}
      <mesh position={[0, 2.88, 0]}><boxGeometry args={[4.0, 0.62, 0.8]} /><meshStandardMaterial color="#25252C" roughness={0.55} metalness={0.15} /></mesh>
      <Faixa p={[0, 2.57, 0.4]} a={[4.0, 0.06, 0.06]} />
      <Faixa p={[0, 3.19, 0.4]} a={[4.0, 0.06, 0.06]} />
      {/* vão do portão */}
      <mesh position={[0, 1.4, 0]}>
        <planeGeometry args={[2.8, 2.4]} />
        <meshBasicMaterial color={luz} transparent opacity={0.05 + 0.1 * glow} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* placa laranja com texto preto */}
      <group position={[0, 3.45, 0.62]} rotation={[-0.38, 0, 0]}>
        <mesh><boxGeometry args={[3.7, 0.92, 0.14]} /><meshStandardMaterial color={cor} roughness={0.5} emissive={cor} emissiveIntensity={0.28} /></mesh>
        <mesh position={[0, 0, 0.075]}><planeGeometry args={[3.7, 0.93]} /><meshBasicMaterial map={placa} transparent toneMapped={false} /></mesh>
      </group>
      {/* barras no chão, na entrada */}
      <Faixa p={[-1.2, 0.04, 2.0]} a={[1.0, 0.05, 0.14]} />
      <Faixa p={[1.2, 0.04, 2.0]} a={[1.0, 0.05, 0.14]} />
      <pointLight position={[0, 3.6, 2.8]} color={luz} intensity={26 * (0.35 + glow)} distance={13} decay={2} />
    </group>
  );
};

// ── peões ────────────────────────────────────────────────────────────────────────────────────────────────
const Multidao: React.FC<{dados: DadosT; brilho: THREE.Texture}> = ({dados, brilho}) => {
  const frame = useCurrentFrame();
  const sim = useMemo(() => simular(dados), [dados]);
  const corpo = useRef<THREE.InstancedMesh>(null);
  const cabeca = useRef<THREE.InstancedMesh>(null);
  const sombra = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(() => Array.from({length: N_PEOES}, (_, i) => TONS_PEAO[(i * 7 + 3) % TONS_PEAO.length]), []);
  const aux = useMemo(() => ({o: new THREE.Object3D(), c: new THREE.Color()}), []);

  useLayoutEffect(() => {
    const f = Math.min(frame, sim.frames - 1);
    const {o, c} = aux;
    for (let i = 0; i < N_PEOES; i++) {
      const k = (f * N_PEOES + i) * CAMPOS;
      const x = sim.peoes[k], z = sim.peoes[k + 1], vis = sim.peoes[k + 2], red = sim.peoes[k + 3], fase = sim.peoes[k + 4], parado = sim.peoes[k + 5];
      const andando = parado < 0.5 && red < 0.6;
      const pulo = andando ? Math.abs(Math.sin(fase)) * 0.07 : 0;
      const balanco = andando ? Math.sin(fase) * 0.07 : Math.sin(frame * 0.5 + i) * 0.03 * parado;
      const treme = parado ? Math.sin(frame * 1.7 + i * 2.3) * 0.012 : 0;
      const s = Math.max(0.0001, vis) * PE;
      o.rotation.set(0, 0, balanco);
      o.position.set(x + treme, (0.4 + pulo) * s, z);
      o.scale.setScalar(s);
      o.updateMatrix();
      corpo.current!.setMatrixAt(i, o.matrix);
      o.position.set(x + treme - balanco * 0.8 * s, (0.98 + pulo) * s, z);
      o.updateMatrix();
      cabeca.current!.setMatrixAt(i, o.matrix);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.position.set(x, 0.045, z + 0.05);
      o.scale.set(0.95 * s, 0.7 * s, 1);
      o.updateMatrix();
      sombra.current!.setMatrixAt(i, o.matrix);
      c.copy(base[i]).lerp(COR_VERMELHO, red);
      corpo.current!.setColorAt(i, c);
      cabeca.current!.setColorAt(i, c);
    }
    [corpo.current!, cabeca.current!, sombra.current!].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  });

  return (
    <group>
      <instancedMesh ref={corpo} args={[undefined, undefined, N_PEOES]} frustumCulled={false}>
        <capsuleGeometry args={[0.21, 0.4, 6, 18]} />
        <meshStandardMaterial roughness={0.5} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={cabeca} args={[undefined, undefined, N_PEOES]} frustumCulled={false}>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial roughness={0.5} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={sombra} args={[undefined, undefined, N_PEOES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={brilho} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
    </group>
  );
};

// ── cena inteira ─────────────────────────────────────────────────────────────────────────────────────────
export const Mundo: React.FC<{dados: DadosT; cor: string}> = ({dados, cor}) => {
  const luzLateral = useMemo(() => coresDe(cor).luzLateral, [cor]);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const est = estacoesDe(dados);
  const cenas = cenasDe(dados);
  const t = frame / fps;
  const comprimento = Math.max(0, est.length - 1) * ESPACO;
  const placas = useMemo(() => est.map((e) => texPlaca(e.rotulo)), [dados]);
  const brilho = useMemo(() => texBrilho(), []);
  const reveal = useMemo(() => revelacoes(dados), [dados]);
  const sim = useMemo(() => simular(dados), [dados]);
  const i = cenaEm(dados, t);
  const foco = idxEstacao(est, cenas[i]?.foco);
  const focoAnt = i > 0 ? idxEstacao(est, cenas[i - 1]?.foco) : -2;
  const dtCena = t - dados.tempo.cenas[i].ini;
  const f = Math.min(frame, sim.frames - 1);

  return (
    <>
      <color attach="background" args={[FUNDO]} />
      <fog attach="fog" args={[FUNDO, 42, 105]} />
      <Camera dados={dados} />
      <hemisphereLight args={['#B4BBD0', '#2A2018', 1.9]} />
      <directionalLight position={[5, 12, 9]} intensity={3.1} color="#FFFFFF" />
      <directionalLight position={[-7, 5, -10]} intensity={1.4} color={luzLateral} />
      <Chao comprimento={comprimento} cor={cor} />
      {est.map((e: Estacao, k) => {
        const esc = Easing.out(Easing.back(1.6))(Math.max(0, Math.min(1, (t - reveal[k]) / 0.55)));
        // brilho: forte no foco (com transição de 0,6 s), médio nas outras
        const alvoAtual = foco === k ? 1 : foco < 0 ? 0.75 : 0.5;
        const alvoAnt = focoAnt === -2 ? alvoAtual : focoAnt === k ? 1 : focoAnt < 0 ? 0.75 : 0.5;
        const glow = interpolate(dtCena, [0, 0.6], [alvoAnt, alvoAtual], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const perigo = sim.mix[f * sim.nEst + k] ?? 0;
        return <EstacaoMesh cor={cor} key={e.id} z={zEstacao(k)} placa={placas[k]} esc={esc} glow={glow} perigo={perigo} brilho={brilho} />;
      })}
      <Multidao dados={dados} brilho={brilho} />
    </>
  );
};
