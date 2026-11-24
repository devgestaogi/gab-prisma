// Cenários 3D procedurais do template cartoon: sala, escritório, varanda e corredor com porta.
// Só primitivas e texturas de canvas; luz quente dominante contra ambiente azulado; sombras suaves.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {brilho, carpete, ceu, feixe, livros, parede, placaPorta, quadroRegras, tabuas, tapete, tecido, telaPlanilha} from './texturas';
import {rng} from './util';

export type V3 = [number, number, number];
export type Hora = 'dia' | 'noite' | 'tarde';
export type CenarioTipo = 'sala' | 'escritorio' | 'varanda' | 'porta';
export type CenarioProps = {tipo: CenarioTipo; hora?: Hora; luz?: 'quente' | 'fria'; quadro?: boolean; placa?: string};

// ── peças ───────────────────────────────────────────────────────────────────────────────────────────────
type CxProps = {p: V3; s: V3; cor?: string; map?: THREE.Texture; r?: number; m?: number; em?: string; ei?: number; rot?: V3; sombra?: boolean; recebe?: boolean; sem?: boolean};
const Cx: React.FC<CxProps> = ({p, s, cor = '#888', map, r = 0.85, m = 0, em, ei = 1, rot, sombra = true, recebe = true, sem}) => (
  <mesh position={p} rotation={rot} castShadow={sombra} receiveShadow={recebe}>
    <boxGeometry args={s} />
    {sem ? <meshBasicMaterial color={cor} toneMapped={false} /> : <meshStandardMaterial color={cor} map={map} roughness={r} metalness={m} emissive={em} emissiveIntensity={em ? ei : 0} />}
  </mesh>
);
const Cil: React.FC<{p: V3; r1: number; r2?: number; h: number; cor?: string; em?: string; ei?: number; rot?: V3; aberto?: boolean; rough?: number; sombra?: boolean}> = ({p, r1, r2, h, cor = '#888', em, ei = 1, rot, aberto, rough = 0.8, sombra = true}) => (
  <mesh position={p} rotation={rot} castShadow={sombra} receiveShadow>
    <cylinderGeometry args={[r2 ?? r1, r1, h, 24, 1, !!aberto]} />
    <meshStandardMaterial color={cor} roughness={rough} emissive={em} emissiveIntensity={em ? ei : 0} side={aberto ? THREE.DoubleSide : THREE.FrontSide} />
  </mesh>
);
const Esf: React.FC<{p: V3; r: number; cor: string; s?: V3; rough?: number}> = ({p, r, cor, s, rough = 0.9}) => (
  <mesh position={p} scale={s} castShadow receiveShadow>
    <sphereGeometry args={[r, 20, 16]} />
    <meshStandardMaterial color={cor} roughness={rough} />
  </mesh>
);
const Placa: React.FC<{p: V3; s: [number, number]; map?: THREE.Texture; cor?: string; rot?: V3; recebe?: boolean; rough?: number; basic?: boolean; transp?: number; aditivo?: boolean; lado?: boolean}> = ({p, s, map, cor = '#fff', rot, recebe = true, rough = 0.9, basic, transp, aditivo, lado}) => (
  <mesh position={p} rotation={rot} receiveShadow={recebe}>
    <planeGeometry args={s} />
    {basic ? (
      <meshBasicMaterial map={map} color={cor} toneMapped={false} transparent={transp !== undefined} opacity={transp ?? 1} blending={aditivo ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={!aditivo} side={lado ? THREE.DoubleSide : THREE.FrontSide} />
    ) : (
      <meshStandardMaterial map={map} color={cor} roughness={rough} />
    )}
  </mesh>
);
// luz de ponto com brilho (sprite aditivo)
const Brilho: React.FC<{p: V3; tam: number; cor: string; op?: number}> = ({p, tam, cor, op = 0.8}) => {
  const t = brilho();
  return (
    <sprite position={p} scale={[tam, tam, 1]}>
      <spriteMaterial map={t} color={cor} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </sprite>
  );
};
// holofote que aponta para um alvo (o alvo precisa estar na cena para a matriz atualizar)
const Foco: React.FC<{p: V3; alvo: V3; cor: string; i: number; ang?: number; pen?: number; dist?: number; sombra?: boolean}> = ({p, alvo, cor, i, ang = 0.7, pen = 0.7, dist = 12, sombra = true}) => {
  const o = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <primitive object={o} position={alvo} />
      <spotLight position={p} target={o} color={cor} intensity={i} angle={ang} penumbra={pen} decay={1.4} distance={dist} castShadow={sombra} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0006} shadow-radius={6} />
    </>
  );
};
// feixe de luz volumétrico fingido: dois planos cruzados, aditivos
const Feixe: React.FC<{de: V3; para: V3; larg: number; cor: string; op: number}> = ({de, para, larg, cor, op}) => {
  const t = feixe();
  const {pos, q, comp} = useMemo(() => {
    const a = new THREE.Vector3(...de), b = new THREE.Vector3(...para);
    const d = a.clone().sub(b);
    return {pos: a.clone().add(b).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), comp: d.length()};
  }, [de, para]);
  return (
    <group position={pos} quaternion={q}>
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} rotation={[0, a, 0]}>
          <planeGeometry args={[larg, comp]} />
          <meshBasicMaterial map={t} color={cor} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// ── casca da sala ───────────────────────────────────────────────────────────────────────────────────────
