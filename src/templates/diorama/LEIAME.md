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
do 9:16 respeitada (HUD em 330 px, cartões e legenda pelas faixas de `layout`, nada abaixo de 1230 px). Cores:
laranja destaque, vermelho só perda, verde só correção. A legenda é a `LegendaKaraoke` do `comum.tsx` (blocos sem
palavra solta e sem terminar em artigo, preposição curta ou conjunção).

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

## Posição por cena (campo `layout`) e pilha do topo

```json
"layout": {"legenda": "alto", "cartao": "baixo"}
```

Tira legenda e cartão de cima do assunto da imagem. Valores `alto`, `meio`, `baixo` (inválido ou ausente = padrão).
Em 1080x1920:

| faixa | legenda (centro) | cartão de vidro (topo) |
|---|---|---|
| `alto` | 600 | 420 |
| `meio` | 900 | **640 (padrão)** |
| `baixo` | **1130 (padrão)** | 860 |

- O cartão sempre termina acima de 1230 (o topo sobe se a faixa não couber). O véu escuro atrás da legenda segue a
  posição dela (troca suave de 8 quadros entre cenas).
- Legenda e cartão nunca se sobrepõem: se a combinação colidir, o cartão cede para a faixa livre mais próxima. Com
  a legenda no padrão (`baixo`), o cartão em `baixo` colide e vai para cima; para usar `cartao: "baixo"` suba a legenda.
- O cartão e a legenda também nunca entram na pilha do topo: `alto` começa 18 px abaixo da pilha quando ela é mais longa.
  Se a pilha chegar na legenda, a legenda desce até folgar.
- A conta mora em `layoutDasCenas` (`tipos.ts`), que estima a altura de cada caixa; confira no quadro real.

**Pilha do topo** (`PilhaTopo` em `hud.tsx`): HUD (centro em 330), capítulo e pílulas de alerta, correção e CTA numa
coluna só, no mesmo eixo central, 18 px entre caixas, cada uma com a altura que tem. Nada de `y` fixo por elemento.
Largura máxima 950 px (65 a 1015): HUD, capítulo e pílula encolhem o corpo da fonte medindo o texto real.

## Ícones do HUD (`hud.icone`)

`pessoas`, `pedido`, `dinheiro`, `relogio`, `estrela`, `carro`, `lista`, `alvo`, `alerta`, `camera`.
Sem `icone`, o motor escolhe pelas palavras do rótulo (e do prefixo e sufixo): estrela/procurado, carro/veículo/viatura,
novidade/item/lista, dinheiro/US$/R$/dólar/bilhão/milhão, alvo/mira, câmera, alerta/perigo/risco; senão `pedido`.

## Som

Todo efeito é planejado num lugar só (`planejarSons`, `Diorama.tsx`): pop no capítulo, no cartão e no CTA; apito no
alerta; ding na correção; toque a cada troca do contador; whoosh no voo; boom no carimbo. Volumes de 0,35 a 0,5.
Dois efeitos a menos de 2 quadros um do outro nunca soam juntos: o seguinte é deslocado 3 quadros.
