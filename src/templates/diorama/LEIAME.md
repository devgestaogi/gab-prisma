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
| `planos.tsx` | modo imagem: planos gerados por cena, câmera contínua e voo através |
| `tipos.ts` | tipos do roteiro, medidas do mundo, instantes de nascimento das estações |

Regras: render no Mac (`remotion.config.ts` põe o GL em `angle`); nada de `Math.random` sem semente; faixa útil
do 9:16 respeitada (HUD em 330 px, cartões entre 650 e 1000, legenda em 1110). Cores: laranja destaque,
vermelho só perda, verde só correção. Não edita `comum.tsx`.

## Modo imagem (campo `plano`)

O template é só a essência de imagem e motion; o conteúdo vem do assunto. Cada cena pode trazer um plano:

```json
"plano": {"imagem": "01-cidade.png", "movimento": "avanco", "foco": [0.5, 0.4]}
```

- A imagem fica em `public/<projeto>/planos/<imagem>` (png, jpg ou webp). Arquivo inexistente ou nome inválido = sem plano.
- `movimento`: `avanco` (padrão, escala 1,06 a 1,20 indo ao `foco`), `lateral`, `sobe` ou `orbita` (gira até 2°).
- `foco`: `[x, y]` em 0..1 (padrão `[0.5, 0.5]`), ponto para onde o avanço caminha. Campo malformado vira o padrão.
- **Modo imagem** = pelo menos uma cena com plano válido. Então não há ThreeCanvas nem mundo 3D; `foco` de estação,
  `visao`, `fluxo` e `estacoes` são ignorados. Sem nenhum plano, o mundo procedural segue como sempre.
- Cena sem plano repete o anterior (ou o próximo, se for a primeira). Cenas seguidas com a mesma imagem são um
  segmento só: o movimento (o da primeira cena do segmento) continua sem emenda.
- Troca de segmento = voo através (~10 quadros): o que sai acelera a escala (x1,25), desfoca até 8 px e some; o que
  entra começa em 0,92 desfocado e assenta; som `whoosh` a 0,35. Câmera calculada pelo quadro absoluto.
- Por cima: vinheta de 25% e véu escuro atrás da legenda; HUD, cartão, pílulas, capítulo, carimbo e legenda iguais.