const Quarto: React.FC<{piso: THREE.Texture; paredeMap: THREE.Texture; cor?: string; zFundo: number; larg?: number; alt?: number; rodape?: string; teto?: string; paredeLateral?: boolean}> = ({piso, paredeMap, cor = '#fff', zFundo, larg = 6, alt = 3, rodape = '#e9e2d3', teto = '#2b2a2f', paredeLateral = true}) => {
  const prof = 9;
  const zc = zFundo + prof / 2;
  return (
    <group>
      <Placa p={[0, 0, zc]} s={[larg, prof]} map={piso} rot={[-Math.PI / 2, 0, 0]} rough={0.55} />
      <Placa p={[0, alt / 2, zFundo]} s={[larg, alt]} map={paredeMap} cor={cor} />
      {paredeLateral && <Placa p={[-larg / 2, alt / 2, zc]} s={[prof, alt]} map={paredeMap} cor={cor} rot={[0, Math.PI / 2, 0]} />}
      {paredeLateral && <Placa p={[larg / 2, alt / 2, zc]} s={[prof, alt]} map={paredeMap} cor={cor} rot={[0, -Math.PI / 2, 0]} />}
      <Placa p={[0, alt, zc]} s={[larg, prof]} cor={teto} rot={[Math.PI / 2, 0, 0]} />
      <Cx p={[0, 0.07, zFundo + 0.03]} s={[larg, 0.14, 0.05]} cor={rodape} r={0.6} />
      {paredeLateral && <Cx p={[-larg / 2 + 0.03, 0.07, zc]} s={[0.05, 0.14, prof]} cor={rodape} r={0.6} />}
      {paredeLateral && <Cx p={[larg / 2 - 0.03, 0.07, zc]} s={[0.05, 0.14, prof]} cor={rodape} r={0.6} />}
    </group>
  );
};

const Janela: React.FC<{p: V3; s: [number, number]; cor: string; grade?: 'cruz' | 'persiana'; moldura?: string}> = ({p, s, cor, grade = 'cruz', moldura = '#2a1c14'}) => {
  const [w, h] = s;
  return (
    <group position={p}>
      <Placa p={[0, 0, 0.005]} s={[w, h]} cor={cor} basic />
      <Cx p={[0, h / 2 + 0.04, 0.04]} s={[w + 0.16, 0.08, 0.1]} cor={moldura} />
      <Cx p={[0, -h / 2 - 0.04, 0.07]} s={[w + 0.2, 0.08, 0.16]} cor={moldura} />
      <Cx p={[-w / 2 - 0.04, 0, 0.04]} s={[0.08, h + 0.16, 0.1]} cor={moldura} />
      <Cx p={[w / 2 + 0.04, 0, 0.04]} s={[0.08, h + 0.16, 0.1]} cor={moldura} />
      {grade === 'cruz' ? (
        <>
          <Cx p={[0, 0, 0.08]} s={[0.05, h, 0.06]} cor={moldura} />
          <Cx p={[0, h * 0.12, 0.08]} s={[w, 0.05, 0.06]} cor={moldura} />
        </>
      ) : (
        Array.from({length: 11}).map((_, i) => <Cx key={i} p={[0, -h / 2 + (i + 0.5) * (h / 11), 0.1]} s={[w, 0.032, 0.05]} cor="#cfc8b6" r={0.5} />)
      )}
    </group>
  );
};

