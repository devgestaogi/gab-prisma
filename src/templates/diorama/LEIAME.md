# Template diorama-3d-hud (motor)

Maquete 3D de brinquedo (estações em reta, peões, câmera contínua) com HUD, pílulas, cartão de vidro e carimbo.
Receita e campos do roteiro: `DESIGN VIDEOS IA/templates/diorama-3d-hud/TEMPLATE.md` (seção 7).
Demo: `roteiros/demo-diorama.json`.

| arquivo | papel |
|---|---|
| `Diorama.tsx` | composição: um ThreeCanvas, camadas 2D, legenda, sons, logo |
| `mundo.tsx` | chão com grade, estações, peões (InstancedMesh), câmera |
| `simulacao.ts` | fluxo e fila dos peões, simulado uma vez por roteiro (semente fixa, determinístico) |
| `camera.ts` | pose por cena e voo entre cenas |
| `hud.tsx` | HUD, capítulo, pílulas, cartão de vidro, carimbo |
| `tipos.ts` | tipos do roteiro, medidas do mundo, instantes de nascimento das estações |

Regras: render no Mac (`remotion.config.ts` põe o GL em `angle`); nada de `Math.random` sem semente; faixa útil
do 9:16 respeitada (HUD em 330 px, cartões entre 650 e 1000, legenda em 1110). Cores: laranja destaque,
vermelho só perda, verde só correção. Não edita `comum.tsx`.
