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
| `tipos.ts` | tipos do roteiro, medidas do mundo, instantes de nascimento das estações, `layoutDasCenas` (legenda e cartão) e o cache `planejamentoDe` |
| `ajuste.ts` | medida de texto com a fonte real: quebra em até 2 linhas, corpo até 18 px, reticências (pílulas, capítulo, HUD) |

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
- Tudo isso vem do mecanismo comum (`segmentosDePlanos`, `comum.tsx`): só entram cenas com tempo (cena ainda sem
  alinhamento não conta, nem para decidir o modo) e só imagem que existe no manifesto `planos` do projeto. O diorama
  só acrescenta que o primeiro segmento começa no quadro 0.
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
- **O cartão nunca invade a pilha nem a legenda.** Se nenhuma faixa couber entre as duas, o cartão encolhe (95% até 70%) e, se
  ainda não couber, perde as últimas linhas (só as primeiras ficam visíveis); cada tentativa revalida todas as restrições.
  Caso extremo (HUD + capítulo com progresso + 3 pílulas + cartão de 6 linhas + legenda embaixo): cartão a 70% com 2 linhas.
  Se nem uma linha couber, o cartão não aparece.
- A conta mora em `layoutDasCenas` (`tipos.ts`), que estima a altura de cada caixa; confira no quadro real.

**Pilha do topo** (`PilhaTopo` em `hud.tsx`): HUD (centro em 330), capítulo e pílulas de alerta, correção e CTA numa
coluna só, no mesmo eixo central, 18 px entre caixas, cada uma com a altura que tem. Nada de `y` fixo por elemento.
Largura máxima 950 px (65 a 1015). Texto longo em pílula, capítulo e rótulo do HUD é **medido** com a fonte real (`ajuste.ts`):
uma linha até o corpo preferido, senão duas linhas, reduzindo o corpo até 18 px; passando disso, reticências. Nada transborda
a caixa, e a altura da pílula e do capítulo (1 ou 2 linhas) entra na conta do layout.

## Ícones do HUD (`hud.icone`)

`pessoas`, `pedido`, `dinheiro`, `relogio`, `estrela`, `carro`, `lista`, `alvo`, `alerta`, `camera`.
Sem `icone`, o motor escolhe pelas palavras do rótulo (e do prefixo e sufixo): estrela/procurado, carro/veículo/viatura,
novidade/item/lista, dinheiro/US$/R$/dólar/bilhão/milhão, alvo/mira, câmera, alerta/perigo/risco; senão `pedido`.

## Som

Toda a agenda do vídeo é montada de uma vez (`planejar`, `Diorama.tsx`) e passa por `agendaDeSons` (`comum.tsx`), em quadros
absolutos: pop no capítulo, no cartão e no CTA; apito no alerta; ding na correção; toque a cada troca do contador; whoosh
no voo (ou na troca de plano); boom no carimbo. Volumes de 0,35 a 0,5. Dois efeitos a menos de 3 quadros um do outro nunca
soam juntos: o de menor prioridade (boom > apito e ding > pops > toque e whoosh > pop de estação) vai para frente.

## Planejamento e fontes

- Segmentos, layout, agenda de sons e estações nascem numa conta só, memorizada por `[dados, fps]` (e pelas fontes prontas,
  porque a medida de texto depende delas); nada é replanejado por quadro. Normalização por quadro (câmera, estação em foco)
  usa `planejamentoDe(dados)`, cache por objeto de dados.
- As fontes (Sora e Oswald, base64) carregam antes de qualquer coisa ser desenhada. Se não ficarem prontas em 8 s, o render
  **falha** com `cancelRender` (nunca segue com fonte substituta, que daria placas diferentes entre os workers).