// ═══ SALA ═══════════════════════════════════════════════════════════════════════════════════════════════
const Sala: React.FC<CenarioProps> = ({hora = 'noite', luz}) => {
  const noite = hora === 'noite';
  const fria = luz === 'fria';
  const piso = tabuas('#7a4f32', [6.4, 3.4]);
  const par = parede(noite ? '#a87d63' : '#cbb08c');
  const tapeteT = tapete('#7b2f2a', '#d9b27a');
  const sofa = tecido('#33466f');
  const estante = livros(['#8f3b2d', '#2f4f7a', '#d3a24a', '#4d6b4a', '#e8dcc3', '#5b3a63']);
  const corJan = noite ? '#7d9be8' : '#fff1cf';
  return (
    <group>
      <color attach="background" args={[noite ? '#0b0e1a' : '#2a2018']} />
      <fog attach="fog" args={[noite ? '#0d1226' : '#3a2a20', 6, 16]} />
      <ambientLight color="#4a5f9c" intensity={noite ? 0.55 : 0.8} />
      <hemisphereLight args={['#6f86c4', '#3a2418', noite ? 0.5 : 0.7]} />
      <Quarto piso={piso} paredeMap={par} zFundo={-2.6} />
      <Placa p={[0.1, 0.012, -1.1]} s={[2.4, 1.7]} map={tapeteT} rot={[-Math.PI / 2, 0, 0]} />
      {/* janela atrás do sofá: contraluz */}
      <Janela p={[-0.65, 1.55, -2.58]} s={[1.0, 1.3]} cor={corJan} />
      <Foco p={[-0.65, 1.6, -2.45]} alvo={[0.2, 0, -0.2]} cor={noite ? '#8aa6ff' : fria ? '#cfe3ff' : '#ffd29a'} i={noite ? 38 : 90} ang={0.62} pen={0.8} />
      <Feixe de={[-0.65, 1.6, -2.5]} para={[0.2, 0, -0.4]} larg={1.1} cor={noite ? '#6f8cff' : '#ffd9a0'} op={noite ? 0.1 : 0.22} />
      {/* sofá */}
      <group position={[-0.5, 0, -2.0]}>
        <Cx p={[0, 0.22, 0]} s={[1.75, 0.44, 0.88]} map={sofa} cor="#8aa0d8" />
        <Cx p={[0, 0.66, -0.33]} s={[1.75, 0.52, 0.22]} map={sofa} cor="#8aa0d8" />
        <Cx p={[-0.92, 0.36, 0]} s={[0.2, 0.64, 0.9]} map={sofa} cor="#8aa0d8" />
        <Cx p={[0.92, 0.36, 0]} s={[0.2, 0.64, 0.9]} map={sofa} cor="#8aa0d8" />
        <Cx p={[-0.42, 0.5, 0.06]} s={[0.8, 0.14, 0.66]} map={sofa} cor="#a7b9e8" />
        <Cx p={[0.42, 0.5, 0.06]} s={[0.8, 0.14, 0.66]} map={sofa} cor="#a7b9e8" />
        <Cx p={[0.55, 0.72, -0.05]} s={[0.32, 0.32, 0.12]} cor="#c9973b" rot={[0, 0.3, 0.2]} />
      </group>
      {/* mesa de centro */}
      <group position={[0.15, 0, -0.9]}>
        <Cx p={[0, 0.4, 0]} s={[1.0, 0.05, 0.55]} cor="#5b3a26" r={0.5} />
        {[[-0.44, -0.22], [0.44, -0.22], [-0.44, 0.22], [0.44, 0.22]].map(([x, z], i) => <Cx key={i} p={[x, 0.19, z]} s={[0.05, 0.38, 0.05]} cor="#3d281a" />)}
        <Cil p={[-0.25, 0.49, 0.05]} r1={0.05} h={0.12} cor="#e8e2d6" rough={0.4} />
        <Cx p={[0.2, 0.44, 0.0]} s={[0.34, 0.03, 0.24]} cor="#2a2d36" r={0.4} rot={[0, 0.25, 0]} />
      </group>
      {/* estante */}
      <group position={[0.85, 0, -2.45]}>
        <Cx p={[0, 1.0, 0]} s={[0.85, 2.0, 0.3]} cor="#3d281a" />
        <Placa p={[0, 1.0, 0.16]} s={[0.76, 1.9]} map={estante} rough={0.8} />
      </group>
      {/* abajur */}
      <group position={[1.38, 0, -2.0]}>
        <Cil p={[0, 0.03, 0]} r1={0.16} h={0.06} cor="#2a1c14" />
        <Cil p={[0, 0.6, 0]} r1={0.025} h={1.2} cor="#2a1c14" />
        <Cil p={[0, 1.3, 0]} r1={0.3} r2={0.2} h={0.32} cor="#ffcf8a" em="#ffae4a" ei={noite ? 2.4 : 0.8} aberto rough={1} sombra={false} />
        <pointLight position={[0, 1.3, 0.05]} color="#ffae52" intensity={noite ? 7 : 2} decay={2} distance={9} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} shadow-bias={-0.001} />
        <Brilho p={[0, 1.3, 0.1]} tam={noite ? 2.4 : 1.2} cor="#ffb45a" op={noite ? 0.55 : 0.3} />
      </group>
      {/* quadros e planta */}
      <Cx p={[1.2, 1.55, -2.57]} s={[0.4, 0.52, 0.03]} cor="#2a1c14" />
      <Cx p={[1.2, 1.55, -2.545]} s={[0.34, 0.46, 0.02]} cor="#c97a4a" sombra={false} />
      <Cil p={[-1.45, 0.2, -2.2]} r1={0.2} r2={0.16} h={0.4} cor="#7a4a35" />
      {[[0, 0.75, 0, 0.3], [-0.12, 0.95, 0.05, 0.22], [0.14, 1.0, -0.03, 0.2]].map(([x, y, z, r], i) => <Esf key={i} p={[-1.45 + x, y, -2.2 + z]} r={r} cor="#2f5a38" s={[1, 1.4, 1]} />)}
    </group>
  );
};

