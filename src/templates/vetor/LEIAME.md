# Template vetor-chapado-contador (motor gab-prisma)

Ilustração vetorial chapada, tudo desenhado por código (SVG em React), sem imagem gerada por IA.
Roteiro com `"template": "vetor-chapado-contador"` é despachado pelo `src/Filme.tsx` para `Vetor.tsx`.

| arquivo | o que faz |
|---|---|
| `Vetor.tsx` | monta cada cena (palco com deriva de câmera, elementos, legenda, sons, logo) e o título fixo |
| `Cenarios.tsx` | `rua`, `escritorio` (`noite: true` opcional), `loja` (`placa` opcional), `cidade-noite`, `casa-noite`, `estrada`, `liso`; ou `imagem` |
| `Personagem.tsx` | dono, funcionaria, funcionario, cliente; expressões e animações; estilo `contorno` ou `liso` |
| `Objetos.tsx` | celular, agenda, relogio, relogio-duplo, cofre, tomada, porta, moedas, caixa, grafico |
| `Elementos.tsx` | título fixo, selo, contador, balão, impacto, flash, HUD (mira, visor, radar), CTA |
| `Planos.tsx` | modo planos de imagem: `PlanoImagem` (camada do segmento, câmera que nunca descobre borda) e `VeuLegenda` (degradê escuro atrás da legenda) |
| `posicao.ts` | conta de posição: centro da legenda e pilha de cartões no mesmo eixo (a agenda de sons é a `agendaDeSons` da `comum`) |
| `normaliza.ts` | normaliza roteiro e cena na entrada (tipo errado vira ausência, enum inválido vira padrão, texto com teto); roteiro sem cenas ou com cena incompleta renderiza palco liso |
| `util.ts` | tipos do roteiro, cores, gerador com semente, constantes da faixa útil |

Campos do roteiro: seção 7 de `DESIGN VIDEOS IA/templates/vetor-chapado-contador/TEMPLATE.md`.
Exemplo completo: `roteiros/demo-vetor.json`.

Regras de código: tudo determinístico por quadro (sem `Math.random`); texto só em Oswald embutida
(`<Fontes/>` de `comum.tsx`); nada importante fora da faixa útil (topo 270, base 1248, laterais 65).
Cenário de imagem: `cenario: {"imagem": "arquivo.png"}` lê `public/<projeto>/cenarios/arquivo.png`.

## Modo planos de imagem (`plano` e `layout`)

O conteúdo de cada cena pode ser uma **ilustração vetorial chapada gerada do assunto**; o template anima por cima com a
linguagem do vetor (palco quase parado, corte seco, gráficos com pop de mola).

```json
"plano": {"imagem": "02-viatura.png", "movimento": "deriva", "foco": [0.5, 0.4]},
"layout": {"legenda": "baixo", "cartao": "meio"}
```

- `plano.imagem`: arquivo em `public/<projeto>/planos/` (só `.png`, `.jpg`, `.webp`, sem `..`). Inválido ou ausente = cena sem plano,
  que usa o cenário SVG de sempre. Com plano, ele cobre a tela (object-fit cover) e é o cenário; `personagens` e `objeto` só
  aparecem se a cena os listar.
- `plano.movimento`: `deriva` (padrão: zoom de 3 a 4,5% e pan curto), `zoom` (1% a 5%, na direção do `foco`) ou `pan` (escala fixa 1,05 e
  deslocamento de 52 px). `foco` `[x, y]` de 0 a 1 (padrão `[0.5, 0.5]`) é a origem do zoom e a parte da imagem mantida ao cortar.
  O campo `deriva` da cena não vale com plano. **Cenas seguidas com a mesma imagem formam um segmento**: a deriva corre pelo quadro absoluto ao longo do segmento inteiro, com `movimento` e `foco` da primeira cena dele, sem reiniciar; o corte seco só acontece quando a imagem muda. Os segmentos vêm de `segmentosDePlanos` (`comum.tsx`: cena sem `plano` herda o anterior, só imagem que existe no manifesto entra) e cada um é uma camada montada numa `Sequence` do segmento, fora das Sequences de cena: o `Img` não remonta na troca de cena dentro do segmento. **A câmera nunca descobre borda:** a escala mínima sai da amplitude do movimento (`1 + amp/lado`) e o trajeto é empurrado para o lado que tem sobra, então foco em 0 ou 1 com `pan` recua o deslocamento em vez de expor fundo (`camera` em `Planos.tsx`).
- Corte seco entre cenas. Com `flash`, a tela tinge na cor por ~3 quadros na entrada (ou na `palavra`).
- `layout.legenda` (`alto` 600, `meio` 900, `baixo` 1130, padrão `baixo`): centro da legenda. Nunca sobe para dentro do título fixo ou do selo.
- `layout.cartao` (`alto` 420 a 700, `meio` 640 a 960, padrão `meio`, `baixo` 860 a 1200): faixa do contador, balão, impacto e CTA. Eles formam uma
  pilha na ordem contador, balão, impacto, CTA, centrada em x 540 (o selo também fica centrado), com 28 px entre um e outro. A pilha nunca sobrepõe:
  as vagas livres são acima da legenda (a partir do cabeçalho, título e selo, + 28 px) e abaixo dela (legenda ± 100, até y 1248). Se a pilha não cabe
  inteira em uma vaga, a pilha toda reduz a escala até 70% (passos de 5%, em torno de x 540 e do topo de cada item). Se ainda não cabe, o item de menor
  prioridade (CTA, depois impacto) vai para a outra vaga, com a própria escala. Só se nada disso resolver ela fica a 70% no centro da faixa (pode encostar). `x`/`y` de balão, contador e impacto são ignorados
  nesse modo (o balão aponta para o personagem só em x, então com personagem ele sai do eixo central); o impacto tem teto de 130 px de fonte.
- Cenas com `plano` ou `layout` usam essa conta; as demais mantêm as posições antigas (a demo sem plano não muda).
- Sons: toda entrada (título, selo, personagem, balão, objeto, contador, flash, mira, impacto, CTA, troca de cena) tem o seu, volumes de 0,3 a 0,5,
  e a agenda do vídeo inteiro passa por `agendaDeSons` (`comum`, quadros absolutos, folga de 3): dois sons nunca ficam a menos de 3 quadros, mesmo na fronteira entre cenas; cada evento leva `ate` (fim da cena) e é descartado se o deslocamento o levar para além dele. O planejamento (posição dos cartões, quadros das palavras, sons) é memorizado por `[dados, fps]` em `Vetor.tsx`.
- O balão, no modo de posição calculada, usa `fixo`: `y` é a base do corpo e ele não aplica limite vertical próprio, para não se reposicionar depois de o planejador reservar o espaço (a escala da pilha vem de fora).