// ═══ ESCRITÓRIO ═════════════════════════════════════════════════════════════════════════════════════════
const Escritorio: React.FC<CenarioProps> = ({hora = 'dia', luz, quadro}) => {
  const noite = hora === 'noite';
  const piso = carpete('#4b586b');
  const par = parede(noite ? '#8b8a85' : '#d9d3c3');
  const pastas = livros(['#2f4f7a', '#8f3b2d', '#6d7b86', '#4d6b4a', '#d3b24a', '#e8e4da']);
  const tela = telaPlanilha();
  const quente = luz !== 'fria';
  return (
    <group>
      <color attach="background" args={['#14161c']} />
      <fog attach="fog" args={[noite ? '#10131c' : '#232832', 7, 18]} />
      <ambientLight color="#5d7aa8" intensity={noite ? 0.5 : 0.95} />
      <hemisphereLight args={['#8aa4d8', '#3a3228', noite ? 0.4 : 0.8]} />
      <Quarto piso={piso} paredeMap={par} zFundo={-2.6} rodape="#8d8a82" />
      {/* janela com persiana, luz em listras */}
      <Janela p={[0.75, 1.65, -2.58]} s={[1.2, 1.45]} cor={noite ? '#6f86c8' : '#fff0cd'} grade="persiana" moldura="#6a665c" />
      <Foco p={[0.75, 1.7, -2.4]} alvo={[-0.4, 0, -0.5]} cor={noite ? '#8aa6ff' : quente ? '#ffd9a8' : '#dbe9ff'} i={noite ? 30 : 60} ang={0.7} pen={0.8} />
      <Feixe de={[0.75, 1.7, -2.5]} para={[-0.3, 0, -0.5]} larg={1.4} cor={noite ? '#6f8cff' : '#ffe4b8'} op={noite ? 0.08 : 0.2} />
      {/* mesa e monitor */}
      <group position={[-0.55, 0, -1.95]}>
        <Cx p={[0, 0.74, 0]} s={[1.9, 0.05, 0.85]} cor="#a97a50" r={0.45} />
        <Cx p={[-0.88, 0.37, 0]} s={[0.05, 0.74, 0.8]} cor="#8b6240" />
        <Cx p={[0.88, 0.37, 0]} s={[0.05, 0.74, 0.8]} cor="#8b6240" />
        <Cx p={[0, 0.5, -0.38]} s={[1.8, 0.5, 0.04]} cor="#8b6240" />
        <Cx p={[0.1, 0.93, -0.18]} s={[0.78, 0.46, 0.05]} cor="#16181f" r={0.4} />
        <Placa p={[0.1, 0.93, -0.152]} s={[0.72, 0.4]} map={tela} basic />
        <Cx p={[0.1, 0.8, -0.2]} s={[0.1, 0.12, 0.08]} cor="#16181f" />
        <Cx p={[0.1, 0.77, -0.05]} s={[0.4, 0.015, 0.14]} cor="#222630" r={0.5} />
        <Cil p={[-0.6, 0.82, 0.05]} r1={0.05} h={0.12} cor="#e8e2d6" rough={0.4} />
        {/* luminária */}
        <Cil p={[-0.7, 0.8, -0.2]} r1={0.07} h={0.06} cor="#1d1f26" />
        <Cx p={[-0.7, 1.0, -0.2]} s={[0.025, 0.4, 0.025]} cor="#1d1f26" rot={[0, 0, 0.25]} />
        <Cil p={[-0.6, 1.2, -0.12]} r1={0.12} r2={0.04} h={0.12} cor="#26303f" em="#ffc46a" ei={1.6} rot={[0.5, 0, 0]} aberto sombra={false} />
        <pointLight position={[-0.6, 1.12, -0.05]} color="#ffb257" intensity={2.4} decay={2} distance={5} />
      </group>
      {/* cadeira */}
      <group position={[-0.5, 0, -1.15]} rotation={[0, 0.25, 0]}>
        <Cil p={[0, 0.3, 0]} r1={0.03} h={0.5} cor="#1d1f26" />
        <Cil p={[0, 0.04, 0]} r1={0.27} r2={0.05} h={0.06} cor="#1d1f26" />
        <Cx p={[0, 0.54, 0]} s={[0.5, 0.09, 0.5]} cor="#5b3a2a" />
        <Cx p={[0, 0.9, 0.24]} s={[0.48, 0.62, 0.08]} cor="#5b3a2a" rot={[-0.12, 0, 0]} />
      </group>
      {/* prateleira com pastas */}
      <group position={[-1.45, 0, -2.4]}>
        <Cx p={[0, 1.05, 0]} s={[0.95, 2.1, 0.4]} cor="#60564a" />
        <Placa p={[0, 1.05, 0.21]} s={[0.86, 2.0]} map={pastas} rough={0.8} />
      </group>
      {quadro && <group position={[1.15, 1.45, -2.57]}><Cx p={[0, 0, 0]} s={[1.3, 0.98, 0.03]} cor="#9aa0a6" m={0.6} /><Placa p={[0, 0, 0.02]} s={[1.24, 0.92]} map={quadroRegras()} rough={0.5} /></group>}
      {/* planta */}
      <Cil p={[1.35, 0.22, -1.7]} r1={0.22} r2={0.17} h={0.44} cor="#5a4034" />
      {[[0, 0.75, 0, 0.32], [-0.15, 1.0, 0.04, 0.24], [0.15, 1.05, -0.03, 0.22]].map(([x, y, z, r], i) => <Esf key={i} p={[1.35 + x, y, -1.7 + z]} r={r} cor="#2f6a3e" s={[1, 1.35, 1]} />)}
      {/* painéis de teto */}
      <Placa p={[0, 2.97, -1.2]} s={[1.6, 0.5]} cor="#fff4dc" basic rot={[Math.PI / 2, 0, 0]} />
      <pointLight position={[0, 2.8, -1.0]} color={noite ? '#c9b48a' : '#fff1d6'} intensity={noite ? 3 : 9} decay={2} distance={8} />
    </group>
  );
};

// ═══ VARANDA ════════════════════════════════════════════════════════════════════════════════════════════
const Varanda: React.FC<CenarioProps> = ({hora = 'tarde', luz}) => {
  const noite = hora === 'noite';
  const tarde = hora === 'tarde';
  const piso = tabuas('#9a7450', [5.4, 2.6], 'deck');
  const par = parede('#e5dcc8');
  const sk = ceu(hora);
  const r = rng(5);
  const luzes = Array.from({length: 13}).map((_, i) => {
    const t = i / 12;
    return [-2.4 + t * 4.8, 2.35 - Math.sin(t * Math.PI) * -0.0 - 0.28 * Math.sin(t * Math.PI), -0.9] as V3;
  });
  const sol: V3 = tarde ? [2.2, 2.0, -22] : [-3, 6, -22];
  return (
    <group>
      <color attach="background" args={[noite ? '#080b1c' : '#f0b878']} />
      <fog attach="fog" args={[noite ? '#101a36' : tarde ? '#e8a56a' : '#bcd6e6', 9, 30]} />
      <ambientLight color={noite ? '#3a4f94' : '#8aa0d0'} intensity={noite ? 0.6 : 0.85} />
      <hemisphereLight args={[noite ? '#506cc0' : '#9ab8e8', '#4a3524', 0.6]} />
      {/* céu e colinas */}
      <Placa p={[0, 8, -26]} s={[90, 34]} map={sk} basic />
      {!noite && <Brilho p={sol} tam={tarde ? 12 : 8} cor={tarde ? '#ffc874' : '#fff0c0'} op={0.95} />}
      {noite && <Brilho p={[-3, 7, -24]} tam={3} cor="#d8e4ff" op={0.9} />}
      {[[-9, -17, 6, '#35574a'], [4, -19, 8, '#2a4a52'], [-3, -22, 9, '#3a5a68'], [12, -16, 5, '#2e5040']].map(([x, z, s, c], i) => (
        <mesh key={i} position={[x as number, -1.0, z as number]} scale={[(s as number) * 1.6, (s as number) * 0.55, 3]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={noite ? '#0c1426' : (c as string)} roughness={1} />
        </mesh>
      ))}
      {/* deck e guarda-corpo */}
      <Placa p={[0, 0, 0.4]} s={[7, 6]} map={piso} rot={[-Math.PI / 2, 0, 0]} rough={0.55} />
      <Cx p={[0, 1.02, -2.35]} s={[7, 0.07, 0.09]} cor="#4a3020" />
      <Cx p={[0, 0.5, -2.35]} s={[7, 0.05, 0.05]} cor="#4a3020" />
      {Array.from({length: 15}).map((_, i) => <Cx key={i} p={[-3.3 + i * 0.47, 0.5, -2.35]} s={[0.07, 1.0, 0.07]} cor="#4a3020" />)}
      {/* casa à esquerda */}
      <Placa p={[-2.4, 1.5, -0.2]} s={[6, 3]} map={par} rot={[0, Math.PI / 2, 0]} cor={noite ? '#9a8e84' : '#fff'} />
      <Placa p={[-2.38, 1.4, -1.2]} s={[1.1, 1.7]} cor={noite ? '#ffc169' : '#ffe8bd'} basic rot={[0, Math.PI / 2, 0]} />
      <Cx p={[-2.36, 1.4, -1.2]} s={[0.05, 1.8, 0.07]} cor="#33261c" />
      <Cx p={[-2.36, 1.4, -1.2]} s={[0.05, 0.07, 1.2]} cor="#33261c" />
      {/* pergolado: sombras em listras */}
      {Array.from({length: 9}).map((_, i) => <Cx key={i} p={[-2.0 + i * 0.5, 2.75, -0.2]} s={[0.12, 0.1, 5]} cor="#3d2a1b" />)}
      {Array.from({length: 4}).map((_, i) => <Cx key={i} p={[0, 2.68, -2.2 + i * 1.6]} s={[5, 0.1, 0.14]} cor="#3d2a1b" />)}
      <directionalLight position={noite ? [-3, 6, -6] : [2.5, 4.2, -9]} color={noite ? '#7f9cff' : tarde ? '#ffb164' : '#fff0d0'} intensity={noite ? 1.2 : tarde ? 5 : 4.5} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={0.5} shadow-camera-far={20} shadow-bias={-0.0004} shadow-radius={5} />
      {/* espreguiçadeira e mesinha */}
      <group position={[0.35, 0, -0.9]} rotation={[0, -0.18, 0]}>
        <Cx p={[0, 0.3, 0.1]} s={[0.72, 0.1, 1.1]} cor="#c0693f" r={0.7} />
        <Cx p={[0, 0.55, -0.62]} s={[0.72, 0.1, 0.8]} cor="#c0693f" r={0.7} rot={[0.9, 0, 0]} />
        <Cx p={[0, 0.355, 0.1]} s={[0.5, 0.02, 1.1]} cor="#f1e3c4" r={0.7} />
        {[[-0.32, 0.62], [0.32, 0.62], [-0.32, -0.45], [0.32, -0.45]].map(([x, z], i) => <Cx key={i} p={[x, 0.14, z]} s={[0.05, 0.28, 0.05]} cor="#4a3020" />)}
      </group>
      <group position={[1.35, 0, -0.5]}>
        <Cil p={[0, 0.3, 0]} r1={0.28} h={0.04} cor="#3a2a1d" rough={0.4} />
        <Cil p={[0, 0.15, 0]} r1={0.04} h={0.3} cor="#2a1d14" />
        <Cil p={[-0.06, 0.4, 0.04]} r1={0.04} h={0.14} cor="#e9ecf0" rough={0.1} />
        <Cx p={[0.1, 0.33, 0.0]} s={[0.07, 0.012, 0.14]} cor="#12141a" r={0.3} rot={[0, 0.5, 0]} />
        <Cx p={[0.1, 0.34, 0.0]} s={[0.058, 0.004, 0.12]} cor="#cfe6ff" sem rot={[0, 0.5, 0]} sombra={false} />
      </group>
      {/* plantas e luzinhas */}
      {[[-1.9, 0.0, -1.9, 0.3], [2.0, 0, -1.9, 0.36]].map(([x, , z, s], i) => (
        <group key={i}>
          <Cil p={[x as number, 0.25, z as number]} r1={0.24} r2={0.2} h={0.5} cor="#8a5a3c" />
          {[0, 1, 2, 3].map((k) => <Esf key={k} p={[(x as number) + (k - 1.5) * 0.14, 0.75 + (k % 2) * 0.25, (z as number) + (k % 3) * 0.05]} r={s as number} cor="#2f6f45" s={[1, 1.3, 1]} />)}
        </group>
      ))}
      {luzes.map((p, i) => (
        <group key={i}>
          <Esf p={p} r={0.04} cor="#fff2c8" />
          <Brilho p={p} tam={noite ? 0.8 : 0.4} cor="#ffcb7a" op={noite ? 0.9 : 0.45} />
        </group>
      ))}
      {noite && <pointLight position={[0.6, 2.3, -0.9]} color="#ffbe6a" intensity={6} decay={2} distance={7} />}
    </group>
  );
};

// ═══ CORREDOR COM PORTA (contraluz) ═════════════════════════════════════════════════════════════════════
const Porta: React.FC<CenarioProps> = ({hora = 'dia', luz, placa = 'DIRETORIA'}) => {
  const piso = carpete('#3f4a5c');
  const par = parede('#cfc6b2');
  const pl = placaPorta(placa);
  return (
    <group>
      <color attach="background" args={['#05060a']} />
      <fog attach="fog" args={['#12151f', 5, 15]} />
      <ambientLight color="#5b70a8" intensity={0.95} />
      <hemisphereLight args={['#7f96d4', '#3a2a20', 0.7]} />
      {/* corredor */}
      <Placa p={[0, 0, -2]} s={[2.6, 10]} map={piso} rot={[-Math.PI / 2, 0, 0]} rough={0.7} />
      <Placa p={[-1.3, 1.5, -2]} s={[10, 3]} map={par} rot={[0, Math.PI / 2, 0]} cor="#a89d88" />
      <Placa p={[1.3, 1.5, -2]} s={[10, 3]} map={par} rot={[0, -Math.PI / 2, 0]} cor="#a89d88" />
      <Placa p={[0, 3, -2]} s={[2.6, 10]} cor="#22232a" rot={[Math.PI / 2, 0, 0]} />
      <Cx p={[-1.26, 0.07, -2]} s={[0.05, 0.14, 10]} cor="#8d8576" />
      <Cx p={[1.26, 0.07, -2]} s={[0.05, 0.14, 10]} cor="#8d8576" />
      {/* portas laterais */}
      {[-1.4, -3.2].map((z) => (
        <group key={z}>
          <Cx p={[-1.24, 1.05, z]} s={[0.05, 2.1, 0.9]} cor="#4a3322" r={0.5} />
          <Cx p={[1.24, 1.05, z - 0.7]} s={[0.05, 2.1, 0.9]} cor="#4a3322" r={0.5} />
        </group>
      ))}
      {/* porta do fundo entreaberta com luz forte atrás */}
      <group position={[0, 0, -5.4]}>
        <Placa p={[0, 1.05, -0.12]} s={[1.3, 2.1]} cor="#fff3d6" basic />
        <Brilho p={[0, 1.1, -0.05]} tam={6} cor="#ffd9a0" op={0.75} />
        <Cx p={[-0.7, 1.1, 0]} s={[0.1, 2.3, 0.2]} cor="#2a1d14" />
        <Cx p={[0.7, 1.1, 0]} s={[0.1, 2.3, 0.2]} cor="#2a1d14" />
        <Cx p={[0, 2.22, 0]} s={[1.5, 0.1, 0.2]} cor="#2a1d14" />
        <group position={[0.62, 0, 0.05]} rotation={[0, -1.15, 0]}>
          <Cx p={[-0.62, 1.05, 0]} s={[1.24, 2.1, 0.05]} cor="#5a3e2a" r={0.5} />
          <Placa p={[-0.62, 1.55, 0.03]} s={[0.5, 0.15]} map={pl} rough={0.5} />
        </group>
      </group>
      <pointLight position={[0, 1.4, -4.9]} color="#ffd9a0" intensity={16} decay={1.6} distance={12} />
      <pointLight position={[0, 1.3, -1.2]} color="#ffb870" intensity={3} decay={2} distance={5} />
      <Feixe de={[0, 1.2, -5.3]} para={[0, 0, 0.4]} larg={1.8} cor="#ffdca8" op={0.28} />
      {/* luminárias de teto */}
      {[-1.0, -3.2].map((z) => <Placa key={z} p={[0, 2.97, z]} s={[0.8, 0.3]} cor="#d8e4ff" basic rot={[Math.PI / 2, 0, 0]} />)}
      <pointLight position={[0, 2.7, -1.0]} color="#9db8ff" intensity={4} decay={2} distance={6} />
    </group>
  );
};

// ── câmera ──────────────────────────────────────────────────────────────────────────────────────────────
export type Cam = {pos: V3; alvo: V3; roll: number; fov: number};
const Camara: React.FC<{cam: Cam}> = ({cam}) => {
  const {camera} = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos);
  c.up.set(0, 1, 0);
  c.lookAt(...cam.alvo);
  c.rotateZ(cam.roll);
  c.fov = cam.fov;
  c.near = 0.1; c.far = 80;
  c.updateProjectionMatrix();
  return null;
};

export const Cenario3D: React.FC<{cenario: CenarioProps; cam: Cam; largura: number; altura: number}> = ({cenario, cam, largura, altura}) => {
  const C = {sala: Sala, escritorio: Escritorio, varanda: Varanda, porta: Porta}[cenario.tipo] ?? Sala;
  return (
    <ThreeCanvas width={largura} height={altura} camera={{fov: cam.fov, position: cam.pos, near: 0.1, far: 80}} shadows gl={{antialias: true}}>
      <Camara cam={cam} />
      <C {...cenario} />
    </ThreeCanvas>
  );
};

// pose-base da câmera de cada cenário (posição e alvo), a partir da qual push, dolly, plongée e pan andam
export const BASES: Record<CenarioTipo, {pos: V3; alvo: V3}> = {
  sala: {pos: [0.1, 1.25, 1.7], alvo: [0, 0.4, -2.6]},
  escritorio: {pos: [0.2, 1.3, 1.6], alvo: [-0.1, 0.55, -2.5]},
  varanda: {pos: [0.1, 1.2, 1.7], alvo: [0, 0.7, -3.0]},
  porta: {pos: [0, 1.25, 1.8], alvo: [0, 0.9, -5.5]},
};
